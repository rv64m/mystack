---
title: "Anthropic 三个近期问题的事后复盘"
date: 2026-05-16T08:00:00+08:00
slug: "anthropic-three-recent-issues-postmortem"
tags: ["ai", "infrastructure", "postmortem", "claude"]
series: "Agent Notes"
source_url: "https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues"
translationKey: "anthropic-three-recent-issues-postmortem"
---

8 月到 9 月初期间，三个 infrastructure bugs 间歇性降低了 Claude 的 response quality。我们现在已经解决了这些问题，并希望解释发生了什么。

8 月初，一些用户开始报告 Claude responses 出现 degraded。这些初始报告很难与用户反馈中的正常波动区分开。到 8 月下旬，这些报告的频率和持续性不断增加，促使我们开启 investigation，并由此发现了三个独立的 infrastructure bugs。

直说就是：我们从不会因为 demand、time of day 或 server load 而降低 model quality。用户报告的问题完全由 infrastructure bugs 导致。

我们认识到，用户期望 Claude 保持一致的质量，而我们也为确保 infrastructure changes 不影响 model outputs 维持极高标准。在这些近期 incidents 中，我们没有达到这个标准。下面的 postmortem 会解释哪里出了问题，为什么 detection 和 resolution 花了比我们希望更久的时间，以及我们正在做哪些改变来防止未来出现类似 incidents。

我们通常不会分享这种技术细节层级的 infrastructure 信息，但这些问题的 scope 和 complexity 值得更全面地解释。

我们通过 first-party API、Amazon Bedrock 和 Google Cloud 的 Vertex AI 向数百万用户提供 Claude。我们在多个 hardware platforms 上部署 Claude，也就是 AWS Trainium、NVIDIA GPUs 和 Google TPUs。这种方法提供了服务全球用户所需的 capacity 和 geographic distribution。

每种 hardware platform 都有不同特性，并需要特定 optimizations。尽管存在这些差异，我们对 model implementations 有严格的 equivalence standards。我们的目标是，无论哪个 platform 服务用户请求，用户都应该获得相同质量的 responses。这种 complexity 意味着，任何 infrastructure change 都需要在所有 platforms 和 configurations 上进行仔细 validation。

## 事件时间线

![Illustrative timeline of events on the Claude API.](/images/blog/anthropic-three-recent-issues-postmortem/timeline.png)

Claude API 上事件的 illustrative timeline。黄色：issue detected，红色：degradation worsened，绿色：fix deployed。

这些 bugs 相互重叠的性质让 diagnosis 尤其具有挑战性。第一个 bug 在 8 月 5 日引入，影响了约 0.8% 发往 Sonnet 4 的 requests。另外两个 bugs 来自 8 月 25 日和 26 日的 deployments。

虽然初始影响有限，但 8 月 29 日的一次 load balancing change 开始增加受影响 traffic。这导致更多用户遇到问题，而其他用户仍然看到正常 performance，产生了令人困惑且相互矛盾的 reports。

下面我们描述造成 degradation 的三个 bugs、它们发生的时间，以及我们如何解决它们：

### 1. Context window routing bug

8 月 5 日，一些 Sonnet 4 requests 被错误路由到为即将推出的 [1M token](https://docs.claude.com/en/docs/build-with-claude/context-windows#1m-token-context-window) [context window](https://docs.claude.com/en/docs/build-with-claude/context-windows) 配置的 servers。这个 bug 最初影响了 0.8% 的 requests。8 月 29 日，一次 routine load balancing change 无意中增加了被路由到 1M context servers 的 short-context requests 数量。在 8 月 31 日受影响最严重的一个小时中，16% 的 Sonnet 4 requests 受到影响。

在此期间发起 requests 的 Claude Code users 中，约 30% 至少有一条 message 被路由到错误的 server type，导致 responses degraded。在 Amazon Bedrock 上，从 8 月 12 日开始，misrouted traffic 峰值达到所有 Sonnet 4 requests 的 0.18%。8 月 27 日至 9 月 16 日期间，错误 routing 影响了 Google Cloud 的 Vertex AI 上少于 0.0004% 的 requests。

不过，一些用户受到的影响更严重，因为我们的 routing 是 “sticky” 的。这意味着一旦某个 request 由错误 server 服务，后续 follow-ups 很可能也由同一个错误 server 服务。

**Resolution:** 我们修复了 routing logic，确保 short- 和 long-context requests 被导向正确的 server pools。我们在 9 月 4 日部署了 fix。到 9 月 16 日，我们在 first-party platform 和 Google Cloud 的 Vertex AI 上完成 rollout；到 9 月 18 日，在 AWS Bedrock 上完成 rollout。

### 2. TPU random corruption

8 月 25 日，我们向 Claude API TPU servers 部署了一个 misconfiguration，导致 token generation 期间出现 error。由 runtime performance optimization 引发的 issue，偶尔会给在给定 context 下本应很少产生的 tokens 分配高 probability，例如在回应 English prompts 时产生 Thai 或 Chinese characters，或在 code 中产生明显 syntax errors。例如，一小部分用 English 提问的用户可能会在 response 中间看到 “สวัสดี”。

这种 corruption 影响了 8 月 25 日至 28 日发往 Opus 4.1 和 Opus 4 的 requests，以及 8 月 25 日至 9 月 2 日发往 Sonnet 4 的 requests。Third-party platforms 没有受到这个 issue 影响。

**Resolution:** 我们识别了这个 issue，并在 9 月 2 日 rollback 了 change。我们已经把 unexpected character outputs 的 detection tests 添加到 deployment process 中。

### 3. Approximate top-k XLA:TPU miscompilation

8 月 25 日，我们部署了代码来改善 Claude 在 text generation 期间选择 tokens 的方式。这个 change 无意中触发了 XLA:TPU[^1] compiler 中的 latent bug，并已确认会影响 Claude Haiku 3.5 的 requests。

我们也认为这可能影响 Claude API 上 Sonnet 4 和 Opus 3 的一部分 requests。Third-party platforms 没有受到这个 issue 影响。

**Resolution:** 我们首先观察到这个 bug 影响 Haiku 3.5，并在 9 月 4 日 rollback。后来我们注意到用户关于 Opus 3 问题的 reports 与这个 bug 相符，并在 9 月 12 日 rollback。经过广泛 investigation 后，我们无法在 Sonnet 4 上 reproduce 这个 bug，但出于充分谨慎，也决定 rollback。

同时，我们已经 (a) 与 XLA:TPU team 合作修复 compiler bug，并 (b) rollout 了使用 enhanced precision 的 exact top-k fix。详情请见下面的 deep dive。

## 更近距离观察 XLA compiler bug

为了说明这些 issues 的 complexity，下面是 XLA compiler bug 如何表现，以及它为什么特别难以 diagnosis。

当 Claude 生成 text 时，它会为每个可能的 next word 计算 probabilities，然后从这个 probability distribution 中随机选择一个 sample。我们使用 “top-p sampling” 来避免 nonsensical outputs，也就是只考虑 cumulative probability 达到 threshold（通常为 0.99 或 0.999）的 words。在 TPUs 上，我们的 models 跨多个 chips 运行，probability calculations 发生在不同 locations。为了对这些 probabilities 进行排序，我们需要在 chips 之间协调 data，这很复杂。[^2]

2024 年 12 月，我们发现我们的 TPU implementation 在 [temperature](https://docs.claude.com/en/docs/about-claude/glossary#temperature) 为零时，偶尔会丢弃 most probable token。我们部署了一个 workaround 来修复这种情况。

![Code snippet of a December 2024 patch.](/images/blog/anthropic-three-recent-issues-postmortem/december-2024-patch.png)

2024 年 12 月 patch 的 code snippet，用来 workaround temperature = 0 时 unexpected dropped token bug。

Root cause 涉及 mixed precision arithmetic。我们的 models 使用 [bf16](https://github.com/tensorflow/tensorflow/blob/f41959ccb2d9d4c722fe8fc3351401d53bcf4900/tensorflow/core/framework/bfloat16.h)（16-bit floating point）计算 next-token probabilities。不过 vector processor 是 [fp32-native](https://dl.acm.org/doi/pdf/10.1145/3360307)，因此 TPU compiler (XLA) 可以通过把某些 operations 转换为 fp32（32-bit）来优化 runtime。这个 optimization pass 由 `xla_allow_excess_precision` flag guard，默认值为 true。

这造成了 mismatch：本该在 highest probability token 上一致的 operations，运行在不同 precision levels。Precision mismatch 意味着它们对哪个 token 拥有 highest probability 无法达成一致。这导致 highest probability token 有时会完全从 consideration 中消失。

8 月 26 日，我们部署了 sampling code 的 rewrite，以修复 precision issues，并改善我们如何处理达到 top-p threshold 边界的 probabilities。但在修复这些问题时，我们暴露了一个更棘手的问题。

![Code snippet showing a minimized reproducer.](/images/blog/anthropic-three-recent-issues-postmortem/minimized-reproducer.png)

Code snippet 展示了作为 8 月 11 日 change 一部分合并的 minimized reproducer，它 root-caused 了 2024 年 12 月正在 workaround 的 “bug”。实际上，这是 `xla_allow_excess_precision` flag 的 expected behavior。

我们的 fix 移除了 12 月的 workaround，因为我们认为已经解决了 root cause。这导致 [approximate top-k](https://docs.jax.dev/en/latest/_autosummary/jax.lax.approx_max_k.html) operation 中一个更深层的 bug 暴露出来，approximate top-k 是一种快速找出 highest probability tokens 的 performance optimization。[^3] 这种 approximation 有时会返回完全错误的结果，但只会在某些 batch sizes 和 model configurations 下发生。12 月的 workaround 无意中 mask 了这个问题。

![Reproducer of the underlying approximate top-k bug.](/images/blog/anthropic-three-recent-issues-postmortem/approximate-top-k-reproducer.png)

Underlying approximate top-k bug 的 reproducer，已分享给 [developed the algorithm](https://arxiv.org/pdf/2206.14286) 的 XLA:TPU engineers。这段 code 在 CPUs 上运行时会返回正确结果。

这个 bug 的行为令人沮丧地 inconsistent。它会根据无关因素而变化，例如它之前或之后运行了哪些 operations，以及 debugging tools 是否启用。同一个 prompt 可能在一个 request 上完全正常，而在下一个 request 上失败。

在 investigation 期间，我们还发现 exact top-k operation 不再有过去那种 prohibitive performance penalty。我们从 approximate 切换到 exact top-k，并把一些额外 operations 标准化为 fp32 precision。[^4] Model quality 不容妥协，所以我们接受了轻微的 efficiency impact。

## 为什么我们没有更早发现？

我们的 validation process 通常依赖 benchmarks，以及 safety evaluations 和 performance metrics。Engineering teams 会执行 spot checks，并先部署到小规模 “canary” groups。

这些 issues 暴露出我们本应更早识别的关键 gaps。我们运行的 evaluations 根本没有捕捉到用户报告的 degradation，部分原因是 Claude 通常能很好地从 isolated mistakes 中恢复。我们自己的 privacy practices 也给 investigation reports 带来了挑战。我们的内部 privacy 和 security controls 限制 engineers 访问用户与 Claude interactions 的方式和时间，尤其是在这些 interactions 未作为 feedback 报告给我们时。这保护了用户隐私，但也阻止 engineers 检查识别或 reproduce bugs 所需的问题 interactions。

每个 bug 在不同 platforms 上以不同 rates 产生不同 symptoms。这创造了一组令人困惑的 reports，无法指向任何单一原因。它看起来像 random、inconsistent degradation。

更根本的是，我们过度依赖 noisy evaluations。虽然我们知道 online reports 有所增加，但缺乏清晰方法把这些 reports 与每个 recent changes 联系起来。当 8 月 29 日 negative reports 激增时，我们没有立即把它与一次 otherwise standard 的 load balancing change 联系起来。

## 我们正在改变什么

随着我们继续改进 infrastructure，我们也在改进评估和防止上述 bugs 这类问题的方式，覆盖我们提供 Claude 的所有 platforms。下面是我们正在改变的内容：

- **更敏感的 evaluations：** 为了帮助发现任何给定 issue 的 root cause，我们开发了能够更可靠地区分 working 和 broken implementations 的 evaluations。我们会持续改进这些 evaluations，以更密切关注 model quality。
- **在更多地方进行 quality evaluations：** 虽然我们会对 systems 运行 regular evaluations，但我们会在 true production systems 上持续运行它们，以捕捉 context window load balancing error 这类 issues。
- **更快的 debugging tooling：** 我们会开发 infrastructure 和 tooling，以便在不牺牲用户隐私的情况下更好地 debug community-sourced feedback。此外，这次开发的一些 bespoke tools 会在未来类似 incidents 发生时，用于减少 remediation time。

## 用户反馈的重要性

Evals 和 monitoring 很重要。但这些 incidents 表明，当 Claude responses 没有达到通常标准时，我们也需要来自用户的 continuous signal。关于观察到的具体 changes 的 reports、遇到的 unexpected behavior examples，以及不同 use cases 中的 patterns，都帮助我们 isolate 这些 issues。

用户继续直接向我们发送 feedback 仍然尤其有帮助。你可以使用 Claude Code 中的 `/bug` command，或使用 Claude apps 中的 “thumbs down” button 来做到这一点。Developers 和 researchers 经常会创建新颖有趣的方法来 evaluate model quality，补充我们的 internal testing。如果你想分享你的方法，请联系 [feedback@anthropic.com](mailto:feedback@anthropic.com)。

我们仍然感谢 community 的这些贡献。

作者：Sam McAllister，并感谢 Stuart Ritchie、Jonathan Gray、Kashyap Murali、Brennan Saeta、Oliver Rausch、Alex Palcuie 以及许多其他人。

[^1]: XLA:TPU 是 optimizing compiler，它把 [XLA](https://openxla.org/xla/architecture) High Level Optimizing language（通常使用 [JAX](https://docs.jax.dev/en/latest) 编写）转换为 TPU machine instructions。

[^2]: 我们的 models 对单个 chips 来说太大，因此被 partitioned 到数十个或更多 chips 上，这使我们的 sorting operation 成为 distributed sort。TPUs（就像 GPUs 和 Trainium 一样）也有不同于 CPUs 的 performance characteristics，需要使用 vectorized operations 而不是 serial algorithms 的不同 implementation techniques。

[^3]: 我们一直使用这个 approximate operation，因为它带来了显著 performance improvements。这个 approximation 通过接受 lowest probability tokens 中的潜在 inaccuracies 来工作，而这些 inaccuracies 本不应影响 quality，除非 bug 导致它丢弃的是 highest probability token。

[^4]: 请注意，现在正确的 top-k implementation 可能会导致 top-p threshold 附近 tokens 的 inclusion 出现轻微差异，在罕见情况下，用户可能会受益于重新调优他们选择的 top-p。
