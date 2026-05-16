---
title: "用 Agent Skills 为现实世界装备 agents"
date: 2026-05-16T10:00:00+08:00
slug: "agent-skills-real-world"
tags: ["ai", "agents", "skills", "claude"]
series: "Agent Notes"
source_url: "https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills"
translationKey: "agent-skills-real-world"
---

*更新：我们已将* [*Agent Skills*](https://agentskills.io/) *发布为一个用于 cross-platform portability 的 open standard。（2025 年 12 月 18 日）*

随着 model capabilities 改善，我们现在可以构建与完整 computing environments 交互的 general-purpose agents。例如，[Claude Code](https://claude.com/product/claude-code) 可以使用 local code execution 和 filesystems，跨 domains 完成复杂 tasks。但随着这些 agents 变得更强大，我们需要更 composable、scalable 和 portable 的方式，为它们装备 domain-specific expertise。

这促使我们创建了 [**Agent Skills**](https://www.anthropic.com/news/skills)：由 instructions、scripts 和 resources 组成的有组织 folders，agents 可以发现并动态加载它们，以便在特定 tasks 上表现更好。Skills 通过把你的 expertise 打包成 Claude 可组合使用的 resources 来扩展 Claude 的 capabilities，把 general-purpose agents 转变成适合你需求的 specialized agents。

为 agent 构建 skill，就像为新员工整理 onboarding guide。现在，任何人都可以通过捕捉并分享自己的 procedural knowledge，用 composable capabilities 来 specialize their agents，而不是为每个 use case 构建碎片化、custom-designed agents。在这篇文章中，我们会解释 Skills 是什么，展示它们如何工作，并分享构建你自己的 Skills 的 best practices。

![A skill is a directory containing a SKILL.md file.](/images/blog/agent-skills-real-world/skill-directory.jpg)

Skill 是一个包含 SKILL.md 文件的 directory，其中包含由 instructions、scripts 和 resources 组成的有组织 folders，为 agents 提供额外 capabilities。

要看看 Skills 实际运行的样子，让我们走过一个真实例子：支撑 [Claude 最近发布的 document editing abilities](https://www.anthropic.com/news/create-files) 的 skills 之一。Claude 已经非常了解如何理解 PDFs，但直接操作 PDFs 的能力有限（例如填写表格）。这个 [PDF skill](https://github.com/anthropics/skills/tree/main/document-skills/pdf) 让我们可以赋予 Claude 这些新能力。

最简单地说，skill 是一个包含 `SKILL.md file` 的 directory。这个文件必须以 YAML frontmatter 开头，其中包含一些必需 metadata：`name` 和 `description`。启动时，agent 会把每个已安装 skill 的 `name` 和 `description` 预加载到它的 system prompt 中。

这些 metadata 是 *progressive disclosure* 的 **first level**：它提供刚好足够的信息，让 Claude 知道何时应该使用每个 skill，而无需把所有内容加载进 context。这个文件的实际 body 是 detail 的 **second level**。如果 Claude 认为该 skill 与当前 task 相关，它会通过把完整 `SKILL.md` 读入 context 来加载 skill。

![SKILL.md frontmatter.](/images/blog/agent-skills-real-world/skill-frontmatter.jpg)

SKILL.md 文件必须以 YAML Frontmatter 开头，其中包含 file name 和 description，它们会在 startup 时加载到 system prompt 中。

随着 skills 复杂度增加，它们可能包含太多 context，无法装入单个 `SKILL.md`，或者包含只在特定 scenarios 中相关的 context。在这些情况下，skills 可以在 skill directory 内捆绑 additional files，并从 `SKILL.md` 中按名称引用它们。这些 additional linked files 是 detail 的 **third level**（以及更深层），Claude 可以只在需要时选择 navigate 和 discover。

在下面展示的 PDF skill 中，`SKILL.md` 引用了两个 additional files（`reference.md` 和 `forms.md`），skill author 选择把它们与核心 `SKILL.md` 一起打包。通过把 form-filling instructions 移到单独文件（`forms.md`），skill author 能让 skill core 保持 lean，并相信 Claude 只会在填写 form 时读取 `forms.md`。

![Additional files in a skill.](/images/blog/agent-skills-real-world/additional-files.jpg)

你可以把更多 context（通过 additional files）纳入 skill，然后 Claude 可以基于 system prompt 触发这些 context。

Progressive disclosure 是让 Agent Skills 灵活且可扩展的核心设计原则。就像一本组织良好的 manual，先从 table of contents 开始，然后是具体 chapters，最后是详细 appendix，skills 让 Claude 只在需要时加载 information：

![Progressive disclosure of context in Skills.](/images/blog/agent-skills-real-world/progressive-disclosure.jpg)

这张图描绘了 Skills 中 context 的 progressive disclosure。

拥有 filesystem 和 code execution tools 的 agents，在处理特定 task 时，不需要把整个 skill 读入它们的 context window。这意味着可以打包进 skill 的 context 数量实际上是无界的。

下面的 diagram 展示了当用户 message 触发某个 skill 时，context window 如何变化。

![Skills are triggered in the context window.](/images/blog/agent-skills-real-world/context-window-trigger.jpg)

Skills 通过你的 system prompt 在 context window 中被触发。

图中展示的操作序列：

1. 首先，context window 包含 core system prompt、每个已安装 skill 的 metadata，以及用户的 initial message；
2. Claude 通过调用 Bash tool 读取 `pdf/SKILL.md` 的 contents，触发 PDF skill；
3. Claude 选择读取 skill 中捆绑的 `forms.md` 文件；
4. 最后，Claude 已从 PDF skill 加载 relevant instructions，于是继续处理用户 task。

Skills 也可以包含 code，让 Claude 根据判断作为 tools 执行。

Large language models 擅长许多 tasks，但某些 operations 更适合 traditional code execution。例如，通过 token generation 对列表排序，远比直接运行 sorting algorithm 昂贵得多。除了 efficiency concerns，许多 applications 还需要只有 code 才能提供的 deterministic reliability。

在我们的例子中，PDF skill 包含一个预写的 Python script，它会读取 PDF 并提取所有 form fields。Claude 可以运行这个 script，而无需把 script 或 PDF 加载进 context。并且因为 code 是 deterministic 的，这个 workflow 是 consistent 且 repeatable 的。

![Skills can include executable code.](/images/blog/agent-skills-real-world/executable-code.jpg)

Skills 也可以包含 code，让 Claude 根据 task 的性质自行判断是否作为 tools 执行。

下面是一些有助于开始 authoring 和 testing skills 的 guidelines：

- **从 evaluation 开始：** 通过在 representative tasks 上运行 agents，并观察它们在哪里遇到困难或需要 additional context，识别 agents capabilities 中的具体 gaps。然后增量构建 skills 来解决这些 shortcomings。
- **为 scale 设计结构：** 当 `SKILL.md` 文件变得难以管理时，把内容拆分到 separate files 中并引用它们。如果某些 contexts 是 mutually exclusive 或很少一起使用，保持 paths 分离会减少 token usage。最后，code 既可以作为 executable tools，也可以作为 documentation。应该清楚 Claude 是应该直接运行 scripts，还是把它们读入 context 作为 reference。
- **从 Claude 的视角思考：** 监控 Claude 在真实 scenarios 中如何使用你的 skill，并基于 observations 迭代：观察 unexpected trajectories 或对某些 contexts 的过度依赖。特别注意你的 skill 的 `name` 和 `description`。Claude 会在决定是否为当前 task 触发 skill 时使用它们。
- **与 Claude 一起迭代：** 当你和 Claude 一起处理 task 时，请 Claude 把它的成功方法和常见错误捕捉到 skill 内可复用的 context 和 code 中。如果它在使用 skill 完成 task 时偏离轨道，请它 self-reflect 出了什么问题。这个过程会帮助你发现 Claude 实际需要什么 context，而不是提前试图预判。

Skills 通过 instructions 和 code 为 Claude 提供新 capabilities。虽然这让它们很强大，但也意味着 malicious skills 可能在使用环境中引入 vulnerabilities，或指示 Claude exfiltrate data 并采取 unintended actions。

我们建议只从 trusted sources 安装 skills。当从 less-trusted source 安装 skill 时，在使用前要彻底 audit。先阅读 skill 中捆绑文件的 contents，理解它做什么，尤其注意 code dependencies 和 images 或 scripts 等 bundled resources。类似地，也要注意 skill 内指示 Claude 连接到潜在 untrusted external network sources 的 instructions 或 code。

Agent Skills 现在已在 [Claude.ai](http://claude.ai/redirect/website.v1.4098c51f-b051-4b00-83a6-d16f16f6be75)、Claude Code、Claude Agent SDK 和 Claude Developer Platform 上 [supported today](https://www.anthropic.com/news/skills)。

在接下来的几周里，我们会继续添加支持创建、编辑、发现、分享和使用 Skills 完整 lifecycle 的 features。我们尤其兴奋于 Skills 有机会帮助 organizations 和 individuals 与 Claude 分享他们的 context 和 workflows。我们也会探索 Skills 如何补充 [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) servers，方法是教 agents 掌握涉及 external tools 和 software 的更复杂 workflows。

展望更远，我们希望让 agents 能够自行创建、编辑和 evaluate Skills，让它们把自己的 behavior patterns codify 成 reusable capabilities。

Skills 是一个简单概念，也有相应简单的 format。这种 simplicity 让 organizations、developers 和 end users 更容易构建 customized agents，并赋予它们新 capabilities。

我们很期待看到人们用 Skills 构建什么。今天就可以查看我们的 Skills [docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) 和 [cookbook](https://github.com/anthropics/claude-cookbooks/tree/main/skills) 开始上手。

作者：Barry Zhang、Keith Lazuka 和 Mahesh Murag，他们都真的很喜欢 folders。特别感谢 Anthropic 内许多倡导、支持并构建 Skills 的其他人。
