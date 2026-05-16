---
title: "Claude Code 最佳实践"
date: 2026-05-16T06:30:00+08:00
slug: "claude-code-best-practices"
tags: ["ai", "claude-code", "agents", "workflow"]
series: "Agent Notes"
source_url: "https://code.claude.com/docs/en/best-practices"
translationKey: "claude-code-best-practices"
---

> **Documentation Index**
>
> 在 [https://code.claude.com/docs/llms.txt](https://code.claude.com/docs/llms.txt) 获取完整文档索引。
> 在进一步探索之前，请使用这个文件发现所有可用页面。

# Claude Code 最佳实践

> 从配置环境到扩展并行 sessions，帮助你最大化发挥 Claude Code 的提示和模式。

Claude Code 是一个 agentic coding environment。不同于回答问题然后等待的聊天机器人，Claude Code 可以读取你的文件、运行命令、进行修改，并在你观察、重定向或完全离开时自主处理问题。

这改变了你的工作方式。你不再是自己写代码并要求 Claude 审查，而是描述你想要什么，然后 Claude 弄清楚如何构建它。Claude 会探索、规划并实现。

但这种自主性仍然有学习曲线。Claude 在一些你需要理解的约束中工作。

本指南覆盖了一些已被证明有效的模式，这些模式来自 Anthropic 内部团队，以及在各种 codebases、languages 和 environments 中使用 Claude Code 的工程师。关于 agentic loop 在底层如何工作，请见 [How Claude Code works](https://www.notion.so/en/how-claude-code-works)。

---

大多数最佳实践都基于一个约束：Claude 的上下文窗口填得很快，而且随着填满，性能会下降。

Claude 的上下文窗口保存你的整个对话，包括每条消息、Claude 读取的每个文件，以及每个命令输出。然而，它可能很快填满。一次 debugging session 或 codebase exploration 可能会生成并消耗数万 tokens。

这很重要，因为随着上下文填满，LLM 性能会下降。当上下文窗口快满时，Claude 可能开始“忘记”早先指令，或犯更多错误。上下文窗口是最重要的管理资源。要了解 session 在实践中如何填满，可以[观看交互式 walkthrough](https://www.notion.so/en/context-window)，了解启动时加载了什么，以及每次文件读取消耗多少。用 [custom status line](https://www.notion.so/en/statusline) 持续跟踪上下文使用情况，并参阅 [Reduce token usage](https://www.notion.so/en/costs#reduce-token-usage) 获取减少 token 使用的策略。

---

## 给 Claude 一种验证自己工作的方式

> 包含测试、截图或预期输出，让 Claude 能检查自己。这是你能做的单个杠杆最高的事情。

当 Claude 能验证自己的工作时，它表现会显著更好，例如运行测试、比较截图和验证输出。

如果没有清晰的成功标准，它可能产出看起来正确但实际不可用的东西。你会成为唯一的反馈循环，每个错误都需要你的注意力。

| Strategy | Before | After |
| --- | --- | --- |
| **提供验证标准** | *“implement a function that validates email addresses”* | *“write a validateEmail function. example test cases: user@example.com is true, invalid is false, user@.com is false. run the tests after implementing”* |
| **可视化验证 UI 变更** | *“make the dashboard look better”* | *“[paste screenshot] implement this design. take a screenshot of the result and compare it to the original. list differences and fix them”* |
| **解决根因，而不是症状** | *“the build is failing”* | *“the build fails with this error: [paste error]. fix it and verify the build succeeds. address the root cause, don't suppress the error”* |

UI 变更可以使用 [Claude in Chrome extension](https://www.notion.so/en/chrome) 验证。它会在你的浏览器中打开新 tabs，测试 UI，并迭代直到代码可用。

你的验证也可以是 test suite、linter，或检查输出的 Bash command。投入精力让你的验证坚如磐石。

---

## 先探索，再规划，再编码

> 将研究和规划从实现中分离出来，避免解决错误的问题。

让 Claude 直接跳进编码，可能会产出解决错误问题的代码。使用 [plan mode](https://www.notion.so/en/permission-modes#analyze-before-you-edit-with-plan-mode) 将探索和执行分离。

推荐 workflow 有四个阶段：

### Explore

进入 plan mode。Claude 读取文件并回答问题，但不做修改。

```plain text
read /src/auth and understand how we handle sessions and login.
also look at how we manage environment variables for secrets.
```

### Plan

要求 Claude 创建详细实现计划。

```plain text
I want to add Google OAuth. What files need to change?
What's the session flow? Create a plan.
```

按 `Ctrl+G` 在文本编辑器中打开计划，以便在 Claude 继续之前直接编辑。

### Implement

退出 plan mode，让 Claude 编码，并对照计划验证。

```plain text
implement the OAuth flow from your plan. write tests for the
callback handler, run the test suite and fix any failures.
```

### Commit

要求 Claude 用描述性 message commit，并创建 PR。

```plain text
commit with a descriptive message and open a PR
```

> Plan mode 很有用，但也会增加开销。
>
> 对于 scope 清晰且 fix 很小的任务，例如修 typo、添加 log line、重命名变量，可以直接要求 Claude 做。
>
> 当你不确定方法、变更会修改多个文件，或你不熟悉要修改的代码时，planning 最有用。如果你能用一句话描述 diff，就跳过 plan。

---

## 在 prompt 中提供具体上下文

> 指令越精确，需要的纠正越少。

Claude 可以推断意图，但不能读心。引用具体文件、说明约束，并指向示例模式。

| Strategy | Before | After |
| --- | --- | --- |
| **限定任务范围。** 指定哪个文件、什么场景，以及测试偏好。 | *“add tests for foo.py”* | *“write a test for foo.py covering the edge case where the user is logged out. avoid mocks.”* |
| **指向来源。** 让 Claude 去能回答问题的来源。 | *“why does ExecutionFactory have such a weird api?”* | *“look through ExecutionFactory's git history and summarize how its api came to be”* |
| **引用现有模式。** 指向 codebase 中的模式。 | *“add a calendar widget”* | *“look at how existing widgets are implemented on the home page to understand the patterns. HotDogWidget.php is a good example. follow the pattern to implement a new calendar widget that lets the user select a month and paginate forwards/backwards to pick a year. build from scratch without libraries other than the ones already used in the codebase.”* |
| **描述症状。** 提供症状、可能位置，以及“修好”的样子。 | *“fix the login bug”* | *“users report that login fails after session timeout. check the auth flow in src/auth/, especially token refresh. write a failing test that reproduces the issue, then fix it”* |

当你在探索且可以承受 course-correct 时，模糊 prompts 也可能有用。像 `"what would you improve in this file?"` 这样的 prompt 可以浮现你没想到要问的东西。

### 提供丰富内容

> 使用 `@` 引用文件，粘贴截图/图片，或直接 pipe 数据。

你可以用几种方式向 Claude 提供丰富数据：

- **使用 `@` 引用文件**，而不是描述代码在哪里。Claude 会在回答前读取文件。
- **直接粘贴图片**。把图片 copy/paste 或 drag and drop 进 prompt。
- **提供 URLs** 用于文档和 API references。使用 `/permissions` allowlist 常用 domains。
- **Pipe in data**，例如运行 `cat error.log | claude` 直接发送文件内容。
- **让 Claude 获取自己需要的东西**。告诉 Claude 用 Bash commands、MCP tools 或读取文件自行拉取上下文。

---

## 配置你的环境

几个设置步骤会让 Claude Code 在所有 sessions 中显著更有效。关于 extension features 的完整概览以及何时使用每个功能，请见 [Extend Claude Code](https://www.notion.so/en/features-overview)。

### 编写有效的 [CLAUDE.md](http://claude.md/)

> 运行 `/init`，根据当前项目结构生成 starter [CLAUDE.md](http://claude.md/) 文件，然后随时间 refine。

[CLAUDE.md](http://claude.md/) 是一个特殊文件，Claude 会在每次对话开始时读取它。包含 Bash commands、code style 和 workflow rules。这为 Claude 提供了仅凭代码无法推断的持久上下文。

`/init` 命令会分析你的 codebase，检测 build systems、test frameworks 和 code patterns，为你提供一个可 refine 的坚实基础。

[CLAUDE.md](http://claude.md/) 文件没有必需格式，但要保持短小、易读。例如：

```markdown
# Code style
- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')

# Workflow
- Be sure to typecheck when you're done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance
```

[CLAUDE.md](http://claude.md/) 每个 session 都会加载，所以只包含广泛适用的内容。对于只在某些时候相关的领域知识或 workflows，请改用 [skills](https://www.notion.so/en/skills)。Claude 会按需加载它们，而不会膨胀每次对话。

保持简洁。对每一行，问自己：*“如果移除这行，会导致 Claude 犯错吗？”* 如果不会，就删掉。臃肿的 [CLAUDE.md](http://claude.md/) 文件会导致 Claude 忽略你的实际指令。

| ✅ Include | ❌ Exclude |
| --- | --- |
| Claude 无法猜到的 Bash commands | Claude 可以通过读代码弄清楚的任何东西 |
| 不同于默认值的 code style rules | Claude 已经知道的标准语言惯例 |
| Testing instructions 和偏好的 test runners | 详细 API 文档（改为链接到 docs） |
| Repository etiquette（branch naming、PR conventions） | 频繁变化的信息 |
| 项目特定架构决策 | 长解释或 tutorials |
| Developer environment quirks（必需 env vars） | codebase 的逐文件描述 |
| 常见 gotchas 或不显而易见的行为 | “write clean code” 这类显而易见实践 |

如果 Claude 反复做你不想要的事，即使文件里有规则，文件可能太长，规则被淹没了。如果 Claude 问的问题在 [CLAUDE.md](http://claude.md/) 中已有答案，措辞可能有歧义。把 [CLAUDE.md](http://claude.md/) 当作代码：出问题时审查它，定期修剪，并通过观察 Claude 行为是否真的改变来测试变更。

你可以通过添加强调（例如 “IMPORTANT” 或 “YOU MUST”）来改善指令遵循。把 [CLAUDE.md](http://claude.md/) check into git，这样团队可以共同贡献。这个文件会随时间累积价值。

[CLAUDE.md](http://claude.md/) 文件可以使用 `@path/to/import` 语法导入其他文件：

```markdown
See @README.md for project overview and @package.json for available npm commands.

# Additional Instructions
- Git workflow: @docs/git-instructions.md
- Personal overrides: @~/.claude/my-project-instructions.md
```

你可以把 [CLAUDE.md](http://claude.md/) 文件放在几个位置：

- **Home folder（`~/.claude/CLAUDE.md`）**：应用于所有 Claude sessions
- **Project root（`./CLAUDE.md`）**：check into git，与团队共享
- **Project root（`./CLAUDE.local.md`）**：个人项目特定 notes；把这个文件加入 `.gitignore`，避免与团队共享
- **Parent directories**：对 monorepos 很有用，`root/CLAUDE.md` 和 `root/foo/CLAUDE.md` 都会被自动拉入
- **Child directories**：Claude 在处理这些目录中的文件时，会按需拉入 child [CLAUDE.md](http://claude.md/) files

### 配置权限

> 使用 [auto mode](https://www.notion.so/en/permission-modes#eliminate-prompts-with-auto-mode) 让 classifier 处理批准，使用 `/permissions` allowlist 特定命令，或使用 `/sandbox` 做 OS-level isolation。每种方式都能减少中断，同时让你保持控制。

默认情况下，Claude Code 会为可能修改系统的动作请求许可：文件写入、Bash commands、MCP tools 等。这很安全，但也繁琐。第十次批准之后，你其实不再真的审查，只是在一路点击。减少这些中断有三种方法：

- **Auto mode**：一个独立 classifier model 审查命令，只阻止看起来有风险的内容：scope escalation、unknown infrastructure，或 hostile-content-driven actions。适合你信任任务大方向，但不想每一步都点击时使用。
- **Permission allowlists**：允许你知道安全的特定工具，例如 `npm run lint` 或 `git commit`。
- **Sandboxing**：启用 OS-level isolation，限制 filesystem 和 network access，让 Claude 在定义好的边界内更自由地工作。

阅读更多关于 [permission modes](https://www.notion.so/en/permission-modes)、[permission rules](https://www.notion.so/en/permissions) 和 [sandboxing](https://www.notion.so/en/sandboxing) 的内容。

### 使用 CLI 工具

> 当与外部服务交互时，告诉 Claude Code 使用 `gh`、`aws`、`gcloud` 和 `sentry-cli` 等 CLI tools。

CLI tools 是与外部服务交互时最节省上下文的方式。如果你使用 GitHub，请安装 `gh` CLI。Claude 知道如何用它创建 issues、打开 pull requests 和读取 comments。没有 `gh` 时，Claude 仍然可以使用 GitHub API，但未经认证的请求经常碰到 rate limits。

Claude 也能有效学习它还不知道的 CLI tools。试试这样的 prompt：`Use 'foo-cli-tool --help' to learn about foo tool, then use it to solve A, B, C.`

### 连接 MCP servers

> 运行 `claude mcp add` 连接外部工具，例如 Notion、Figma 或你的数据库。

通过 [MCP servers](https://www.notion.so/en/mcp)，你可以要求 Claude 从 issue trackers 实现 features、查询数据库、分析 monitoring data、集成来自 Figma 的设计，以及自动化 workflows。

### 设置 hooks

> 对于每次都必须发生、没有例外的动作，使用 hooks。

[Hooks](https://www.notion.so/en/hooks-guide) 会在 Claude workflow 的特定点自动运行 scripts。不同于 [CLAUDE.md](http://claude.md/) 中的 advisory instructions，hooks 是确定性的，并保证动作发生。

Claude 可以为你写 hooks。试试这样的 prompts：*“Write a hook that runs eslint after every file edit”* 或 *“Write a hook that blocks writes to the migrations folder.”* 直接编辑 `.claude/settings.json` 可以手动配置 hooks，运行 `/hooks` 可以浏览已配置内容。

### 创建 skills

> 在 `.claude/skills/` 中创建 `SKILL.md` 文件，为 Claude 提供领域知识和可复用 workflows。

[Skills](https://www.notion.so/en/skills) 使用特定于项目、团队或领域的信息扩展 Claude 的知识。Claude 会在相关时自动应用它们，或者你可以用 `/skill-name` 直接调用。

通过在 `.claude/skills/` 中添加一个带 `SKILL.md` 的目录来创建 skill：

```markdown
---
name: api-conventions
description: REST API design conventions for our services
---
# API Conventions
- Use kebab-case for URL paths
- Use camelCase for JSON properties
- Always include pagination for list endpoints
- Version APIs in the URL path (/v1/, /v2/)
```

Skills 也可以定义你直接调用的 repeatable workflows：

```markdown
---
name: fix-issue
description: Fix a GitHub issue
disable-model-invocation: true
---
Analyze and fix the GitHub issue: $ARGUMENTS.

1. Use `gh issue view` to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Implement the necessary changes to fix the issue
5. Write and run tests to verify the fix
6. Ensure code passes linting and type checking
7. Create a descriptive commit message
8. Push and create a PR
```

运行 `/fix-issue 1234` 来调用它。对于有副作用、希望手动触发的 workflows，使用 `disable-model-invocation: true`。

### 创建 custom subagents

> 在 `.claude/agents/` 中定义 specialized assistants，让 Claude 可以为 isolated tasks 委派它们。

[Subagents](https://www.notion.so/en/sub-agents) 在自己的上下文中运行，并拥有自己的一组 allowed tools。它们适合需要读取许多文件，或需要专门聚焦而不污染主对话的任务。

```markdown
---
name: security-reviewer
description: Reviews code for security vulnerabilities
tools: Read, Grep, Glob, Bash
model: opus
---
You are a senior security engineer. Review code for:
- Injection vulnerabilities (SQL, XSS, command injection)
- Authentication and authorization flaws
- Secrets or credentials in code
- Insecure data handling

Provide specific line references and suggested fixes.
```

明确告诉 Claude 使用 subagents：*“Use a subagent to review this code for security issues.”*

### 安装 plugins

> 运行 `/plugin` 浏览 marketplace。Plugins 会添加 skills、tools 和 integrations，无需配置。

[Plugins](https://www.notion.so/en/plugins) 会把 skills、hooks、subagents 和 MCP servers 打包成来自社区和 Anthropic 的单个可安装单元。如果你使用 typed language，请安装 [code intelligence plugin](https://www.notion.so/en/discover-plugins#code-intelligence)，为 Claude 提供精确 symbol navigation，并在编辑后自动检测错误。

关于如何在 skills、subagents、hooks 和 MCP 之间选择，请见 [Extend Claude Code](https://www.notion.so/en/features-overview#match-features-to-your-goal)。

---

## 有效沟通

你与 Claude Code 沟通的方式，会显著影响结果质量。

### 提代码库问题

> 像问高级工程师一样问 Claude 问题。

当 onboarding 到新 codebase 时，使用 Claude Code 学习和探索。你可以问 Claude 那些会问其他工程师的问题：

- Logging 是如何工作的？
- 我如何创建一个新的 API endpoint？
- `foo.rs` 第 134 行的 `async move { ... }` 是什么意思？
- `CustomerOnboardingFlowImpl` 处理了哪些 edge cases？
- 为什么这段代码在第 333 行调用 `foo()` 而不是 `bar()`？

这样使用 Claude Code 是一种有效的 onboarding workflow，可以缩短 ramp-up time，并减轻其他工程师负担。无需特殊 prompting：直接提问。

### 让 Claude 采访你

> 对于较大的 features，先让 Claude 采访你。用最小 prompt 开始，并要求 Claude 使用 `AskUserQuestion` 工具采访你。

Claude 会询问你可能还没考虑的东西，包括技术实现、UI/UX、edge cases 和 tradeoffs。

```plain text
I want to build [brief description]. Interview me in detail using the AskUserQuestion tool.

Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs. Don't ask obvious questions, dig into the hard parts I might not have considered.

Keep interviewing until we've covered everything, then write a complete spec to SPEC.md.
```

Spec 完成后，启动一个新 session 来执行它。新 session 会有干净上下文，完全聚焦于实现，而你有一份可引用的书面 spec。

---

## 管理你的 session

对话是持久且可逆的。利用这一点。

### 尽早且经常 course-correct

> 一旦注意到 Claude 偏离轨道，就纠正它。

最好的结果来自紧密反馈循环。虽然 Claude 偶尔可以第一次就完美解决问题，但快速纠正它通常会更快地产生更好的方案。

- **`Esc`**：用 `Esc` 键中途停止 Claude。上下文会保留，所以你可以重定向。
- **`Esc + Esc` 或 `/rewind`**：按两次 `Esc` 或运行 `/rewind`，打开 rewind menu，恢复之前的对话和代码状态，或从选定消息总结。
- **`"Undo that"`**：让 Claude revert 它的变更。
- **`/clear`**：在不相关任务之间重置上下文。带无关上下文的长 sessions 会降低性能。

如果你在一个 session 中针对同一个问题纠正 Claude 超过两次，上下文已经被失败方法弄乱了。运行 `/clear`，并用一个结合了你学到内容的更具体 prompt 重新开始。带更好 prompt 的干净 session 几乎总是胜过积累了纠正的长 session。

### 激进管理上下文

> 在不相关任务之间运行 `/clear` 来重置上下文。

当你接近上下文限制时，Claude Code 会自动 compact 对话历史，在释放空间的同时保留重要代码和决策。

在长 sessions 中，Claude 的上下文窗口可能填满无关对话、文件内容和命令。这会降低性能，有时会分散 Claude 注意力。

- 经常在任务之间使用 `/clear`，完全重置上下文窗口。
- 当 auto compaction 触发时，Claude 会总结最重要内容，包括 code patterns、file states 和 key decisions。
- 如需更多控制，运行 `/compact <instructions>`，例如 `/compact Focus on the API changes`。
- 要只 compact 对话的一部分，使用 `Esc + Esc` 或 `/rewind`，选择 message checkpoint，然后选择 **Summarize from here** 或 **Summarize up to here**。前者压缩从该点往后的消息，同时保留早先上下文完整；后者压缩更早消息，同时完整保留最近消息。见 [Restore vs. summarize](https://www.notion.so/en/checkpointing#restore-vs-summarize)。
- 在 [CLAUDE.md](http://claude.md/) 中用类似 `"When compacting, always preserve the full list of modified files and any test commands"` 的指令自定义 compaction behavior，确保关键上下文在总结中幸存。
- 对于不需要留在上下文中的快速问题，使用 [`/btw`](https://www.notion.so/en/interactive-mode#side-questions-with-%2Fbtw)。答案会出现在可关闭 overlay 中，永远不会进入对话历史，所以你可以检查细节而不增长上下文。

### 使用 subagents 做调查

> 用 `"use subagents to investigate X"` 委派研究。它们在单独上下文中探索，让主对话保持干净以便实现。

因为上下文是你的根本约束，subagents 是最强大的可用工具之一。当 Claude 研究 codebase 时，它会读取大量文件，这些都会消耗你的上下文。Subagents 在单独上下文窗口中运行，并回报总结：

```plain text
Use subagents to investigate how our authentication system handles token
refresh, and whether we have any existing OAuth utilities I should reuse.
```

Subagent 会探索 codebase、读取相关文件，并回报发现，而不会污染你的主对话。

你也可以在 Claude 实现某些东西后，用 subagents 做验证：

```plain text
use a subagent to review this code for edge cases
```

### 用 checkpoints rewind

> 你发送的每个 prompt 都会创建一个 checkpoint。你可以把对话、代码或二者恢复到任何早先 checkpoint。

Claude 会在每次变更前自动 snapshot 文件，所以 checkpoint 可以恢复它们。双击 `Escape` 或运行 `/rewind` 打开 rewind menu。你可以只恢复对话、只恢复代码、恢复二者，或从选定消息总结。详情见 [Checkpointing](https://www.notion.so/en/checkpointing)。

你不必小心规划每一步，而可以让 Claude 尝试一些有风险的东西。如果不奏效，rewind 并尝试不同方法。Checkpoints 跨 sessions 持久存在，所以你可以关闭终端后稍后仍然 rewind。

> Warning：Checkpoints 只跟踪 *Claude* 做出的变更，不跟踪外部进程。这不能替代 git。

### 恢复 conversations

> 用 `/rename` 命名 sessions，并把它们当作 branches：每个 workstream 都有自己的持久上下文。

Claude Code 会在本地保存 conversations，所以当任务跨越多次坐下工作时，你不必重新解释上下文。运行 `claude --continue` 接上最近 session，或运行 `claude --resume` 从列表中选择。给 sessions 起描述性名字，例如 `oauth-migration`，方便以后找到。关于完整 resume、branch 和 naming controls，见 [Manage sessions](https://www.notion.so/en/sessions)。

---

## 自动化和扩展

一旦你能高效使用一个 Claude，就用 parallel sessions、non-interactive mode 和 fan-out patterns 放大产出。

到目前为止的一切，都假设一个人、一个 Claude、一次对话。但 Claude Code 可以水平扩展。本节技术展示如何完成更多工作。

### 运行 non-interactive mode

> 在 CI、pre-commit hooks 或 scripts 中使用 `claude -p "prompt"`。添加 `--output-format stream-json` 获取 streaming JSON output。

通过 `claude -p "your prompt"`，你可以非交互式运行 Claude，而不启动 session。[Non-interactive mode](https://www.notion.so/en/headless) 是把 Claude 集成进 CI pipelines、pre-commit hooks 或任何 automated workflow 的方式。输出格式让你可以程序化解析结果：plain text、JSON 或 streaming JSON。

```bash
# One-off queries
claude -p "Explain what this project does"

# Structured output for scripts
claude -p "List all API endpoints" --output-format json

# Streaming for real-time processing
claude -p "Analyze this log file" --output-format stream-json
```

### 运行多个 Claude sessions

> 并行运行多个 Claude sessions，以加速开发、运行 isolated experiments，或启动复杂 workflows。

选择适合你希望自己做多少协调工作的并行方式：

- [Worktrees](https://www.notion.so/en/worktrees)：在 isolated git checkouts 中运行独立 CLI sessions，避免 edits 冲突。
- [Desktop app](https://www.notion.so/en/desktop#work-in-parallel-with-sessions)：以可视化方式管理多个本地 sessions，每个 session 在自己的 worktree 中。
- [Claude Code on the web](https://www.notion.so/en/claude-code-on-the-web)：在 Anthropic-managed cloud infrastructure 的 isolated VMs 中运行 sessions。
- [Agent teams](https://www.notion.so/en/agent-teams)：通过 shared tasks、messaging 和 team lead 自动协调多个 sessions。

除了并行化工作，多个 sessions 也能启用面向质量的 workflows。Fresh context 会改善 code review，因为 Claude 不会偏向自己刚写的代码。

例如，使用 Writer/Reviewer 模式：

| Session A (Writer) | Session B (Reviewer) |
| --- | --- |
| `Implement a rate limiter for our API endpoints` |  |
|  | `Review the rate limiter implementation in @src/middleware/rateLimiter.ts. Look for edge cases, race conditions, and consistency with our existing middleware patterns.` |
| `Here's the review feedback: [Session B output]. Address these issues.` |  |

你也可以用类似方法处理 tests：让一个 Claude 写 tests，然后让另一个写通过测试的代码。

### 跨文件 fan out

> 循环任务，对每个任务调用 `claude -p`。使用 `--allowedTools` 为 batch operations 限定权限范围。

对于大型 migrations 或 analyses，你可以把工作分发到许多并行 Claude invocations：

### Generate a task list

让 Claude 列出所有需要迁移的文件，例如 `list all 2,000 Python files that need migrating`。

### Write a script to loop through the list

```bash
for file in $(cat files.txt); do
  claude -p "Migrate $file from React to Vue. Return OK or FAIL." \
    --allowedTools "Edit,Bash(git commit *)"
done
```

### Test on a few files, then run at scale

根据前 2 到 3 个文件中出的问题 refine prompt，然后在完整集合上运行。`--allowedTools` 标志会限制 Claude 能做什么，这在无人值守运行时很重要。

你也可以把 Claude 集成进现有 data/processing pipelines：

```bash
claude -p "<your prompt>" --output-format json | your_command
```

开发期间使用 `--verbose` 做 debugging，在生产中关闭。

### 用 auto mode 自主运行

对于带后台安全检查的不间断执行，使用 [auto mode](https://www.notion.so/en/permission-modes#eliminate-prompts-with-auto-mode)。Classifier model 会在命令运行前审查它们，阻止 scope escalation、unknown infrastructure 和 hostile-content-driven actions，同时让 routine work 不经提示继续。

```bash
claude --permission-mode auto -p "fix all lint errors"
```

对于带 `-p` 标志的 non-interactive runs，如果 classifier 反复阻止动作，auto mode 会 abort，因为没有用户可供 fallback。阈值见 [when auto mode falls back](https://www.notion.so/en/permission-modes#when-auto-mode-falls-back)。

---

## 避免常见失败模式

这些是常见错误。尽早识别它们可以节省时间：

- **Kitchen sink session。** 你从一个任务开始，然后问 Claude 一些不相关的东西，再回到第一个任务。上下文充满无关信息。

  > **Fix**：在不相关任务之间 `/clear`。

- **反复纠正。** Claude 做错了，你纠正它，它仍然错，你再次纠正。上下文被失败方法污染。

  > **Fix**：两次失败纠正后，`/clear`，并写一个更好的初始 prompt，把你学到的东西纳入其中。

- **过度指定的 [CLAUDE.md](http://claude.md/)。** 如果你的 [CLAUDE.md](http://claude.md/) 太长，Claude 会忽略其中一半，因为重要规则淹没在噪音中。

  > **Fix**：无情修剪。如果 Claude 没有这条指令也已经能正确做某事，就删除它或把它转成 hook。

- **Trust-then-verify gap。** Claude 产出一个看似合理但不处理 edge cases 的实现。

  > **Fix**：始终提供验证（tests、scripts、screenshots）。如果不能验证，就不要 ship。

- **Infinite exploration。** 你要求 Claude “investigate” 某件事，但没有限定范围。Claude 读取数百个文件，填满上下文。

  > **Fix**：窄范围限定 investigations，或使用 subagents，避免探索消耗主上下文。

---

## 培养你的直觉

本指南中的模式并非一成不变。它们是通常有效的起点，但不一定适用于每种情况。

有时你*应该*让上下文累积，因为你深处一个复杂问题中，历史很有价值。有时你应该跳过 planning，让 Claude 自己弄清楚，因为任务是探索性的。有时模糊 prompt 正是正确选择，因为你想先看 Claude 如何理解问题，再约束它。

关注什么有效。当 Claude 产出很棒的结果时，注意你做了什么：prompt structure、你提供的上下文、你处于的模式。当 Claude 挣扎时，问为什么。上下文太吵了吗？Prompt 太模糊了吗？任务太大，无法一次完成吗？

随着时间推移，你会形成任何指南都无法捕捉的直觉。你会知道什么时候该具体，什么时候该开放；什么时候该 plan，什么时候该 explore；什么时候该 clear context，什么时候该让它累积。

## 相关资源

- [How Claude Code works](https://www.notion.so/en/how-claude-code-works)：agentic loop、tools 和 context management
- [Extend Claude Code](https://www.notion.so/en/features-overview)：skills、hooks、MCP、subagents 和 plugins
- [Common workflows](https://www.notion.so/en/common-workflows)：debugging、testing、PRs 等的 step-by-step recipes
- [CLAUDE.md](https://www.notion.so/en/memory)：存储项目惯例和持久上下文
