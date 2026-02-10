import Anthropic from '@anthropic-ai/sdk';

let client = null;

/**
 * 获取 AI 客户端（支持 Anthropic / MiniMax 后端）
 *
 * MiniMax 通过 Anthropic SDK 兼容端点接入，只需切换 baseURL 和 apiKey。
 * 环境变量 AI_PROVIDER=minimax 时使用 MiniMax，否则默认 Anthropic。
 */
function getClient() {
  if (!client) {
    const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
    if (provider === 'minimax') {
      client = new Anthropic({
        baseURL: 'https://api.minimax.io/anthropic',
        apiKey: process.env.MINIMAX_API_KEY,
      });
    } else {
      client = new Anthropic();
    }
  }
  return client;
}

/**
 * 阶段1: 快速筛选 — 基于标题+摘要判断是否匹配用户关注点
 * 批量处理以减少 API 调用次数
 *
 * @param {Array} articles - 文章列表 [{title, summary, link, feedName}]
 * @param {Array} topics - 用户关注点 [{name, description, keywords, priority}]
 * @param {string} model
 * @returns {Array} 匹配的文章列表，附带 matchedTopic 和 relevance
 */
export async function quickFilter(articles, topics, model) {
  if (articles.length === 0 || topics.length === 0) return [];

  const topicsDesc = topics.map((t, i) =>
    `[${i}] ${t.name} (${t.priority}): ${t.description}\n    关键词: ${t.keywords.join(', ')}`
  ).join('\n');

  // 分批处理，每批 10 篇
  const batchSize = 10;
  const matched = [];

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const articlesDesc = batch.map((a, j) =>
      `[${j}] "${a.title}" (${a.feedName})\n    ${a.summary.slice(0, 200)}`
    ).join('\n\n');

    const prompt = `你是一个 AI 资讯筛选助手。请判断以下文章是否与用户关注的 topics 相关。

## 用户关注的 Topics
${topicsDesc}

## 待筛选文章
${articlesDesc}

## 输出要求
返回 JSON 数组，只包含匹配的文章。每个元素：
{"index": 文章序号, "topicIndex": 匹配的topic序号, "relevance": 0.0-1.0的相关度}

如果没有匹配的文章，返回空数组 []。
只返回 relevance >= 0.6 的结果。只输出 JSON，不要其他内容。`;

    try {
      const response = await getClient().messages.create({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0]?.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const results = JSON.parse(jsonMatch[0]);
      for (const r of results) {
        if (r.index >= 0 && r.index < batch.length && r.relevance >= 0.6) {
          matched.push({
            ...batch[r.index],
            matchedTopic: topics[r.topicIndex] || topics[0],
            relevance: r.relevance,
          });
        }
      }
    } catch (err) {
      console.error(`  筛选批次失败: ${err.message}`);
    }
  }

  return matched;
}

/**
 * 阶段2: 深度分析 — 对匹配的文章生成中文摘要
 *
 * @param {object} article - 文章 {title, link, feedName, matchedTopic, fullContent}
 * @param {string} model
 * @returns {object} {summary, keyPoints, actionable, recommendation}
 */
export async function deepAnalyze(article, model) {
  const content = article.fullContent || article.summary;
  const topic = article.matchedTopic;

  const prompt = `你是一个专业的 AI 技术资讯分析师。请对以下文章进行深度分析，重点关注与用户关注点的关联。

## 用户关注点
名称: ${topic.name}
描述: ${topic.description}

## 文章信息
标题: ${article.title}
来源: ${article.feedName}
内容:
${content}

## 输出要求
返回 JSON（只输出 JSON，不要其他内容）：
{
  "titleZh": "文章标题的中文翻译（若原标题已是中文则保持原样）",
  "summary": "150字以内的中文摘要，突出与用户关注点相关的内容",
  "keyPoints": ["关键点1", "关键点2", "关键点3"],
  "actionable": true/false（这个信息是否需要用户立即采取行动，如版本升级、功能试用等）,
  "recommendation": "一句话行动建议，如果 actionable 为 false 则为空字符串"
}`;

  try {
    const response = await getClient().messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { summary: '分析失败', keyPoints: [], actionable: false, recommendation: '' };
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`  分析失败 [${article.title}]: ${err.message}`);
    return { summary: '分析失败: ' + err.message, keyPoints: [], actionable: false, recommendation: '' };
  }
}
