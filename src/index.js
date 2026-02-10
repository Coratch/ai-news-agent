import ora from 'ora';
import { loadConfig } from './config.js';
import { fetchAllFeeds } from './feeds.js';
import { extractContent } from './extractor.js';
import { quickFilter, deepAnalyze } from './analyzer.js';
import { filterNew, markProcessed, closeDb } from './storage.js';
import { printResults, generateMarkdownReport, generateHtmlReport } from './output.js';
import { exec } from 'child_process';

/**
 * dry-run 模式：基于关键词做本地匹配 + mock 分析
 */
function localKeywordMatch(articles, topics) {
  const matched = [];
  for (const article of articles) {
    const text = `${article.title} ${article.summary}`.toLowerCase();
    for (const topic of topics) {
      const hit = topic.keywords.some(kw => text.includes(kw.toLowerCase()));
      if (hit) {
        matched.push({
          ...article,
          matchedTopic: topic,
          relevance: 0.8,
        });
        break;
      }
    }
  }
  return matched;
}

/**
 * 主流程：抓取 → 去重 → 筛选 → 分析 → 输出
 * @param {object} options - { dryRun: boolean }
 */
export async function run(options = {}) {
  const { dryRun = false } = options;

  // 检查 API Key（dry-run 模式跳过）
  const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  if (!dryRun) {
    if (provider === 'minimax' && !process.env.MINIMAX_API_KEY) {
      console.error('❌ 未设置 MINIMAX_API_KEY 环境变量');
      console.error('   请运行: export MINIMAX_API_KEY=your-api-key');
      console.error('   或使用 --dry-run 模式跳过 AI 分析');
      process.exit(1);
    }
    if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      console.error('❌ 未设置 ANTHROPIC_API_KEY 环境变量');
      console.error('   请运行: export ANTHROPIC_API_KEY=your-api-key');
      console.error('   或使用 --dry-run 模式跳过 AI 分析');
      process.exit(1);
    }
  }

  const config = loadConfig();
  const stats = { feedCount: config.feeds.length, totalArticles: 0, newArticles: 0 };

  if (dryRun) {
    console.log('🧪 Dry-run 模式: 使用本地关键词匹配，跳过 Claude API\n');
  }

  // Step 1: 抓取 RSS
  let spinner = ora('正在抓取 RSS 订阅源...').start();
  const articles = await fetchAllFeeds(config.feeds, config.claude.max_articles_per_run);
  stats.totalArticles = articles.length;
  spinner.succeed(`抓取完成: ${articles.length} 篇文章来自 ${config.feeds.length} 个源`);

  if (articles.length === 0) {
    console.log('没有抓取到任何文章，请检查 RSS 源配置');
    closeDb();
    return;
  }

  // Step 2: 去重
  spinner = ora('过滤已处理文章...').start();
  const newArticles = filterNew(articles);
  stats.newArticles = newArticles.length;
  spinner.succeed(`新增文章: ${newArticles.length} 篇 (已跳过 ${articles.length - newArticles.length} 篇)`);

  if (newArticles.length === 0) {
    console.log('没有新文章需要处理');
    closeDb();
    return;
  }

  // Step 3: 筛选
  let matched;
  if (dryRun) {
    spinner = ora(`本地关键词匹配 (${newArticles.length} 篇)...`).start();
    matched = localKeywordMatch(newArticles, config.topics);
    spinner.succeed(`关键词命中: ${matched.length} 篇`);
  } else {
    spinner = ora(`AI 正在筛选匹配文章 (${newArticles.length} 篇)...`).start();
    matched = await quickFilter(newArticles, config.topics, config.claude.model);
    spinner.succeed(`匹配命中: ${matched.length} 篇`);
  }

  if (matched.length === 0) {
    for (const a of newArticles) {
      markProcessed(a, null);
    }
    printResults([], stats);
    closeDb();
    return;
  }

  // Step 4: 深度分析
  spinner = ora(`分析 ${matched.length} 篇匹配文章...`).start();
  const results = [];

  for (let i = 0; i < matched.length; i++) {
    const article = matched[i];
    spinner.text = `分析 (${i + 1}/${matched.length}): ${article.title.slice(0, 40)}...`;

    if (dryRun) {
      // dry-run: 用 RSS 摘要做简单总结
      article.analysis = {
        titleZh: article.title,
        summary: article.summary.slice(0, 150) || '（RSS 摘要为空，需通过 AI 分析获取详情）',
        keyPoints: [`来源: ${article.feedName}`, `关键词匹配: ${article.matchedTopic.name}`],
        actionable: article.matchedTopic.priority === 'high',
        recommendation: article.matchedTopic.priority === 'high' ? '建议关注此文章详情' : '',
      };
    } else {
      const fullContent = await extractContent(article.link);
      article.fullContent = fullContent || article.summary;
      article.analysis = await deepAnalyze(article, config.claude.model);
    }

    results.push(article);
    markProcessed(article, article.analysis);
  }

  // 标记未匹配文章为已处理
  for (const a of newArticles) {
    if (!matched.find(m => m.link === a.link)) {
      markProcessed(a, null);
    }
  }

  spinner.succeed(`分析完成: ${results.length} 篇`);

  // Step 5: 输出
  if (config.output.terminal) {
    printResults(results, stats);
  }

  if (config.output.markdown?.enabled) {
    const reportPath = generateMarkdownReport(results, stats, config.output.markdown.dir);
    if (reportPath) {
      console.log(`📄 报告已保存: ${reportPath}`);
    }
  }

  if (config.output.html?.enabled !== false) {
    const htmlDir = config.output.html?.dir || config.output.markdown?.dir;
    if (htmlDir) {
      const htmlPath = generateHtmlReport(results, stats, htmlDir);
      if (htmlPath) {
        console.log(`🌐 HTML 报告已保存: ${htmlPath}`);
        if (config.output.html?.autoOpen !== false) {
          const openCmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32' ? 'start'
            : 'xdg-open';
          exec(`${openCmd} "${htmlPath}"`);
        }
      }
    }
  }

  closeDb();
  return results;
}
