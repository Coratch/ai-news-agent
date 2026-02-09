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
      const displayTitle = item.analysis?.titleZh || item.title;
      console.log(colorFn(`  [${label}] ${item.matchedTopic?.name || '未分类'}`));
      console.log(chalk.bold(`  ${displayTitle}`));
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
      const displayTitle = item.analysis?.titleZh || item.title;
      md += `## ${emoji} [${label}] ${item.matchedTopic?.name || '未分类'}\n\n`;
      md += `### ${displayTitle}\n\n`;
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

/**
 * 生成精美 HTML 报告
 */
export function generateHtmlReport(results, stats, outputDir) {
  if (!results.length) return null;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('zh-CN');

  // 按 priority 分组
  const grouped = {};
  for (const r of results) {
    const priority = r.matchedTopic?.priority || 'low';
    if (!grouped[priority]) grouped[priority] = [];
    grouped[priority].push(r);
  }

  const priorityMeta = {
    high: { label: 'HIGH', emoji: '🔴', color: '#ef4444', bg: '#fef2f2', border: '#fecaca', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    medium: { label: 'MED', emoji: '🟡', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    low: { label: 'LOW', emoji: '🔵', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  };

  let cards = '';
  for (const priority of ['high', 'medium', 'low']) {
    const items = grouped[priority];
    if (!items?.length) continue;
    const meta = priorityMeta[priority];

    for (const item of items) {
      const displayTitle = item.analysis?.titleZh || item.title;
      const keyPointsHtml = item.analysis?.keyPoints?.length
        ? `<ul class="key-points">${item.analysis.keyPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
        : '';

      const recommendationHtml = item.analysis?.actionable && item.analysis?.recommendation
        ? `<div class="recommendation"><span class="rec-icon">💡</span><span>${escapeHtml(item.analysis.recommendation)}</span></div>`
        : '';

      cards += `
      <article class="card" style="border-left: 4px solid ${meta.color};">
        <div class="card-header">
          <span class="priority-badge" style="background: ${meta.gradient};">${meta.label}</span>
          <span class="topic-name">${escapeHtml(item.matchedTopic?.name || '未分类')}</span>
        </div>
        <h2 class="card-title">${escapeHtml(displayTitle)}</h2>
        <div class="card-meta">
          <span class="meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>${escapeHtml(item.feedName)}</span>
          <span class="meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${formatDate(item.pubDate)}</span>
        </div>
        ${item.analysis?.summary ? `<p class="summary">${escapeHtml(item.analysis.summary)}</p>` : ''}
        ${keyPointsHtml}
        ${recommendationHtml}
        <a class="read-more" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
          阅读原文 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </article>`;
    }
  }

  const totalHigh = grouped.high?.length || 0;
  const totalMed = grouped.medium?.length || 0;
  const totalLow = grouped.low?.length || 0;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 资讯日报 — ${dateStr}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
                   "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #f0f2f5;
      color: #1a1a2e;
      line-height: 1.7;
      min-height: 100vh;
    }

    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 48px 24px 56px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%);
      animation: pulse 8s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 1; }
    }
    .hero h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 1px;
      position: relative;
      margin-bottom: 8px;
    }
    .hero .subtitle {
      font-size: 0.95rem;
      opacity: 0.85;
      position: relative;
    }

    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      max-width: 800px;
      margin: -28px auto 32px;
      padding: 0 16px;
      position: relative;
      z-index: 1;
    }
    .stat-chip {
      background: white;
      border-radius: 24px;
      padding: 10px 20px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: transform 0.2s;
    }
    .stat-chip:hover { transform: translateY(-2px); }
    .stat-chip .num { font-size: 1.1rem; }
    .stat-chip.high .num { color: #ef4444; }
    .stat-chip.medium .num { color: #f59e0b; }
    .stat-chip.low .num { color: #3b82f6; }

    .container {
      max-width: 780px;
      margin: 0 auto;
      padding: 0 16px 64px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 24px 28px;
      margin-bottom: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      transition: box-shadow 0.25s, transform 0.25s;
      animation: fadeInUp 0.4s ease both;
    }
    .card:hover {
      box-shadow: 0 8px 30px rgba(0,0,0,0.1);
      transform: translateY(-3px);
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .card:nth-child(1) { animation-delay: 0.05s; }
    .card:nth-child(2) { animation-delay: 0.1s; }
    .card:nth-child(3) { animation-delay: 0.15s; }
    .card:nth-child(4) { animation-delay: 0.2s; }
    .card:nth-child(5) { animation-delay: 0.25s; }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .priority-badge {
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 0.5px;
    }
    .topic-name {
      font-size: 0.85rem;
      color: #6b7280;
      font-weight: 500;
    }

    .card-title {
      font-size: 1.2rem;
      font-weight: 700;
      line-height: 1.5;
      margin-bottom: 8px;
      color: #111827;
    }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.82rem;
      color: #9ca3af;
    }
    .meta-item svg { flex-shrink: 0; }

    .summary {
      font-size: 0.95rem;
      color: #374151;
      margin-bottom: 14px;
      padding: 12px 16px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 3px solid #e5e7eb;
    }

    .key-points {
      list-style: none;
      padding: 0;
      margin-bottom: 14px;
    }
    .key-points li {
      position: relative;
      padding-left: 22px;
      margin-bottom: 6px;
      font-size: 0.9rem;
      color: #4b5563;
    }
    .key-points li::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 9px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
    }

    .recommendation {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
      border-radius: 8px;
      border: 1px solid #bbf7d0;
      margin-bottom: 14px;
      font-size: 0.9rem;
      color: #166534;
    }
    .rec-icon { font-size: 1.1rem; flex-shrink: 0; }

    .read-more {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #667eea;
      font-size: 0.88rem;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s;
    }
    .read-more:hover { color: #764ba2; }
    .read-more svg { transition: transform 0.2s; }
    .read-more:hover svg { transform: translate(2px, -2px); }

    .footer {
      text-align: center;
      padding: 32px 16px;
      font-size: 0.8rem;
      color: #9ca3af;
    }
    .footer a { color: #667eea; text-decoration: none; }

    @media (max-width: 600px) {
      .hero { padding: 32px 16px 40px; }
      .hero h1 { font-size: 1.5rem; }
      .card { padding: 18px 20px; }
      .card-title { font-size: 1.05rem; }
      .stats-bar { gap: 8px; margin-top: -24px; }
      .stat-chip { padding: 8px 14px; font-size: 0.78rem; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <h1>AI 资讯日报</h1>
    <p class="subtitle">${dateStr} · 生成于 ${timeStr}</p>
  </header>

  <nav class="stats-bar">
    <div class="stat-chip">
      <span>📡 扫描</span><span class="num">${stats.feedCount}</span><span>个源</span>
    </div>
    <div class="stat-chip">
      <span>📰 文章</span><span class="num">${stats.totalArticles}</span><span>篇</span>
    </div>
    <div class="stat-chip">
      <span>🆕 新增</span><span class="num">${stats.newArticles}</span><span>篇</span>
    </div>
    ${totalHigh ? `<div class="stat-chip high"><span>🔴 紧急</span><span class="num">${totalHigh}</span></div>` : ''}
    ${totalMed ? `<div class="stat-chip medium"><span>🟡 关注</span><span class="num">${totalMed}</span></div>` : ''}
    ${totalLow ? `<div class="stat-chip low"><span>🔵 了解</span><span class="num">${totalLow}</span></div>` : ''}
  </nav>

  <main class="container">
    ${cards}
  </main>

  <footer class="footer">
    由 <a href="https://github.com/Coratch/ai-news-agent">AI News Agent</a> 自动生成 · Powered by Claude
  </footer>
</body>
</html>`;

  // 写入文件
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filePath = path.join(outputDir, `${dateStr}.html`);
  fs.writeFileSync(filePath, html, 'utf-8');

  return filePath;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
