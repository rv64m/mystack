---
title: "Claude 在 SWE-bench 上的表现"
date: 2026-05-16T07:30:00+08:00
slug: "claude-swe-bench-performance"
tags: ["ai", "agents", "coding", "swe-bench"]
series: "Agent Notes"
source_url: "https://www.anthropic.com/engineering/swe-bench-sonnet"
translationKey: "claude-swe-bench-performance"
---

![Claude SWE-bench Performance](/images/blog/claude-swe-bench-performance/hero.svg)

*我们的最新模型，升级版 [Claude 3.5 Sonnet](https://www.anthropic.com/news/3-5-models-and-computer-use)，在 SWE-bench Verified 这个软件工程评测上取得了 49% 的成绩，超过了此前 state-of-the-art 模型的 45%。这篇文章解释了我们围绕该模型构建的 “agent”，旨在帮助开发者从 Claude 3.5 Sonnet 中获得尽可能好的表现。*

[SWE-bench](https://www.swebench.com/) 是一个 AI evaluation benchmark，用来评估模型完成真实世界软件工程任务的能力。具体来说，它测试模型如何解决来自热门开源 Python repositories 的 GitHub issues。对于 benchmark 中的每个任务，AI 模型都会得到一个已经设置好的 Python 环境，以及该 issue 被解决之前的 repository checkout（本地工作副本）。随后，模型需要理解、修改并测试代码，再提交它提出的解决方案。

每个解决方案都会根据关闭原始 GitHub issue 的 pull request 中的真实 unit tests 进行评分。这会测试 AI 模型是否能够实现与该 PR 的原始人类作者相同的功能。

SWE-bench 评估的不只是孤立的 AI 模型，而是整个 “agent” 系统。在这个上下文中，“agent” 指的是 AI 模型及其周围软件 scaffolding 的组合。这个 scaffolding 负责生成输入模型的 prompts、解析模型输出以采取行动，并管理交互循环，其中模型上一次动作的结果会被整合进下一次 prompt。即使使用同一个底层 AI 模型，agent 在 SWE-bench 上的表现也可能因为 scaffolding 而显著不同。

还有许多其他 benchmark 会评估 Large Language Models 的编码能力，但 SWE-bench 因几个原因越来越受欢迎：

1. 它使用来自真实项目的真实工程任务，而不是竞赛或面试风格的问题；
2. 它还没有饱和，仍有大量改进空间。还没有模型在 SWE-bench Verified 上超过 50% 完成率（尽管更新版 Claude 3.5 Sonnet 在写作时达到了 49%）；
3. 它衡量的是整个 “agent”，而不是孤立模型。开源开发者和 startups 已经通过优化 scaffoldings，在同一个模型周围大幅提升表现。

注意，原始 SWE-bench dataset 包含一些如果没有 GitHub issue 之外的额外上下文就无法解决的任务（例如，需要返回特定错误消息）。[SWE-bench-Verified](https://openai.com/index/introducing-swe-bench-verified/) 是 SWE-bench 的一个 500 问题子集，已经由人类审查以确保问题可解，因此为 coding agents 的表现提供了最清晰的衡量。本文中我们会引用这个 benchmark。

## 实现 state-of-the-art

在创建针对更新版 Claude 3.5 Sonnet 优化的 agent scaffold 时，我们的设计哲学是把尽可能多的控制权交给语言模型本身，并让 scaffolding 保持最小。这个 agent 有一个 prompt、一个用于执行 bash 命令的 Bash Tool，以及一个用于查看和编辑文件与目录的 Edit Tool。我们持续采样，直到模型决定自己已经完成，或超过其 200k context length。这个 scaffold 允许模型使用自己的判断来决定如何处理问题，而不是被 hardcode 进某个特定模式或 workflow。

Prompt 为模型概述了一个建议方法，但对于这个任务来说并不太长，也不过分详细。模型可以自由选择如何从一步移动到下一步，而不是拥有严格且离散的转换。如果你对 token 不敏感，明确鼓励模型产出长回答会有所帮助。

下面的代码展示了我们 agent scaffold 中的 prompt：

```plain text
<uploaded_files>
{location}
</uploaded_files>
I've uploaded a python code repository in the directory {location} (not in /tmp/inputs). Consider the following PR description:

<pr_description>
{pr_description}
</pr_description>

Can you help me implement the necessary changes to the repository so that the requirements specified in the <pr_description> are met?
I've already taken care of all changes to any of the test files described in the <pr_description>. This means you DON'T have to modify the testing logic or any of the tests in any way!

Your task is to make the minimal changes to non-tests files in the {location} directory to ensure the <pr_description> is satisfied.

Follow these steps to resolve the issue:
1. As a first step, it might be a good idea to explore the repo to familiarize yourself with its structure.
2. Create a script to reproduce the error and execute it with `python <filename.py>` using the BashTool, to confirm the error
3. Edit the sourcecode of the repo to resolve the issue
4. Rerun your reproduce script and confirm that the error is fixed!
5. Think about edgecases and make sure your fix handles them as well

Your thinking should be thorough and so it's fine if it's very long.
```

模型的第一个工具执行 Bash 命令。Schema 很简单，只接收要在环境中运行的命令。然而，工具描述承载了更多重量。它包含给模型的更详细说明，包括输入转义、没有互联网访问权限，以及如何在后台运行命令。

接下来，我们展示 Bash Tool 的 spec：

```plain text
{
   "name": "bash",
   "description": "Run commands in a bash shell\n\n* When invoking this tool, the contents of the \"command\" parameter does NOT need to be XML-escaped.\n\n* You don't have access to the internet via this tool.\n\n* You do have access to a mirror of common linux and python packages via apt and pip.\n\n* State is persistent across command calls and discussions with the user.\n\n* To inspect a particular line range of a file, e.g. lines 10-25, try 'sed -n 10,25p /path/to/the/file'.\n\n* Please avoid commands that may produce a very large amount of output.\n\n* Please run long lived commands in the background, e.g. 'sleep 10 &' or start a server in the background.",
   "input_schema": {
       "type": "object",
       "properties": {
           "command": {
               "type": "string",
               "description": "The bash command to run."
           }
       },
       "required": ["command"]
   }
}
```

模型的第二个工具（Edit Tool）复杂得多，包含模型查看、创建和编辑文件所需的一切。同样，我们的工具描述也包含了给模型的详细信息，说明如何使用该工具。

我们在这些工具的 descriptions 和 specs 上投入了大量精力，并跨各种 agentic tasks 进行打磨。我们测试它们，以发现模型可能误解 spec 的方式，或使用工具时可能遇到的 pitfalls，然后编辑 descriptions 来预先避免这些问题。我们认为，设计面向模型的 tool interfaces 应该得到更多关注，就像人们会投入大量注意力设计面向人类的 tool interfaces 一样。

下面的代码展示了我们 Edit Tool 的 description：

```plain text
{
   "name": "str_replace_editor",
   "description": "Custom editing tool for viewing, creating and editing files\n\n* State is persistent across command calls and discussions with the user\n\n* If `path` is a file, `view` displays the result of applying `cat -n`. If `path` is a directory, `view` lists non-hidden files and directories up to 2 levels deep\n\n* The `create` command cannot be used if the specified `path` already exists as a file\n\n* If a `command` generates a long output, it will be truncated and marked with `<response clipped>` \n\n* The `undo_edit` command will revert the last edit made to the file at `path`\n\n\n\nNotes for using the `str_replace` command:\n\n* The `old_str` parameter should match EXACTLY one or more consecutive lines from the original file. Be mindful of whitespaces!\n\n* If the `old_str` parameter is not unique in the file, the replacement will not be performed. Make sure to include enough context in `old_str` to make it unique\n\n* The `new_str` parameter should contain the edited lines that should replace the `old_str`",
...
```

我们提升表现的一种方式，是对工具进行“error-proof”。例如，有时在 agent 离开 root directory 后，模型会弄错相对文件路径。为了防止这一点，我们简单地让工具始终要求绝对路径。

我们尝试了几种指定对现有文件进行编辑的策略，并发现 string replacement 可靠性最高。在这种方式中，模型指定要在给定文件中用 `new_str` 替换的 `old_str`。只有当 `old_str` 恰好有一个匹配项时，替换才会发生。如果匹配项多于或少于一个，模型会看到相应错误消息，以便它重试。

下面展示了我们 Edit Tool 的 spec：

```plain text
...
   "input_schema": {
       "type": "object",
       "properties": {
           "command": {
               "type": "string",
               "enum": ["view", "create", "str_replace", "insert", "undo_edit"],
               "description": "The commands to run. Allowed options are: `view`, `create`, `str_replace`, `insert`, `undo_edit`."
           },
           "file_text": {
               "description": "Required parameter of `create` command, with the content of the file to be created.",
               "type": "string"
           },
           "insert_line": {
               "description": "Required parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`.",
               "type": "integer"
           },
           "new_str": {
               "description": "Required parameter of `str_replace` command containing the new string. Required parameter of `insert` command containing the string to insert.",
               "type": "string"
           },
           "old_str": {
               "description": "Required parameter of `str_replace` command containing the string in `path` to replace.",
               "type": "string"
           },
           "path": {
               "description": "Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.",
               "type": "string"
           },
           "view_range": {
               "description": "Optional parameter of `view` command when `path` points to a file. If none is given, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all lines from `start_line` to the end of the file.",
               "items": {
                   "type": "integer"
               },
               "type": "array"
           }
       },
       "required": ["command", "path"]
   }
}
```

总体而言，升级版 Claude 3.5 Sonnet 展现出比我们此前模型以及[此前 state-of-the-art](https://solverai.com/) 模型更高的推理、编码和数学能力。它也展现出改进后的 agentic capabilities：tools 和 scaffolding 帮助把这些提升后的能力用到最好。

为了运行 benchmark，我们使用 [SWE-Agent](https://swe-agent.com/) framework 作为 agent code 的基础。在下面的 logs 中，我们把 agent 的文本输出、工具调用和工具响应渲染为 THOUGHT、ACTION 和 OBSERVATION，即使我们并没有限制模型遵循固定顺序。

下面的代码块会走过一个 Sonnet 3.5 解决 SWE-bench 问题的典型案例。

在第一个 block 中，你可以看到给模型的初始 prompt 的一部分，其中 `\{pr_description\}` 被填入了 SWE-bench 任务中的真实值。重要的是，这个任务包含复现问题的步骤，这会给模型一个有价值的调查起点。

```plain text
<uploaded_files>
/repo
</uploaded_files>
I've uploaded a python code repository in the directory /repo (not in /tmp/inputs). Consider the following PR description:

<pr_description>
linear_model.RidgeClassifierCV's Parameter store_cv_values issue
#### Description
Parameter store_cv_values error on sklearn.linear_model.RidgeClassifierCV

#### Steps/Code to Reproduce
import numpy as np
from sklearn import linear_model as lm

#test database
n = 100
x = np.random.randn(n, 30)
y = np.random.normal(size = n)

rr = lm.RidgeClassifierCV(alphas = np.arange(0.1, 1000, 0.1), normalize = True,
                                         store_cv_values = True).fit(x, y)

#### Expected Results
Expected to get the usual ridge regression model output, keeping the cross validation predictions as attribute.

#### Actual Results
TypeError: __init__() got an unexpected keyword argument 'store_cv_values'

lm.RidgeClassifierCV actually has no parameter store_cv_values, even though some attributes depends on it.
```

模型响应后，首先使用 Edit Tool 查看 repository 结构。你可以在 THOUGHT 和 ACTION 下看到模型的文本输出和工具调用参数，在 OBSERVATION 下看到工具输出的一部分：

```plain text
THOUGHT:
I'll help you implement the changes to satisfy the PR description. Let's follow the steps you outlined.

1. First, let's explore the repo structure:
ACTION (str_replace_editor):
command:
view

path:
/repo

OBSERVATION:
Here's the files and directories up to 2 levels deep in /repo, excluding hidden items:
/repo
/repo/PULL_REQUEST_TEMPLATE.md
/repo/ISSUE_TEMPLATE.md
/repo/sklearn
/repo/sklearn/decomposition
/repo/sklearn/kernel_ridge.py
/repo/sklearn/model_selection
/repo/sklearn/covariance
/repo/sklearn/cluster
/repo/sklearn/base.py
/repo/sklearn/dummy.py
/repo/sklearn/naive_bayes.py
...
```

现在模型对 repository 结构有了更好理解，它使用 Edit Tool 创建了一个新脚本，用来复现问题并测试自己的修复：

```plain text
THOUGHT:
Based on the repository structure, we'll need to modify the Ridge Classifier in the `sklearn/linear_model` directory.

Let's create a script to reproduce the error:
ACTION (str_replace_editor):
command:
create

path:
/repo/reproduce_error.py

file_text:
import numpy as np
from sklearn import linear_model as lm

#test database
n = 100
x = np.random.randn(n, 30)
y = np.random.normal(size = n)

rr = lm.RidgeClassifierCV(alphas=np.arange(0.1, 1000, 0.1), normalize=True,
                         store_cv_values=True).fit(x, y)

OBSERVATION:
File created successfully at: /repo/reproduce_error.py
```

随后，模型使用 Bash Tool 执行它写的脚本，并成功复现了任务中的问题：

```plain text
THOUGHT:
Let's verify that we can reproduce the error:
ACTION (bash):
command:
python3 /repo/reproduce_error.py

OBSERVATION:
Traceback (most recent call last):
  File "/repo/reproduce_error.py", line 10, in <module>
    store_cv_values=True).fit(x, y)
TypeError: __init__() got an unexpected keyword argument 'store_cv_values'
```

从这里开始，模型使用 Edit Tool 修改 repository 中的源码，并重新运行自己的脚本，以验证变更是否解决了问题：

```plain text
THOUGHT:
The error is reproducible. Looking at the code, I can see that the issue is that while the `RidgeClassifierCV` class inherits from `_BaseRidgeCV`, it fails to pass the `store_cv_values` parameter from its constructor through to the base class constructor.

Let's fix this:
ACTION (str_replace_editor):
command:
str_replace

path:
/repo/sklearn/linear_model/ridge.py

old_str:
    def __init__(self, alphas=(0.1, 1.0, 10.0), fit_intercept=True,
                 normalize=False, scoring=None, cv=None, class_weight=None):
        super(RidgeClassifierCV, self).__init__(
            alphas=alphas, fit_intercept=fit_intercept, normalize=normalize,
            scoring=scoring, cv=cv)
        self.class_weight = class_weight

new_str:
    def __init__(self, alphas=(0.1, 1.0, 10.0), fit_intercept=True,
                 normalize=False, scoring=None, cv=None, class_weight=None,
                 store_cv_values=False):
        super(RidgeClassifierCV, self).__init__(
            alphas=alphas, fit_intercept=fit_intercept, normalize=normalize,
            scoring=scoring, cv=cv, store_cv_values=store_cv_values)
        self.class_weight = class_weight
```

在这个具体例子中，模型工作了 12 步，然后决定自己已经准备好提交。任务测试随后成功运行，验证了模型的解决方案确实处理了问题。有些任务在模型提交解决方案前花了超过 100 轮；在另一些任务中，模型一直尝试，直到耗尽上下文。

通过比较更新版 Claude 3.5 Sonnet 和旧模型的尝试，我们发现更新版 3.5 Sonnet 更常自我纠正。它也表现出尝试几种不同解决方案的能力，而不是卡在同一个错误上反复犯错。

SWE-bench Verified 是一个强大的评估，但运行起来也比简单的单轮 evals 更复杂。下面是我们在使用它时遇到的一些挑战，也是其他 AI 开发者可能遇到的挑战。

1. **持续时间和高 token 成本。** 上面的例子来自一个 12 步成功完成的案例。然而，许多成功运行需要模型花费数百轮才能解决，并消耗超过 100k tokens。更新版 Claude 3.5 Sonnet 很顽强：只要给它足够时间，它经常能自己绕开问题，但这可能很昂贵；
2. **评分。** 在检查失败任务时，我们发现有些情况下模型行为正确，但存在环境设置问题，或 install patches 被应用两次的问题。解决这些系统问题，对准确了解 AI agent 表现至关重要。
3. **隐藏测试。** 因为模型看不到评分所依据的 tests，它经常“认为”自己成功了，但任务实际上失败了。有些失败是因为模型在错误的抽象层级解决了问题（打补丁而不是做更深层重构）。另一些失败感觉不那么公平：它们解决了问题，但不匹配原始任务中的 unit tests。
4. **多模态。** 尽管更新版 Claude 3.5 Sonnet 拥有出色视觉和多模态能力，我们没有实现让它查看保存到 filesystem 的文件或以 URLs 引用的文件的方式。这让调试某些任务（尤其是来自 Matplotlib 的任务）特别困难，也容易出现模型 hallucinations。这里显然有一些 low-hanging fruit 可供开发者改进，而且 SWE-bench 已经推出了一个[专注于多模态任务的新 evaluation](https://www.swebench.com/multimodal.html)。我们期待看到开发者在不久的将来用 Claude 在这个 eval 上取得更高分数。

升级版 Claude 3.5 Sonnet 在 SWE-bench Verified 上取得 49% 的成绩，以一个简单 prompt 和两个 general purpose tools 超过了此前 state-of-the-art（45%）。我们相信，使用新版 Claude 3.5 Sonnet 构建的开发者，很快会找到新的、更好的方法，在我们这里初步展示的基础上进一步提升 SWE-bench 分数。

Erik Schluntz 优化了 SWE-bench agent 并撰写了这篇博客文章。Simon Biggs、Dawn Drain 和 Eric Christiansen 帮助实现了 benchmark。Shauna Kravec、Dawn Drain、Felipe Rosso、Nova DasSarma、Ven Chandrasekaran 以及许多其他人为训练 Claude 3.5 Sonnet，使其擅长 agentic coding 做出了贡献。
