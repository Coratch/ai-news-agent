import fs from 'fs';
import path from 'path';
import os from 'os';
import YAML from 'yaml';

const CONFIG_DIR = path.join(os.homedir(), '.ai-news-agent');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.yaml');

const DEFAULT_CONFIG = {
  feeds: [
    { name: 'Anthropic Engineering (GitHub)', url: 'https://raw.githubusercontent.com/conoro/anthropic-engineering-rss-feed/main/anthropic_engineering_rss.xml' },
    { name: 'Hacker News - AI/LLM', url: 'https://hnrss.org/newest?q=AI+LLM+agent' },
    { name: 'Hacker News - Claude', url: 'https://hnrss.org/newest?q=claude+anthropic' },
    { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  ],
  topics: [
    {
      name: 'Claude Code 版本特性',
      description: 'Claude Code CLI 工具的新版本发布、新功能、效率提升特性',
      keywords: ['claude code', 'claude cli', 'anthropic cli'],
      priority: 'high',
    },
  ],
  output: {
    terminal: true,
    markdown: { enabled: true, dir: path.join(CONFIG_DIR, 'reports') },
    html: { enabled: true, dir: path.join(CONFIG_DIR, 'reports'), autoOpen: true },
  },
  claude: {
    model: 'claude-haiku-4-5-20251001',
    max_articles_per_run: 50,
  },
};

export function getConfigDir() {
  return CONFIG_DIR;
}

export function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function configExists() {
  return fs.existsSync(CONFIG_FILE);
}

export function loadConfig() {
  if (!configExists()) {
    throw new Error(`配置文件不存在: ${CONFIG_FILE}\n请先运行 ai-news init 创建配置`);
  }
  const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
  const config = YAML.parse(raw);
  // 展开 ~ 路径
  if (config.output?.markdown?.dir) {
    config.output.markdown.dir = config.output.markdown.dir.replace(/^~/, os.homedir());
  }
  if (config.output?.html?.dir) {
    config.output.html.dir = config.output.html.dir.replace(/^~/, os.homedir());
  }
  return config;
}

export function saveConfig(config) {
  ensureConfigDir();
  const content = YAML.stringify(config, { lineWidth: 120 });
  fs.writeFileSync(CONFIG_FILE, content, 'utf-8');
}

export function initConfig(customConfig = null) {
  ensureConfigDir();
  const config = customConfig || DEFAULT_CONFIG;
  saveConfig(config);
  // 确保报告目录存在
  const reportDir = config.output?.markdown?.dir?.replace(/^~/, os.homedir())
    || path.join(CONFIG_DIR, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  return CONFIG_FILE;
}

export function addFeed(name, url) {
  const config = loadConfig();
  if (config.feeds.some(f => f.url === url)) {
    throw new Error(`RSS 源已存在: ${url}`);
  }
  config.feeds.push({ name, url });
  saveConfig(config);
}

export function addTopic(name, description, keywords, priority = 'medium') {
  const config = loadConfig();
  if (config.topics.some(t => t.name === name)) {
    throw new Error(`关注点已存在: ${name}`);
  }
  config.topics.push({ name, description, keywords, priority });
  saveConfig(config);
}
