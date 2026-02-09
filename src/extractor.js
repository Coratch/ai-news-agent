import { parseHTML } from 'linkedom';

/**
 * 从 URL 抓取网页并提取正文
 * @param {string} url
 * @returns {string} 提取的正文文本（截断到 3000 字符以控制 token）
 */
export async function extractContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-News-Agent/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return '';
    }

    const html = await response.text();
    return extractFromHtml(html);
  } catch {
    return '';
  }
}

/**
 * 从 HTML 字符串中提取正文
 */
function extractFromHtml(html) {
  const { document } = parseHTML(html);

  // 移除无关元素
  const removeTags = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe'];
  for (const tag of removeTags) {
    document.querySelectorAll(tag).forEach(el => el.remove());
  }

  // 优先尝试 article 标签
  let content = '';
  const article = document.querySelector('article');
  if (article) {
    content = article.textContent || '';
  }

  // 回退到 main 或 body
  if (!content || content.trim().length < 200) {
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      content = main.textContent || '';
    }
  }

  if (!content || content.trim().length < 200) {
    content = document.body?.textContent || '';
  }

  // 清理空白并截断
  content = content.replace(/\s+/g, ' ').trim();
  return content.slice(0, 3000);
}
