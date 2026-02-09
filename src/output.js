import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const PRIORITY_COLORS = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.blue,
};

const PRIORITY_LABELS = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

/**
 * 终端输出匹配结果
 */
export function printResults(results, stats) {
  const now = new Date().toLocaleDateString('zh-CN');

  console.log('');
  console.log(chalk.bold('━'.repeat(50)));
  console.log(chalk.bold.cyan(`  AI 资讯日报 — ${now}`));
  console.log(chalk.gray(`  已扫描 ${stats.feedCount} 个源 | ${stats.totalArticles} 篇文章 | 新增 ${stats.newArticles} 篇 | 命中 ${results.length} 篇`));
  console.log(chalk.bold('━'.repeat(50)));

  if (results.length === 0) {
    console.log(chalk.gray('\n  暂无匹配的新文章\n'));
    return;
  }

  // 按 priority 分组
  const grouped = {};
  for (const r of results) {
    const priority = r.matchedTopic?.priority || 'low';
    if (!grouped[priority]) grouped[priority] = [];
    grouped[priority].push(r);
  }

  for (const priority of ['high', 'medium', 'low']) {
    const items = grouped[priority];
    if (!items?.length) continue;

    const colorFn = PRIORITY_COLORS[priority] || chalk.white;
    const label = PRIORITY_LABELS[priority] || priority;

    for (const item of items) {
      console.log('');
      console.log(colorFn(`  [${label}] ${item.matchedTopic?.name || '未分类'}`));
      console.log(chalk.bold(`  ${item.title}`));
      console.log(chalk.gray(`  来源: ${item.feedName} | ${formatDate(item.pubDate)}`));

      if (item.analysis) {
        console.log('');
        console.log(`  ${chalk.white(item.analysis.summary)}`);

        if (item.analysis.keyPoints?.length) {
          console.log('');
          for (const point of item.analysis.keyPoints) {
            console.log(chalk.cyan(`   • ${point}`));
          }
        }

        if (item.analysis.actionable && item.analysis.recommendation) {
          console.log('');
          console.log(chalk.green(`  → ${item.analysis.recommendation}`));
        }
      }

      console.log(chalk.gray(`  ${item.link}`));
      console.log(chalk.gray('  ' + '─'.repeat(46)));
    }
  }

  console.log('');
}

/**
 * 生成 Markdown 报告
 */
export function generateMarkdownReport(results, stats, outputDir) {
  if (!results.length) return null;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('zh-CN');

  let md = `# AI 资讯日报 — ${dateStr}\n\n`;
  md += `> 扫描 ${stats.feedCount} 个源 | ${stats.totalArticles} 篇文章 | 新增 ${stats.newArticles} 篇 | 命中 ${results.length} 篇 | 生成时间 ${timeStr}\n\n`;
  md += `---\n\n`;

  // 按 priority 分组
  const grouped = {};
  for (const r of results) {
    const priority = r.matchedTopic?.priority || 'low';
    if (!grouped[priority]) grouped[priority] = [];
    grouped[priority].push(r);
  }

  for (const priority of ['high', 'medium', 'low']) {
    const items = grouped[priority];
    if (!items?.length) continue;

    const emoji = { high: '🔴', medium: '🟡', low: '🔵' }[priority];
    const label = PRIORITY_LABELS[priority];

    for (const item of items) {
      md += `## ${emoji} [${label}] ${item.matchedTopic?.name || '未分类'}\n\n`;
      md += `### ${item.title}\n\n`;
      md += `**来源**: ${item.feedName} | **时间**: ${formatDate(item.pubDate)}\n\n`;

      if (item.analysis) {
        md += `**摘要**: ${item.analysis.summary}\n\n`;

        if (item.analysis.keyPoints?.length) {
          md += `**关键点**:\n`;
          for (const point of item.analysis.keyPoints) {
            md += `- ${point}\n`;
          }
          md += '\n';
        }

        if (item.analysis.actionable && item.analysis.recommendation) {
          md += `> 💡 **建议**: ${item.analysis.recommendation}\n\n`;
        }
      }

      md += `🔗 [阅读原文](${item.link})\n\n`;
      md += `---\n\n`;
    }
  }

  // 写入文件
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filePath = path.join(outputDir, `${dateStr}.md`);

  // 如果同一天多次运行，追加内容
  if (fs.existsSync(filePath)) {
    md = `\n\n---\n\n# 更新 (${timeStr})\n\n` + md.split('---\n\n').slice(1).join('---\n\n');
    fs.appendFileSync(filePath, md, 'utf-8');
  } else {
    fs.writeFileSync(filePath, md, 'utf-8');
  }

  return filePath;
}

function formatDate(dateStr) {
  if (!dateStr) return '未知时间';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}
