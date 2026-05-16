---
title: "用 sandboxing 让 Claude Code 更安全、更自主"
date: 2026-05-16T11:00:00+08:00
slug: "claude-code-sandboxing"
tags: ["ai", "claude-code", "security", "sandboxing"]
series: "Agent Notes"
source_url: "https://www.anthropic.com/engineering/claude-code-sandboxing"
translationKey: "claude-code-sandboxing"
---

在 [Claude Code](https://www.claude.com/product/claude-code) 中，Claude 会在你身边编写、测试和调试代码，navigate 你的 codebase、编辑多个 files，并运行 commands 来验证自己的工作。给予 Claude 这么多对 codebase 和 files 的 access 可能引入 risks，尤其是在 prompt injection 的情况下。

为了帮助解决这个问题，我们在 Claude Code 中引入了两个基于 sandboxing 构建的新 features，二者都旨在为 developers 提供一个更安全的工作地点，同时也允许 Claude 更自主地运行，并减少 permission prompts。在我们的内部使用中，我们发现 sandboxing 可以安全地减少 84% 的 permission prompts。通过定义 Claude 可以自由工作的设定 boundaries，它们提升了 security 和 agency。

Claude Code 运行在 permission-based model 上：默认情况下，它是 read-only 的，这意味着它在进行 modifications 或运行任何 commands 之前会请求 permission。这里有一些例外：我们会 auto-allow 像 echo 或 cat 这样的 safe commands，但大多数 operations 仍然需要 explicit approval。

不断点击 “approve” 会拖慢 development cycles，并可能导致 “approval fatigue”，也就是 users 可能不会认真注意自己正在批准什么，进而让 development 变得不那么安全。

为了解决这个问题，我们为 Claude Code 发布了 sandboxing。

Sandboxing 创建预定义 boundaries，Claude 可以在这些 boundaries 内更自由地工作，而不是为每个 action 请求 permission。启用 sandboxing 后，你会获得大幅减少的 permission prompts 和更高的 safety。

我们的 sandboxing 方法构建在 operating system-level features 之上，以启用两个 boundaries：

1. **Filesystem isolation**，确保 Claude 只能访问或修改 specific directories。这在防止被 prompt-injected 的 Claude 修改 sensitive system files 时尤其重要。
2. **Network isolation**，确保 Claude 只能连接到 approved servers。这可以防止被 prompt-injected 的 Claude 泄露 sensitive information 或下载 malware。

值得注意的是，有效的 sandboxing 需要 *同时* 具备 filesystem 和 network isolation。没有 network isolation，compromised agent 可能会 exfiltrate SSH keys 等 sensitive files；没有 filesystem isolation，compromised agent 则可以轻易 escape sandbox 并获得 network access。正是同时使用这两种技术，我们才能为 Claude Code users 提供更安全、更快速的 agentic experience。

我们正在推出 [a new sandbox runtime](https://docs.claude.com/en/docs/claude-code/sandboxing)，它作为 research preview 以 beta 形式提供，让你无需承担启动和管理 container 的 overhead，就能精确定义 agent 可以访问哪些 directories 和 network hosts。它可用于 sandbox 任意 processes、agents 和 MCP servers。它也作为 [an open source research preview](https://github.com/anthropic-experimental/sandbox-runtime) 提供。

在 Claude Code 中，我们使用这个 runtime 来 sandbox bash tool，让 Claude 可以在你设置的 defined limits 内运行 commands。在安全 sandbox 内，Claude 可以更自主地运行，并安全执行 commands 而无需 permission prompts。如果 Claude 试图访问 sandbox *之外* 的内容，你会立即收到通知，并可以选择是否允许。

我们基于 [Linux bubblewrap](https://github.com/containers/bubblewrap) 和 MacOS seatbelt 等 OS level primitives 构建了这一功能，以在 OS level enforce 这些 restrictions。它们不仅覆盖 Claude Code 的直接 interactions，也覆盖 command 生成的任何 scripts、programs 或 subprocesses。如上所述，这个 sandbox 同时 enforce：

1. **Filesystem isolation**，通过允许对 current working directory 的 read 和 write access，但阻止修改其外部的任何 files。
2. **Network isolation**，通过只允许经由 unix domain socket 连接到 sandbox 外 proxy server 的 internet access。这个 proxy server 会 enforce process 可连接 domains 的 restrictions，并处理新请求 domains 的 user confirmation。如果你希望进一步提高 security，我们也支持自定义这个 proxy，以对 outgoing traffic enforce arbitrary rules。

这两个 components 都是 configurable 的：你可以轻松选择 allow 或 disallow specific file paths 或 domains。

![Claude Code sandboxing architecture](/images/blog/claude-code-sandboxing/sandboxing-architecture.png)

Claude Code 的 sandboxing architecture 使用 filesystem 和 network controls 隔离 code execution，自动允许 safe operations、阻止 malicious ones，并只在需要时请求 permission。

Sandboxing 确保即使 prompt injection 成功，也会被完全隔离，并且无法影响整体 user security。这样，一个 compromised Claude Code 无法窃取你的 SSH keys，也无法向 attacker's server phone home。

要开始使用这个 feature，请在 Claude Code 中运行 /sandbox，并查看关于我们 security model 的 [more technical details](https://docs.claude.com/en/docs/claude-code/sandboxing)。

为了让其他 teams 更容易构建更安全的 agents，我们已经 [open sourced](https://github.com/anthropic-experimental/sandbox-runtime) 这个 feature。我们相信，其他人应该考虑为自己的 agents 采用这项技术，以增强其 agents 的 security posture。

### **Web 上的 Claude Code：在 cloud 中安全运行 Claude Code**

今天，我们也发布了 [Claude Code on the web](https://docs.claude.com/en/docs/claude-code/claude-code-on-the-web)，让 users 可以在 cloud 中的 isolated sandbox 里运行 Claude Code。Claude Code on the web 会在 isolated sandbox 中执行每个 Claude Code session，在安全可靠的方式下，它对自己的 server 拥有 full access。我们设计这个 sandbox，是为了确保 sensitive credentials（例如 git credentials 或 signing keys）永远不会和 Claude Code 一起位于 sandbox 内。这样，即使 sandbox 中运行的 code 被 compromised，user 也能免受进一步伤害。

Claude Code on the web 使用 custom proxy service 透明处理所有 git interactions。在 sandbox 内，git client 使用 custom-built scoped credential 向这个 service 进行 authentication。Proxy 会验证这个 credential 和 git interaction 的 contents（例如确保它只 push 到 configured branch），然后在把 request 发送到 GitHub 前附加正确的 authentication token。

![Claude Code Git integration proxy](/images/blog/claude-code-sandboxing/git-proxy.png)

Claude Code 的 Git integration 会把 commands 路由通过 secure proxy，该 proxy 验证 authentication tokens、branch names 和 repository destinations，从而允许 safe version control workflows，同时防止 unauthorized pushes。

我们的新 sandboxed bash tool 和 Claude Code on the web，为使用 Claude 进行 engineering work 的 developers 在 security 和 productivity 两方面都提供了实质性改进。

要开始使用这些 tools：

1. 在 Claude 中运行 `/sandbox`，并查看 [our docs](https://docs.claude.com/en/docs/claude-code/sandboxing) 了解如何 configure 这个 sandbox。

或者，如果你正在构建自己的 agents，请查看我们的 [open-sourced sandboxing code](https://github.com/anthropic-experimental/sandbox-runtime)，并考虑把它集成到你的工作中。我们期待看到你会构建什么。

要了解更多关于 Claude Code on the web 的信息，请查看我们的 [launch blog post](https://www.anthropic.com/news/claude-code-on-the-web)。

文章由 David Dworken 和 Oliver Weller-Davies 撰写，并感谢 Meaghan Choi、Catherine Wu、Molly Vorwerck、Alex Isken、Kier Bradwell 和 Kevin Garcia 的贡献。
