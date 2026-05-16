---
title: "构建有效的 AI Agents"
date: 2026-05-16T08:00:00+08:00
slug: "building-effective-agents"
tags: ["ai", "agents", "workflows"]
series: "Agent Notes"
source_url: "https://www.anthropic.com/engineering/building-effective-agents"
translationKey: "building-effective-agents"
---

![Building Effective AI Agents](/images/blog/building-effective-agents/hero.svg)

过去一年里，我们与数十个跨行业构建 large language model（LLM）agents 的团队合作。我们持续看到，最成功的实现并没有使用复杂框架或专门库。相反，它们使用的是简单、可组合的模式。

在这篇文章中，我们会分享自己从客户合作和亲自构建 agents 中学到的东西，并为开发者构建有效 agents 提供实用建议。

## 什么是 agents？

“Agent”可以有多种定义。一些客户把 agents 定义为完全自主的系统，能够在较长时间内独立运行，并使用各种工具完成复杂任务。另一些客户则用这个词描述更具规定性的实现，它们遵循预定义 workflows。在 Anthropic，我们把所有这些变体都归类为 **agentic systems**，但在 **workflows** 和 **agents** 之间划出一个重要的架构区别：

- **Workflows** 是 LLMs 和工具通过预定义代码路径被编排起来的系统。
- **Agents** 则是 LLMs 动态指导自身流程和工具使用，并保持对如何完成任务的控制权的系统。

下面，我们会详细探索这两类 agentic systems。在 Appendix 1（“Agents in Practice”）中，我们描述了客户在使用这类系统时发现特别有价值的两个领域。

## 何时使用 agents，以及何时不使用

在使用 LLMs 构建应用时，我们建议找到尽可能简单的解决方案，并只在需要时增加复杂度。这可能意味着根本不构建 agentic systems。Agentic systems 通常会用延迟和成本换取更好的任务表现，你应该考虑什么时候这种权衡有意义。

当确实需要更多复杂度时，workflows 为定义明确的任务提供可预测性和一致性，而当需要大规模的灵活性和模型驱动决策时，agents 是更好的选择。然而，对于许多应用来说，用 retrieval 和 in-context examples 优化单次 LLM 调用通常就足够了。

有许多框架能让 agentic systems 更容易实现，包括：

这些框架通过简化一些标准低层任务，让入门变得容易，例如调用 LLMs、定义和解析工具，以及把调用链接起来。然而，它们经常创建额外的抽象层，遮蔽底层 prompts 和 responses，使调试更困难。它们也可能诱使你在更简单设置足够时添加复杂度。

我们建议开发者从直接使用 LLM APIs 开始：许多模式都可以用几行代码实现。如果你确实使用框架，请确保理解底层代码。对底层机制的错误假设，是客户错误的常见来源。

有关一些示例实现，请见我们的 [cookbook](https://platform.claude.com/cookbook/patterns-agents-basic-workflows)。

在这一节中，我们会探索在生产中见到的 agentic systems 的常见模式。我们会从 foundational building block，也就是 augmented LLM 开始，然后逐步增加复杂度，从简单的组合式 workflows 到自主 agents。

Agentic systems 的基本构建块，是通过 retrieval、tools 和 memory 等增强能力强化的 LLM。我们当前的模型可以主动使用这些能力：生成自己的 search queries、选择合适工具，并决定要保留什么信息。

![Augmented LLM](/images/blog/building-effective-agents/augmented-llm.png)

Augmented LLM。

我们建议重点关注实现中的两个关键方面：根据你的具体 use case 定制这些能力，并确保它们为你的 LLM 提供简单、文档完善的接口。虽然实现这些增强能力有很多方法，其中一种方式是通过我们最近发布的 [Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)，它允许开发者通过简单的 [client implementation](https://modelcontextprotocol.io/tutorials/building-a-client#building-mcp-clients)，集成不断增长的第三方工具生态。

在本文剩余部分，我们会假设每次 LLM 调用都可以访问这些增强能力。

Prompt chaining 会把一个任务分解成一系列步骤，其中每次 LLM 调用都会处理前一次调用的输出。你可以在任意中间步骤添加程序化检查（见下图中的 “gate”），以确保流程仍然在轨道上。

![Prompt chaining workflow](/images/blog/building-effective-agents/prompt-chaining.png)

Prompt chaining workflow。

**何时使用这个 workflow：** 这个 workflow 适合任务可以轻松、干净地分解成固定子任务的情况。主要目标是通过让每次 LLM 调用处理更容易的任务，用延迟换取更高准确率。

**Prompt chaining 有用的例子：**

- 生成 marketing copy，然后把它翻译成另一种语言。
- 写一份文档大纲，检查大纲是否满足某些标准，然后基于大纲写文档。

Routing 会对输入进行分类，并把它导向专门的后续任务。这个 workflow 允许关注点分离，并构建更专门化的 prompts。没有这个 workflow 时，针对一种输入进行优化可能会损害其他输入上的表现。

![Routing workflow](/images/blog/building-effective-agents/routing.png)

Routing workflow。

**何时使用这个 workflow：** Routing 适合复杂任务，其中存在更适合分开处理的不同类别，并且分类可以由 LLM 或更传统的分类模型/算法准确完成。

**Routing 有用的例子：**

- 将不同类型的客户服务 query（一般问题、退款请求、技术支持）导向不同的下游流程、prompts 和工具。
- 将简单/常见问题路由给更小、更具成本效益的模型，例如 Claude Haiku 4.5；将困难/少见问题路由给更强模型，例如 Claude Sonnet 4.5，以优化最佳表现。

LLMs 有时可以同时处理一个任务，并通过程序聚合它们的输出。这个 workflow，也就是 parallelization，主要表现为两种变体：

- **Sectioning**：把任务拆成独立子任务并并行运行。
- **Voting：** 多次运行同一个任务，以获得多样化输出。

![Parallelization workflow](/images/blog/building-effective-agents/parallelization.png)

Parallelization workflow。

**何时使用这个 workflow：** 当被拆分的子任务可以并行化以提升速度，或需要多个视角/尝试来提高结果置信度时，parallelization 很有效。对于有多个考虑因素的复杂任务，当每个考虑因素由单独的 LLM 调用处理时，LLMs 通常表现更好，因为这样可以让注意力聚焦在每个具体方面。

**Parallelization 有用的例子：**

- **Sectioning**：
  - 实现 guardrails，其中一个模型实例处理用户 query，另一个筛查不当内容或请求。这通常比让同一个 LLM 调用同时处理 guardrails 和核心回答表现更好。
  - 自动化 evals 来评估 LLM performance，其中每次 LLM 调用评估模型在给定 prompt 上表现的不同方面。
- **Voting**：
  - 审查一段代码中的漏洞，使用几个不同 prompts 分别审查代码，如果发现问题则标记。
  - 评估某段内容是否不合适，由多个 prompts 评估不同方面，或要求不同投票阈值，以平衡 false positives 和 false negatives。

在 orchestrator-workers workflow 中，一个中央 LLM 会动态拆解任务，把任务委派给 worker LLMs，并综合它们的结果。

![Orchestrator-workers workflow](/images/blog/building-effective-agents/orchestrator-workers.png)

Orchestrator-workers workflow。

**何时使用这个 workflow：** 这个 workflow 很适合复杂任务，其中你无法预先预测需要哪些子任务（例如在 coding 中，每次需要修改的文件数量以及每个文件中变更的性质，可能都取决于任务）。虽然它在拓扑上与 parallelization 相似，但关键区别在于灵活性：子任务不是预定义的，而是由 orchestrator 根据具体输入决定的。

**Orchestrator-workers 有用的例子：**

- 每次都需要对多个文件进行复杂变更的 coding products。
- 涉及从多个来源收集和分析信息以寻找可能相关信息的 search tasks。

在 evaluator-optimizer workflow 中，一次 LLM 调用生成回答，另一次 LLM 调用在循环中提供评估和反馈。

![Evaluator-optimizer workflow](/images/blog/building-effective-agents/evaluator-optimizer.png)

Evaluator-optimizer workflow。

**何时使用这个 workflow：** 当我们有明确评估标准，并且 iterative refinement 能提供可衡量价值时，这个 workflow 特别有效。良好适配有两个信号：第一，当人类明确表达反馈时，LLM responses 可以被明显改善；第二，LLM 能提供这样的反馈。这类似于人类作者在产出 polished document 时经历的迭代写作过程。

**Evaluator-optimizer 有用的例子：**

- 文学翻译，其中有 translator LLM 一开始可能无法捕捉的细微差别，但 evaluator LLM 可以提供有用 critique。
- 需要多轮搜索和分析以收集全面信息的复杂 search tasks，其中 evaluator 决定是否需要进一步搜索。

随着 LLMs 在关键能力上成熟，agents 正在生产环境中出现，这些关键能力包括理解复杂输入、进行推理和规划、可靠使用工具，以及从错误中恢复。Agents 以人类用户的命令或交互式讨论开始工作。一旦任务清楚，agents 会独立规划和操作，可能会返回人类那里获取更多信息或判断。在执行过程中，agents 在每一步从环境中获得 “ground truth” 至关重要，例如工具调用结果或代码执行结果，以评估自己的进展。Agents 随后可以在 checkpoints 或遇到 blockers 时暂停，以获取人类反馈。任务通常在完成时终止，但也常见地包含停止条件（例如最大迭代次数）以保持控制。

Agents 可以处理复杂任务，但它们的实现通常很直接。它们通常只是 LLMs 基于环境反馈在循环中使用工具。因此，清晰、深思熟虑地设计 toolsets 及其文档至关重要。我们会在 Appendix 2（“Prompt Engineering your Tools”）中扩展说明工具开发的最佳实践。

![Autonomous agent](/images/blog/building-effective-agents/autonomous-agent.png)

Autonomous agent。

**何时使用 agents：** Agents 可用于开放式问题，其中很难或不可能预测所需步骤数量，并且你无法 hardcode 一个固定路径。LLM 可能会运行许多轮，你必须对它的决策能力有一定信任。Agents 的自主性让它们非常适合在可信环境中扩展任务。

Agents 的自主性意味着更高成本，以及错误累积的可能性。我们建议在 sandboxed environments 中进行广泛测试，并配合适当 guardrails。

**Agents 有用的例子：**

以下例子来自我们自己的实现：

- 一个 coding Agent，用于解决 [SWE-bench tasks](https://www.anthropic.com/research/swe-bench-sonnet)，这些任务涉及根据任务描述编辑许多文件；

![Coding agent 的高层流程](/images/blog/building-effective-agents/coding-agent-flow.png)

Coding agent 的高层流程。

这些构建块不是规定性的。它们是开发者可以塑造和组合，以适配不同 use cases 的常见模式。成功的关键和任何 LLM features 一样，是衡量表现并迭代实现。重复一遍：你应该考虑*只有*在它能明显改善结果时才增加复杂度。

LLM 领域的成功不在于构建最复杂的系统，而在于构建适合你需求的*正确*系统。从简单 prompts 开始，用全面评估优化它们，并且只有在更简单方案不足时，才添加多步骤 agentic systems。

实现 agents 时，我们尝试遵循三个核心原则：

1. 在 agent 设计中保持**简单性**。
2. 通过明确展示 agent 的 planning steps 来优先保证**透明性**。
3. 通过彻底的工具**文档和测试**，仔细打造 agent-computer interface（ACI）。

框架可以帮助你快速开始，但在走向生产时，不要犹豫于减少抽象层，并用基础组件构建。遵循这些原则，你可以创建不仅强大，而且可靠、可维护、受用户信任的 agents。

作者：Erik S. 和 Barry Zhang。本文来自我们在 Anthropic 构建 agents 的经验，以及客户分享的宝贵洞察，对此我们深表感谢。

## Appendix 1: 实践中的 Agents

我们与客户的合作揭示了 AI agents 的两个特别有前景的应用，它们展示了上文讨论模式的实践价值。这两个应用都说明，对于同时需要对话和动作、有明确成功标准、允许 feedback loops，并整合有意义的人类监督的任务，agents 能创造最大价值。

客户支持将熟悉的 chatbot interfaces 与通过 tool integration 获得的增强能力结合起来。这自然适合更开放式的 agents，因为：

- 支持交互自然遵循对话流，同时需要访问外部信息和动作；
- 工具可以集成，用来拉取客户数据、订单历史和知识库文章；
- 发放退款或更新 tickets 这类动作可以通过程序处理；并且
- 成功可以通过用户定义的解决结果清楚衡量。

几家公司已经通过 usage-based pricing models 证明了这种方法的可行性，它们只对成功解决的问题收费，显示了对自身 agents 效果的信心。

软件开发领域已经展现出 LLM features 的显著潜力，能力从代码补全发展到自主问题解决。Agents 在这里特别有效，因为：

- 代码解决方案可以通过自动化测试验证；
- Agents 可以使用测试结果作为反馈，迭代解决方案；
- 问题空间定义清晰且结构化；并且
- 输出质量可以被客观衡量。

在我们自己的实现中，agents 现在可以仅基于 pull request description 解决 [SWE-bench Verified](https://www.anthropic.com/research/swe-bench-sonnet) benchmark 中的真实 GitHub issues。然而，虽然自动化测试有助于验证功能，人类审查仍然对确保解决方案符合更广泛的系统需求至关重要。

无论你正在构建哪种 agentic system，tools 很可能都是你的 agent 的重要组成部分。[Tools](https://www.anthropic.com/news/tool-use-ga) 通过在我们的 API 中指定其精确结构和定义，让 Claude 能够与外部服务和 APIs 交互。当 Claude 响应时，如果它计划调用工具，它会在 API response 中包含一个 [tool use block](https://docs.anthropic.com/en/docs/build-with-claude/tool-use#example-api-response-with-a-tool-use-content-block)。Tool definitions 和 specifications 应该得到与你整体 prompts 一样多的 prompt engineering 关注。在这个简短 appendix 中，我们描述如何 prompt engineer 你的 tools。

指定同一个动作通常有多种方式。例如，你可以通过写 diff 指定文件编辑，也可以通过重写整个文件指定。对于 structured output，你可以把代码返回在 markdown 中，也可以返回在 JSON 中。在 software engineering 中，这类差异是 cosmetic 的，并且可以无损地彼此转换。然而，某些格式对 LLM 来说比其他格式难写得多。写 diff 要求在写出新代码之前，知道 chunk header 中有多少行正在变化。相比 markdown，把代码写进 JSON 需要额外转义换行和引号。

我们对工具格式决策的建议如下：

- 给模型足够 tokens 来“think”，再让它把自己写进角落。
- 保持格式接近模型在互联网文本中自然见过的东西。
- 确保没有格式化 “overhead”，例如必须准确计数数千行代码，或对它写出的任何代码进行字符串转义。

一个经验法则是，想想人们在 human-computer interfaces（HCI）上投入了多少努力，然后计划在创建好的 *agent*-computer interfaces（ACI）上投入同样多努力。下面是一些关于如何做到这一点的想法：

- 站在模型的角度看。仅基于描述和参数，这个工具该如何使用是否显而易见，还是你需要认真思考？如果是后者，那么对模型来说大概也是如此。好的工具定义通常包含示例用法、边界情况、输入格式要求，以及与其他工具的清晰边界。
- 你如何改变参数名称或描述，让事情更明显？把它想象成给团队里一位 junior developer 写优秀 docstring。当使用许多相似工具时，这尤其重要。
- 测试模型如何使用你的工具：在我们的 [workbench](https://console.anthropic.com/workbench) 中运行许多示例输入，观察模型会犯什么错误，并进行迭代。
- 对你的工具做 [Poka-yoke](https://en.wikipedia.org/wiki/Poka-yoke)。改变参数，让出错更困难。

在为 [SWE-bench](https://www.anthropic.com/research/swe-bench-sonnet) 构建 agent 时，我们实际上花在优化工具上的时间比花在整体 prompt 上的时间更多。例如，我们发现，当 agent 离开 root directory 后，模型会在使用相对文件路径的工具上出错。为了解决这个问题，我们把工具改为始终要求绝对文件路径，并发现模型可以完美使用这种方法。
