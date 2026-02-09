import RSSParser from 'rss-parser';

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'AI-News-Agent/1.0',
  },
});

/**
 * 抓取单个 RSS 源
 * @returns {Array<{title, link, summary, pubDate, feedName}>}
 */
async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    return (result.items || []).map(item => ({
      title: item.title || '',
      link: item.link || '',
      summary: item.contentSnippet || item.content || '',
      pubDate: item.pubDate || item.isoDate || '',
      feedName: feed.name,
    }));
  } catch (err) {
    console.error(`  抓取失败 [${feed.name}]: ${err.message}`);
    return [];
  }
}

/**
 * 并行抓取所有 RSS 源
 * @param {Array<{name, url}>} feeds
 * @param {number} maxArticles - 最多返回文章数
 * @returns {Array} 文章列表，按时间倒序
 */
export async function fetchAllFeeds(feeds, maxArticles = 50) {
  const results = await Promise.allSettled(feeds.map(f => fetchFeed(f)));
  const articles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // 按发布时间倒序
  articles.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  return articles.slice(0, maxArticles);
}
