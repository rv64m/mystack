---
title: "AI 系统中的 Contextual Retrieval"
date: 2026-05-16T08:30:00+08:00
slug: "contextual-retrieval"
tags: ["ai", "rag", "retrieval"]
series: "Agent Notes"
source_url: "https://www.anthropic.com/engineering/contextual-retrieval"
translationKey: "contextual-retrieval"
---

为了让 AI 模型在特定上下文中有用，它通常需要访问背景知识。例如，客户支持聊天机器人需要了解它所服务的具体业务，法律分析机器人则需要了解大量过往案例。

开发者通常使用 Retrieval-Augmented Generation（RAG）来增强 AI 模型的知识。RAG 是一种从知识库中检索相关信息，并将其附加到用户 prompt 中的方法，它能显著增强模型的回答。问题在于，传统 RAG 解决方案在编码信息时会移除上下文，这常常导致系统无法从知识库中检索到相关信息。

在这篇文章中，我们概述了一种能显著改善 RAG 检索步骤的方法。这个方法叫做“Contextual Retrieval”，使用两项子技术：Contextual Embeddings 和 Contextual BM25。这个方法可以将失败检索数量减少 49%，在结合 reranking 时减少 67%。这些代表了检索准确率的显著提升，而检索准确率会直接转化为下游任务中更好的表现。

你可以使用[我们的 cookbook](https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide)，轻松用 Claude 部署自己的 Contextual Retrieval 解决方案。

有时最简单的解决方案就是最好的。如果你的知识库小于 200,000 tokens（约 500 页材料），你可以直接把整个知识库放进给模型的 prompt 中，无需 RAG 或类似方法。

几周前，我们为 Claude 发布了 [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)，让这种方法显著更快且更具成本效益。开发者现在可以在 API 调用之间缓存频繁使用的 prompts，将延迟降低 2 倍以上，并将成本最多降低 90%（你可以阅读我们的 [prompt caching cookbook](https://platform.claude.com/cookbook/misc-prompt-caching) 了解它如何工作）。

然而，随着知识库增长，你会需要一个更可扩展的解决方案。这就是 Contextual Retrieval 登场的地方。

## RAG 入门：扩展到更大的知识库

对于无法放入上下文窗口的大型知识库，RAG 是典型解决方案。RAG 通过以下步骤预处理知识库：

1. 将知识库（文档“corpus”）拆成更小的文本 chunks，通常不超过几百个 tokens；
2. 使用 embedding model 将这些 chunks 转换为编码语义的 vector embeddings；
3. 将这些 embeddings 存储在 vector database 中，以便按语义相似度搜索。

在运行时，当用户向模型输入 query 时，vector database 会根据与 query 的语义相似度，找出最相关的 chunks。然后，最相关的 chunks 会被添加到发送给生成模型的 prompt 中。

虽然 embedding models 擅长捕捉语义关系，但它们可能会错过关键的精确匹配。幸运的是，有一种更老的技术可以在这些情况下提供帮助。BM25（Best Matching 25）是一种使用 lexical matching 来寻找精确单词或短语匹配的排序函数。它对包含唯一标识符或技术术语的 query 尤其有效。

BM25 建立在 TF-IDF（Term Frequency-Inverse Document Frequency）概念之上。TF-IDF 衡量一个词对集合中某个文档的重要性。BM25 通过考虑文档长度，并对词频应用饱和函数来 refine 这一点，这有助于防止常见词主导结果。

下面是 BM25 能在 semantic embeddings 失败之处成功的例子：假设用户在技术支持数据库中查询 “Error code TS-999”。Embedding model 可能会找到关于错误代码的一般内容，但可能错过精确的 “TS-999” 匹配。BM25 会寻找这个特定文本字符串，以识别相关文档。

RAG 解决方案可以通过以下步骤结合 embeddings 和 BM25 技术，更准确地检索最适用的 chunks：

1. 将知识库（文档 “corpus”）拆成更小的文本 chunks，通常不超过几百个 tokens；
2. 为这些 chunks 创建 TF-IDF encodings 和 semantic embeddings；
3. 使用 BM25 根据精确匹配找到 top chunks；
4. 使用 embeddings 根据语义相似度找到 top chunks；
5. 使用 rank fusion 技术合并并去重来自（3）和（4）的结果；
6. 将 top-K chunks 添加到 prompt 中以生成回答。

通过同时利用 BM25 和 embedding models，传统 RAG 系统可以提供更全面、更准确的结果，在精确术语匹配和更广泛的语义理解之间取得平衡。

![使用 embeddings 和 BM25 的标准 RAG 系统](/images/blog/contextual-retrieval/standard-rag.png)

一个标准 Retrieval-Augmented Generation（RAG）系统，同时使用 embeddings 和 Best Match 25（BM25）来检索信息。TF-IDF（term frequency-inverse document frequency）衡量词的重要性，并构成 BM25 的基础。

这种方法让你能够以具备成本效益的方式扩展到庞大知识库，远远超过单个 prompt 能容纳的规模。但这些传统 RAG 系统有一个重大限制：它们经常破坏上下文。

在传统 RAG 中，文档通常会被拆成较小 chunks 以便高效检索。虽然这种方法对许多应用效果很好，但当单个 chunks 缺乏足够上下文时，它可能导致问题。

例如，想象你的知识库中嵌入了一组财务信息（比如美国 SEC filings），并收到以下问题：*“What was the revenue growth for ACME Corp in Q2 2023?”*

一个相关 chunk 可能包含文本：*“The company's revenue grew by 3% over the previous quarter.”* 然而，这个 chunk 本身并没有说明它指的是哪家公司，也没有说明相关时间段，因此很难检索到正确的信息，或有效使用这条信息。

Contextual Retrieval 通过在 embedding 之前、以及创建 BM25 index 之前，给每个 chunk prepend 特定于该 chunk 的解释性上下文来解决这个问题，这分别称为 “Contextual Embeddings” 和 “Contextual BM25”。

让我们回到 SEC filings collection 的例子。下面是一个 chunk 可能如何被转换的例子：

```plain text
original_chunk = "The company's revenue grew by 3% over the previous quarter."

contextualized_chunk = "This chunk is from an SEC filing on ACME corp's performance in Q2 2023; the previous quarter's revenue was $314 million. The company's revenue grew by 3% over the previous quarter."
```

值得注意的是，此前也有人提出过其他使用上下文改善检索的方法。其他 proposals 包括：[向 chunks 添加通用文档摘要](https://aclanthology.org/W02-0405.pdf)（我们实验后看到收益非常有限）、[hypothetical document embedding](https://arxiv.org/abs/2212.10496)，以及 [summary-based indexing](https://www.llamaindex.ai/blog/a-new-document-summary-index-for-llm-powered-qa-systems-9a32ece2f9ec)（我们评估后看到性能较低）。这些方法不同于本文提出的方法。

当然，手动注释知识库中成千上万甚至数百万个 chunks 会需要太多工作。为了实现 Contextual Retrieval，我们转向 Claude。我们写了一个 prompt，指示模型使用整体文档上下文提供简洁的、特定于 chunk 的上下文，来解释该 chunk。我们使用以下 Claude 3 Haiku prompt 为每个 chunk 生成上下文：

```plain text
<document>
{{WHOLE_DOCUMENT}}
</document>
Here is the chunk we want to situate within the whole document
<chunk>
{{CHUNK_CONTENT}}
</chunk>
Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.
```

生成的 contextual text 通常为 50 到 100 tokens，会在 embedding 之前，以及创建 BM25 index 之前，被 prepend 到 chunk 前面。

下面是预处理流程在实践中的样子：

![Contextual Retrieval 预处理流程](/images/blog/contextual-retrieval/contextual-retrieval-preprocessing.png)

Contextual Retrieval 是一种改善检索准确率的预处理技术。

如果你有兴趣使用 Contextual Retrieval，可以从[我们的 cookbook](https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide) 开始。

得益于前面提到的特殊 prompt caching 功能，Contextual Retrieval 可以以很低成本通过 Claude 实现。有了 prompt caching，你不需要为每个 chunk 都传入参考文档。你只需把文档加载到 cache 一次，然后引用之前缓存的内容。假设 chunks 为 800 tokens、文档为 8k tokens、上下文指令为 50 tokens、每个 chunk 的上下文为 100 tokens，**生成 contextualized chunks 的一次性成本是每百万文档 tokens 1.02 美元**。

我们在各种知识领域（codebases、fiction、ArXiv papers、Science Papers）、embedding models、retrieval strategies 和 evaluation metrics 上进行了实验。我们在 [Appendix II](https://assets.anthropic.com/m/1632cded0a125333/original/Contextual-Retrieval-Appendix-2.pdf) 中包含了用于每个领域的一些问题和答案示例。

下面的图表展示了在所有知识领域上的平均表现，使用的是表现最好的 embedding 配置（Gemini Text 004），并检索 top-20-chunks。我们使用 1 minus recall@20 作为评估指标，它衡量的是相关文档未能在前 20 个 chunks 中被检索到的百分比。你可以在 appendix 中看到完整结果；在我们评估的每一种 embedding-source 组合中，contextualizing 都改善了表现。

我们的实验显示：

- **Contextual Embeddings 将 top-20-chunk 检索失败率降低了 35%**（5.7% → 3.7%）。
- **结合 Contextual Embeddings 和 Contextual BM25 将 top-20-chunk 检索失败率降低了 49%**（5.7% → 2.9%）。

![Contextual Embedding 和 Contextual BM25 的组合效果](/images/blog/contextual-retrieval/contextual-embedding-bm25-results.png)

结合 Contextual Embedding 和 Contextual BM25，将 top-20-chunk 检索失败率降低了 49%。

实现 Contextual Retrieval 时，有几个注意事项需要牢记：

1. **Chunk boundaries：** 考虑如何把文档拆分成 chunks。Chunk size、chunk boundary 和 chunk overlap 的选择会影响检索表现。
2. **Embedding model：** 虽然 Contextual Retrieval 改善了我们测试过的所有 embedding models 的表现，但一些模型可能比其他模型受益更多。我们发现 [Gemini](https://ai.google.dev/gemini-api/docs/embeddings) 和 [Voyage](https://www.voyageai.com/) embeddings 尤其有效。
3. **Custom contextualizer prompts：** 虽然我们提供的通用 prompt 效果很好，但你也许可以通过针对具体领域或 use case 定制的 prompts 获得更好结果（例如，包含一个 glossary，里面有只在知识库其他文档中定义的关键术语）。
4. **Number of chunks：** 向上下文窗口添加更多 chunks 会增加包含相关信息的机会。然而，更多信息可能会让模型分心，所以这里存在上限。我们尝试传递 5、10 和 20 个 chunks，并发现使用 20 个在这些选项中表现最好（见 appendix 中的比较），但值得在你的 use case 上实验。

**始终运行 evals：** 通过传入 contextualized chunk，并区分什么是 context、什么是 chunk，response generation 可能会得到改善。

最后一步，我们可以将 Contextual Retrieval 与另一项技术结合，以获得更大的性能提升。在传统 RAG 中，AI 系统会搜索其知识库，找到潜在相关的信息 chunks。对于大型知识库，这个初始检索通常会返回很多 chunks，有时是数百个，它们的相关性和重要性各不相同。

Reranking 是一种常用过滤技术，用于确保只有最相关的 chunks 被传给模型。Reranking 能提供更好的回答，并降低成本和延迟，因为模型需要处理的信息更少。关键步骤如下：

1. 执行初始检索，得到 top potentially relevant chunks（我们使用 top 150）；
2. 将 top-N chunks 与用户 query 一起传入 reranking model；
3. 使用 reranking model 根据每个 chunk 对 prompt 的相关性和重要性给它打分，然后选择 top-K chunks（我们使用 top 20）；
4. 将 top-K chunks 作为上下文传入模型，以生成最终结果。

![Contextual Retrieval 与 reranking 结合](/images/blog/contextual-retrieval/contextual-retrieval-reranking.png)

结合 Contextual Retrieval 和 Reranking，以最大化检索准确率。

市场上有几种 reranking models。我们使用 [Cohere reranker](https://cohere.com/rerank) 进行测试。Voyage [也提供 reranker](https://docs.voyageai.com/docs/reranker)，但我们没有时间测试。我们的实验显示，在各种领域中，添加 reranking 步骤会进一步优化检索。

具体来说，我们发现 Reranked Contextual Embedding 和 Contextual BM25 将 top-20-chunk 检索失败率降低了 67%（5.7% → 1.9%）。

![Reranked Contextual Embedding 和 Contextual BM25 的效果](/images/blog/contextual-retrieval/reranked-contextual-results.png)

Reranked Contextual Embedding 和 Contextual BM25 将 top-20-chunk 检索失败率降低了 67%。

Reranking 的一个重要考虑，是它对延迟和成本的影响，尤其是在对大量 chunks rerank 时。因为 reranking 在运行时增加了一个额外步骤，即使 reranker 会并行给所有 chunks 打分，它也不可避免地增加少量延迟。在为了更好表现而 rerank 更多 chunks，与为了更低延迟和成本而 rerank 更少 chunks 之间，存在固有权衡。我们建议在你的具体 use case 上尝试不同设置，以找到合适平衡。

我们进行了大量测试，比较了上面描述的所有技术的不同组合（embedding model、是否使用 BM25、是否使用 contextual retrieval、是否使用 reranker，以及检索的 top-K results 总数），并覆盖各种不同 dataset types。下面是我们发现的总结：

1. Embeddings+BM25 比单独使用 embeddings 更好；
2. Voyage 和 Gemini 是我们测试过的 embeddings 中表现最好的；
3. 向模型传入 top-20 chunks 比只传入 top-10 或 top-5 更有效；
4. 向 chunks 添加 context 会大幅改善检索准确率；
5. Reranking 比不 reranking 更好；
6. **所有这些收益可以叠加**：为了最大化性能提升，我们可以结合 contextual embeddings（来自 Voyage 或 Gemini）、contextual BM25、reranking 步骤，并向 prompt 添加 20 个 chunks。

我们鼓励所有处理知识库的开发者使用[我们的 cookbook](https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide) 来实验这些方法，解锁新的性能水平。

下面是按 datasets、embedding providers、是否在 embeddings 之外使用 BM25、是否使用 contextual retrieval，以及是否为 Retrievals @ 20 使用 reranking 进行拆解的结果。

另见 [Appendix II](https://assets.anthropic.com/m/1632cded0a125333/original/Contextual-Retrieval-Appendix-2.pdf)，其中包含 Retrievals @ 10 和 @ 5 的拆解，以及每个 dataset 的示例问题和答案。

![不同数据集和 embedding providers 上的 1 minus recall @ 20 结果](/images/blog/contextual-retrieval/recall-breakdown.png)

跨数据集和 embedding providers 的 1 minus recall @ 20 结果。

研究与写作：Daniel Ford。感谢 Orowa Sikder、Gautam Mittal 和 Kenneth Lien 提供关键反馈，Samuel Flamini 实现 cookbooks，Lauren Polansky 进行项目协调，以及 Alex Albert、Susan Payne、Stuart Ritchie 和 Brad Abrams 塑造这篇博客文章。
