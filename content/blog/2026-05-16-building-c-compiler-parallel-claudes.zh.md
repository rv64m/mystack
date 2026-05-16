---
title: "用一队并行 Claudes 构建 C 编译器"
date: 2026-05-16T15:00:00+08:00
slug: "building-c-compiler-parallel-claudes"
tags: ["ai", "agents", "claude-code", "compiler"]
series: "Agent Notes"
source_url: "https://www.anthropic.com/engineering/building-c-compiler"
translationKey: "building-c-compiler-parallel-claudes"
---

*本文由 Nicholas Carlini 撰写，他是我们 Safeguards team 的 researcher。*

我一直在试验一种监督 language models 的新方法，我们称之为 “agent teams”。

使用 agent teams 时，多个 Claude instances 会在没有 active human intervention 的情况下，并行处理一个 shared codebase。这种方法极大扩展了 LLM agents 可以实现的范围。

为了 stress test 它，我给 16 个 agents 分配了一个任务：从零开始编写一个基于 Rust 的 C compiler，能够编译 Linux kernel。在近 2,000 个 Claude Code sessions 和 20,000 美元 API 成本之后，这个 agent team 产出了一个 100,000 行的 compiler，可以在 x86、ARM 和 RISC-V 上构建 Linux 6.9。

![Asynchronous software development with a team of Claudes](/images/blog/building-c-compiler-parallel-claudes/parallel-claudes-video.jpg)

[Asynchronous software development with a team of Claudes](https://www.youtube.com/watch?v=vNeIQS9GsZ8)

[Claude](https://www.anthropic.com/channel/UCV03SRZXJEz-hchIAogeJOg)

Claude 262K subscribers

[Watch on](https://www.youtube.com/watch?v=vNeIQS9GsZ8)

[这个 compiler 本身就是一个有趣的 artifact](https://github.com/anthropics/claudes-c-compiler)，但我在这里关注的是关于为 long-running autonomous agent teams 设计 harnesses 的经验：如何编写 tests，让 agents 在没有 human oversight 的情况下保持在轨道上；如何组织工作，让多个 agents 可以并行取得进展；以及这种方法在哪里触及上限。

现有 agent scaffolds（如 Claude Code）要求 operator 在线并可以共同工作。如果你要求它解决一个漫长而复杂的问题，model 可能会解决其中一部分，但最终它会停下来等待继续输入，比如一个问题、status update 或 clarification request。

为了引出持续的 autonomous progress，我构建了一个 harness，把 Claude 放进一个简单 loop 中（如果你见过 Ralph-loop，这应该看起来很熟悉）。当它完成一个 task 时，它会立即接着处理下一个。*（请在 container 中运行这个，而不是你的实际机器。）*

```plain text
#!/bin/bash

while true; do
    COMMIT=$(git rev-parse --short=6 HEAD)
    LOGFILE="agent_logs/agent_${COMMIT}.log"

    claude --dangerously-skip-permissions \
           -p "$(cat AGENT_PROMPT.md)" \
           --model claude-opus-X-Y &> "$LOGFILE"
done
```

在 agent prompt 中，我告诉 Claude 要解决什么问题，并要求它通过把问题拆成小块、跟踪自己正在做什么、判断下一步该做什么来处理这个问题，并且实际上一直继续，直到它完美为止。（在最后这一点上，Claude 没有选择。Loop 会永远运行，虽然有一次，我确实看到 Claude 意外执行了 `pkill -9 bash`，从而杀死自己并结束了 loop。Whoops!）

## 并行运行 Claude

并行运行多个 instances 可以解决 single-agent harness 的两个弱点：

- 一个 Claude Code session 一次只能做一件事。特别是随着 project scope 扩大，并行 debug 多个 issues 效率高得多。
- 运行多个 Claude agents 允许 specialization。当几个 agents 被分配去解决手头实际问题时，其他 specialized agents 可以被调用来（例如）维护 documentation、关注 code quality，或解决 specialized sub-tasks。

我的 parallel Claude implementation 非常 bare-bones。创建一个新的 bare git repo；对于每个 agent，启动一个 Docker container，并把 repo mount 到 `/upstream`。每个 agent clone 一个 local copy 到 `/workspace`，完成后从自己的 local container push 到 upstream。

为了防止两个 agents 同时尝试解决同一个问题，harness 使用了一个简单 synchronization algorithm：

1. Claude 通过向 current_tasks/ 写入 text file 来对 task 取得 “lock”（例如，一个 agent 可能 lock `current_tasks/parse_if_statement.txt`，另一个 lock `current_tasks/codegen_function_definition.txt`）。如果两个 agents 尝试 claim 同一个 task，git 的 synchronization 会迫使第二个 agent 选择不同 task。
2. Claude 处理这个 task，然后从 upstream pull，merge 来自其他 agents 的 changes，push 自己的 changes，并移除 lock。Merge conflicts 很频繁，但 Claude 足够聪明，能搞清楚。
3. Infinite agent-generation-loop 在 fresh container 中 spawn 一个新的 Claude Code session，然后 cycle 重复。

这是一个非常早期的 research prototype。我还没有实现任何其他 agents 之间 communication 的方法，也没有 enforce 任何管理 high-level goals 的 process。我没有使用 orchestration agent。

相反，我让每个 Claude agent 自行决定如何行动。在大多数情况下，Claude 会接手 “next most obvious” problem。当卡在 bug 上时，Claude 通常会维护一个 running doc，记录 failed approaches 和 remaining tasks。在这个 project 的 [git repository](https://github.com/anthropics/claudes-c-compiler) 中，你可以通读 history，观察它如何对各种 tasks 取得 locks。

Scaffolding 让 Claude 在 loop 中运行，但只有当 Claude 能判断如何取得进展时，这个 loop 才有用。我的大部分努力都放在设计 Claude 周围的 environment，包括 tests、environment 和 feedback，使它能够在没有我的情况下 orient itself。下面这些方法，是我在 orchestrating multiple Claude instances 时发现最有帮助的。

## 为 Claude 设计测试 harness

Claude 会自主工作，去解决我给它的任何问题。因此 task verifier 几乎必须完美，否则 Claude 会解决错误的问题。改进 testing harness 需要寻找高质量 compiler test suites，为 open-source software packages 编写 verifiers 和 build scripts，并观察 Claude 正在犯的错误，然后在识别这些 failure modes 后设计新的 tests。

例如，在 project 末期，Claude 开始经常在实现新 feature 时破坏 existing functionality。为了解决这个问题，我构建了 continuous integration pipeline，并实现了更严格 enforcement，让 Claude 可以更好地测试自己的工作，使 new commits 不能破坏 existing code。

我必须不断提醒自己，我是在为 Claude 而不是为自己编写这个 test harness，这意味着要重新思考许多关于 tests 应该如何传达 results 的假设。

例如，每个 agent 都会被放进一个没有 context 的 fresh container，并会花大量时间 orienting itself，尤其是在大型 projects 上。在我们甚至进入 tests 之前，为了帮助 Claude 帮助自己，我加入了 instructions，要求维护 extensive READMEs 和 progress files，并频繁更新 current status。

我也记住 language models 有固有限制，而在这个案例中，需要围绕这些限制进行设计。这些包括：

- **Context window pollution：** Test harness 不应该打印数千个 useless bytes。最多应该打印几行 output，并把所有重要 information log 到 file 中，让 Claude 在需要时能找到。Logfiles 应该容易自动处理：如果有 errors，Claude 应该写 ERROR，并把 reason 放在同一行，这样 grep 就能找到。预先计算 aggregate summary statistics 会有帮助，这样 Claude 不必重新计算。
- **Time blindness：** Claude 无法感知时间，放任不管时，它会愉快地花几个小时运行 tests 而不是取得进展。Harness 不频繁地打印 incremental progress（避免污染 context），并包含默认 `-fast` option，运行 1% 或 10% 的 random sample。这个 subsample 对每个 agent 是 deterministic 的，但跨 VMs 是 random 的，所以 Claude 仍然覆盖所有 files，同时每个 agent 可以完美识别 regressions。

当有许多不同 failing tests 时，parallelization 很简单：每个 agent 选择一个不同 failing test 来处理。Test suite 达到 99% pass rate 后，每个 agent 会处理让一个不同的小型 open-source project（例如 SQLite、Redis、libjpeg、MQuickJS、Lua）成功 compile。

但当 agents 开始 compile Linux kernel 时，它们卡住了。不同于包含数百个 independent tests 的 test suite，编译 Linux kernel 是一个巨大的 task。每个 agent 都会遇到同一个 bug，修复那个 bug，然后覆盖彼此的 changes。运行 16 个 agents 没有帮助，因为每个都卡在解决同一个 task。

修复方法是使用 [GCC](https://gcc.gnu.org/) 作为 online known-good compiler oracle 进行比较。我写了一个新的 test harness，用 GCC 随机编译 kernel 的大部分文件，只用 Claude's C Compiler 编译剩余 files。如果 kernel 正常工作，那么问题就不在 Claude 编译的那部分 files 中。如果它出错，那么可以进一步通过用 GCC 重新编译这些 files 的一部分来 refine。这让每个 agent 能够并行工作，修复不同 files 中的不同 bugs，直到 Claude 的 compiler 最终可以编译所有 files。（在这奏效之后，仍然需要应用 delta debugging techniques 来找到那些单独工作正常、但一起失败的文件对。）

Parallelism 也启用 specialization。LLM-written code 经常重新实现 existing functionality，所以我给一个 agent 分配任务，让它合并发现的任何 duplicate code。我让另一个负责改善 compiler 本身的 performance，又让第三个负责输出 efficient compiled code。我要求另一个 agent 从 Rust developer 的 perspective critique project design，并对 project 做 structural changes 来改善整体 code quality，另一个 agent 处理 documentation。

## Capability benchmark

这个 project 被设计成 capability benchmark。我感兴趣的是 stress-testing LLMs 今天刚刚 *勉强* 能做到什么的 limits，以帮助我们为未来 models 将可靠做到什么做好准备。

我一直把 C Compiler project 作为整个 Claude 4 model series 的 benchmark。和此前 projects 一样，我先起草我想要的内容：一个 from-scratch optimizing compiler，没有 dependencies，与 GCC 兼容，能够 compile Linux kernel，并设计为支持 multiple backends。虽然我指定了 design 的某些方面（例如，它应该有 SSA IR 以启用 multiple optimization passes），但我没有详细说明如何实现。

之前的 Opus 4 models 勉强能够产出 functional compiler。Opus 4.5 是第一个跨过某个 threshold 的版本，它能产出可以通过大型 test suites 的 functional compiler，但仍然无法编译任何真实大型 projects。我使用 Opus 4.6 的目标，是再次测试 limits。

在两周内近 2,000 个 Claude Code sessions 中，Opus 4.6 消耗了 20 亿 input tokens，并生成 1.4 亿 output tokens，总成本略低于 20,000 美元。即使与最昂贵的 Claude Max plans 相比，这也是一个极其昂贵的 project。但这个总额只是我自己产出它所需成本的一小部分，更不用说整个团队了。

这是一个 clean-room implementation（Claude 在整个 development 期间任何时候都没有 internet access）；它只依赖 Rust standard library。这个 100,000 行 compiler 可以在 x86、ARM 和 RISC-V 上构建可启动的 Linux 6.9。它还可以 compile QEMU、FFmpeg、SQLite、postgres、redis，并且在大多数 compiler test suites 上有 99% pass rate，包括 [GCC torture test suite](https://gcc.gnu.org/onlinedocs/gccint/Torture-Tests.html)。它还通过了 developer 的终极 litmus test：它可以 compile 并运行 Doom。

不过，这个 compiler 并非没有 limitations。这些包括：

- 它缺少从 real mode boot Linux 所必需的 16-bit x86 compiler。对此，它会调用 GCC（x86_32 和 x86_64 compilers 是它自己的）。
- 它没有自己的 assembler 和 linker；这些是 Claude 最后才开始自动化的部分，目前仍然有些 buggy。Demo video 是使用 GCC assembler 和 linker 生成的。
- 这个 compiler 成功构建了许多 projects，但不是全部。它还不是 real compiler 的 drop-in replacement。
- 生成的 code 不是很 efficient。即使启用所有 optimizations，它输出的 code 也比禁用所有 optimizations 的 GCC 更低效。
- Rust code quality 是 reasonable 的，但远达不到 expert Rust programmer 可能产出的质量。

最终得到的 compiler 几乎触及了 Opus 能力的 limits。我（努力地！）尝试修复上述几个 limitations，但没有完全成功。New features 和 bugfixes 经常破坏 existing functionality。

作为一个特别有挑战性的例子，Opus 无法实现 boot into 16-bit real mode 所需的 16-bit x86 code generator。虽然 compiler 可以通过 66/67 opcode prefixes 输出正确的 16-bit x86，但最终 compiled output 超过 60kb，远超 Linux 强制的 32k code limit。于是 Claude 在这里简单作弊，调用 GCC 完成这一阶段（这只适用于 x86。对于 ARM 或 RISC-V，Claude 的 compiler 可以完全自行 compile。）

这个 compiler 的 [source code is available](https://github.com/anthropics/claudes-c-compiler)。下载它，通读 code，并在你喜欢的 C projects 上试试。我一贯发现，理解 language models 能做什么的最佳方式，是把它们推到 limits，然后研究它们从哪里开始崩溃。在接下来几天，如果你想跟进 Claude 持续尝试解决这些 limitations，我会继续让 Claude push new changes。

## Agent teams 的意义

每一代 language models 都打开了与它们协作的新方式。早期 models 对 IDEs 中的 tab-completion 很有用。没过多久，models 可以根据 docstring 完成 function body。Claude Code 的发布把 agents 带入 mainstream，并让 developers 能与 Claude pair-program。但这些 products 都假设 user 定义一个 task，LLM 运行几秒或几分钟并返回 answer，然后 user 提供 follow-up。

Agent teams 展示了自主实现整个复杂 projects 的可能性。这让我们这些工具 users 可以对自己的 goals 更加 ambitious。

我们仍处在早期，fully autonomous development 也有真实 risks。当 human 在 development 期间陪着 Claude 时，他们可以确保 consistent quality，并实时捕捉 errors。对于 autonomous systems，很容易看到 tests pass 就假设 job is done，而事实很少如此。我以前从事 penetration testing，利用大公司产品中的 vulnerabilities，而 programmers 部署自己从未亲自 verified 的 software 这种想法，确实令人担忧。

所以，尽管这个 experiment 让我兴奋，它也让我感到不安。构建这个 compiler 是我最近最开心的经历之一，但我没有预料到在 2026 年初这会接近可能。Language models 以及我们用来与它们交互的 scaffolds 的快速进步，打开了编写海量新 code 的大门。我预计 positive applications 会超过 negative，但我们正在进入一个需要新 strategies 来安全 navigate 的新世界。

特别感谢 Josef Bacik、Edwin Chen、Bernardo Meurer Costa、Jake Eaton、Dan Kelley、Felix Klock、Jannet Park、Steve Weis，以及 Anthropic 内许多其他人的帮助和贡献。
