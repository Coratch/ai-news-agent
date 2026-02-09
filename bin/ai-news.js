#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { initConfig, configExists, loadConfig, addFeed, addTopic, getConfigDir } from '../src/config.js';
import { run } from '../src/index.js';
import { getHistory, closeDb } from '../src/storage.js';

const program = new Command();

program
  .name('ai-news')
  .description('AI 前沿资讯智能订阅 Agent')
  .version('1.0.0');

// init - 交互式创建配置
program
  .command('init')
  .description('初始化配置文件')
  .action(async () => {
    if (configExists()) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: '配置文件已存在，是否覆盖？',
        default: false,
      }]);
      if (!overwrite) {
        console.log('已取消');
        return;
      }
    }

    console.log(chalk.cyan('\n🚀 AI News Agent 初始化向导\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Anthropic API Key (留空则使用环境变量 ANTHROPIC_API_KEY):',
        default: '',
      },
      {
        type: 'checkbox',
        name: 'defaultFeeds',
        message: '选择默认订阅的 RSS 源:',
        choices: [
          { name: 'Anthropic Engineering (GitHub)', value: { name: 'Anthropic Engineering', url: 'https://raw.githubusercontent.com/conoro/anthropic-engineering-rss-feed/main/anthropic_engineering_rss.xml' }, checked: true },
          { name: 'Hacker News - AI/LLM', value: { name: 'Hacker News - AI/LLM', url: 'https://hnrss.org/newest?q=AI+LLM+agent' }, checked: true },
          { name: 'Hacker News - Claude', value: { name: 'Hacker News - Claude', url: 'https://hnrss.org/newest?q=claude+anthropic' }, checked: true },
          { name: 'The Verge - AI', value: { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' }, checked: false },
        ],
      },
      {
        type: 'input',
        name: 'topicName',
        message: '输入你最关注的 AI 主题名称:',
        default: 'Claude Code 版本特性',
      },
      {
        type: 'input',
        name: 'topicDesc',
        message: '描述这个主题（AI 会据此匹配文章）:',
        default: 'Claude Code CLI 工具的新版本发布、新功能、效率提升特性',
      },
      {
        type: 'input',
        name: 'topicKeywords',
        message: '关键词（逗号分隔）:',
        default: 'claude code, claude cli, anthropic cli',
      },
    ]);

    const config = {
      feeds: answers.defaultFeeds,
      topics: [{
        name: answers.topicName,
        description: answers.topicDesc,
        keywords: answers.topicKeywords.split(',').map(k => k.trim()),
        priority: 'high',
      }],
      output: {
        terminal: true,
        markdown: { enabled: true, dir: '~/.ai-news-agent/reports' },
        html: { enabled: true, dir: '~/.ai-news-agent/reports', autoOpen: true },
      },
      claude: {
        model: 'claude-haiku-4-5-20251001',
        max_articles_per_run: 50,
      },
    };

    const configPath = initConfig(config);
    console.log(chalk.green(`\n✅ 配置已保存到: ${configPath}`));
    console.log(chalk.gray('运行 ai-news run 开始抓取资讯\n'));
  });

// run - 执行一次抓取分析
program
  .command('run')
  .description('立即执行一次抓取+分析')
  .option('--dry-run', '跳过 Claude API，使用本地关键词匹配')
  .action(async (opts) => {
    if (!configExists()) {
      console.log(chalk.red('配置文件不存在，请先运行: ai-news init'));
      return;
    }
    try {
      await run({ dryRun: opts.dryRun });
    } catch (err) {
      console.error(chalk.red(`执行失败: ${err.message}`));
      process.exit(1);
    }
  });

// add-feed - 添加 RSS 源
program
  .command('add-feed')
  .description('添加 RSS 订阅源')
  .action(async () => {
    const { name, url } = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'RSS 源名称:' },
      { type: 'input', name: 'url', message: 'RSS URL:' },
    ]);
    try {
      addFeed(name, url);
      console.log(chalk.green(`✅ 已添加: ${name} (${url})`));
    } catch (err) {
      console.error(chalk.red(err.message));
    }
  });

// add-topic - 添加关注点
program
  .command('add-topic')
  .description('添加关注主题')
  .action(async () => {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'name', message: '主题名称:' },
      { type: 'input', name: 'description', message: '主题描述（AI 据此匹配文章）:' },
      { type: 'input', name: 'keywords', message: '关键词（逗号分隔）:' },
      { type: 'list', name: 'priority', message: '优先级:', choices: ['high', 'medium', 'low'] },
    ]);
    try {
      addTopic(answers.name, answers.description, answers.keywords.split(',').map(k => k.trim()), answers.priority);
      console.log(chalk.green(`✅ 已添加主题: ${answers.name}`));
    } catch (err) {
      console.error(chalk.red(err.message));
    }
  });

// history - 查看历史
program
  .command('history')
  .description('查看历史匹配记录')
  .option('-d, --days <n>', '最近几天', '7')
  .action((opts) => {
    if (!configExists()) {
      console.log(chalk.red('配置文件不存在，请先运行: ai-news init'));
      return;
    }
    try {
      const records = getHistory(parseInt(opts.days));
      if (records.length === 0) {
        console.log(chalk.gray('暂无历史记录'));
        return;
      }
      console.log(chalk.bold(`\n📋 最近 ${opts.days} 天的匹配记录 (${records.length} 条)\n`));
      for (const r of records) {
        const analysis = r.analysis_json ? JSON.parse(r.analysis_json) : null;
        const topic = r.matched_topic || '未分类';
        console.log(chalk.yellow(`  [${topic}] `) + chalk.bold(r.title));
        if (analysis?.summary) {
          console.log(chalk.gray(`  ${analysis.summary.slice(0, 80)}...`));
        }
        console.log(chalk.gray(`  ${r.url} | ${r.created_at}`));
        console.log('');
      }
      closeDb();
    } catch (err) {
      console.error(chalk.red(err.message));
    }
  });

// config - 显示配置
program
  .command('config')
  .description('显示当前配置')
  .action(() => {
    if (!configExists()) {
      console.log(chalk.red('配置文件不存在，请先运行: ai-news init'));
      return;
    }
    const config = loadConfig();
    console.log(chalk.bold('\n📂 配置目录: ') + getConfigDir());
    console.log(chalk.bold('\n📡 RSS 订阅源:'));
    for (const f of config.feeds) {
      console.log(`  • ${f.name}: ${f.url}`);
    }
    console.log(chalk.bold('\n🎯 关注主题:'));
    for (const t of config.topics) {
      console.log(`  • [${t.priority}] ${t.name}: ${t.description}`);
      console.log(chalk.gray(`    关键词: ${t.keywords.join(', ')}`));
    }
    console.log('');
  });

program.parse();
