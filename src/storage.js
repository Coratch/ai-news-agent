import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { getConfigDir, ensureConfigDir } from './config.js';

let db = null;

function getDb() {
  if (!db) {
    ensureConfigDir();
    const dbPath = path.join(getConfigDir(), 'articles.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        url_hash TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        feed_name TEXT,
        matched_topic TEXT,
        analysis_json TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);
  }
  return db;
}

function hashUrl(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

/**
 * 检查文章是否已处理过
 */
export function isProcessed(url) {
  const row = getDb().prepare('SELECT 1 FROM articles WHERE url_hash = ?').get(hashUrl(url));
  return !!row;
}

/**
 * 过滤出未处理的文章
 */
export function filterNew(articles) {
  return articles.filter(a => !isProcessed(a.link));
}

/**
 * 保存已处理的文章
 */
export function markProcessed(article, analysis) {
  getDb().prepare(`
    INSERT OR IGNORE INTO articles (url_hash, url, title, feed_name, matched_topic, analysis_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    hashUrl(article.link),
    article.link,
    article.title,
    article.feedName,
    article.matchedTopic?.name || '',
    JSON.stringify(analysis),
  );
}

/**
 * 获取历史记录
 * @param {number} days - 最近几天
 * @param {number} limit - 最多返回条数
 */
export function getHistory(days = 7, limit = 50) {
  return getDb().prepare(`
    SELECT url, title, feed_name, matched_topic, analysis_json, created_at
    FROM articles
    WHERE created_at >= datetime('now', 'localtime', ?)
    ORDER BY created_at DESC
    LIMIT ?
  `).all(`-${days} days`, limit);
}

/**
 * 关闭数据库连接
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
