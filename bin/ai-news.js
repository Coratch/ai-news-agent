#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { initConfig, configExists, loadConfig, addFeed, addTopic, getConfigDir, getEmailConfig, updateEmailConfig } from '../src/config.js';
import { run } from '../src/index.js';
import { getHistory, closeDb } from '../src/storage.js';
import { verifySmtpConnection, sendEmailReport } from '../src/email.js';

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

    // 显示邮件配置状态
    const email = config.output?.email;
    console.log(chalk.bold('\n📧 邮件通知:'));
    if (email?.enabled) {
      console.log(chalk.green('  状态: 已启用'));
      console.log(`  SMTP: ${email.smtp?.host}:${email.smtp?.port}`);
      console.log(`  发件人: ${email.from}`);
      console.log(`  收件人: ${Array.isArray(email.to) ? email.to.join(', ') : email.to || '未配置'}`);
    } else {
      console.log(chalk.gray('  状态: 未启用 (运行 ai-news config-email 配置)'));
    }
    console.log('');
  });

// config-email - 交互式配置邮件
program
  .command('config-email')
  .description('交互式配置邮件通知')
  .action(async () => {
    if (!configExists()) {
      console.log(chalk.red('配置文件不存在，请先运行: ai-news init'));
      return;
    }

    console.log(chalk.cyan('\n📧 邮件通知配置向导\n'));

    const currentEmail = getEmailConfig();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'host',
        message: 'SMTP 服务器地址:',
        default: currentEmail?.smtp?.host || 'smtp.qq.com',
      },
      {
        type: 'number',
        name: 'port',
        message: 'SMTP 端口:',
        default: currentEmail?.smtp?.port || 465,
      },
      {
        type: 'confirm',
        name: 'secure',
        message: '启用 SSL/TLS:',
        default: currentEmail?.smtp?.secure !== false,
      },
      {
        type: 'input',
        name: 'user',
        message: 'SMTP 用户名 (通常为邮箱地址):',
        default: currentEmail?.smtp?.user || '',
      },
      {
        type: 'password',
        name: 'pass',
        message: 'SMTP 密码 (或授权码):',
        mask: '*',
      },
      {
        type: 'input',
        name: 'from',
        message: '发件人地址 (如 "AI News <you@qq.com>"):',
        default: currentEmail?.from || '',
      },
      {
        type: 'input',
        name: 'to',
        message: '收件人地址 (多个用逗号分隔):',
        default: Array.isArray(currentEmail?.to) ? currentEmail.to.join(', ') : (currentEmail?.to || ''),
      },
      {
        type: 'input',
        name: 'subjectPrefix',
        message: '邮件主题前缀:',
        default: currentEmail?.subjectPrefix || 'AI 资讯日报',
      },
    ]);

    const emailConfig = {
      enabled: true,
      smtp: {
        host: answers.host,
        port: answers.port,
        secure: answers.secure,
        user: answers.user,
        pass: answers.pass || currentEmail?.smtp?.pass || '',
      },
      from: answers.from,
      to: answers.to.split(',').map(s => s.trim()).filter(Boolean),
      subjectPrefix: answers.subjectPrefix,
    };

    // 可选验证 SMTP 连接
    const { verify } = await inquirer.prompt([{
      type: 'confirm',
      name: 'verify',
      message: '是否验证 SMTP 连接?',
      default: true,
    }]);

    if (verify) {
      try {
        await verifySmtpConnection(emailConfig.smtp);
        console.log(chalk.green('SMTP 连接验证成功'));
      } catch (err) {
        console.log(chalk.red(`SMTP 连接验证失败: ${err.message}`));
        const { saveAnyway } = await inquirer.prompt([{
          type: 'confirm',
          name: 'saveAnyway',
          message: '仍然保存配置?',
          default: false,
        }]);
        if (!saveAnyway) {
          console.log('已取消');
          return;
        }
      }
    }

    updateEmailConfig(emailConfig);
    console.log(chalk.green('\n邮件配置已保存'));
    console.log(chalk.gray('运行 ai-news test-email 发送测试邮件\n'));
  });

// test-email - 发送测试邮件
program
  .command('test-email')
  .description('发送测试邮件验证配置')
  .action(async () => {
    if (!configExists()) {
      console.log(chalk.red('配置文件不存在，请先运行: ai-news init'));
      return;
    }

    const emailConfig = getEmailConfig();
    if (!emailConfig?.enabled) {
      console.log(chalk.red('邮件未配置，请先运行: ai-news config-email'));
      return;
    }

    console.log(chalk.cyan('正在发送测试邮件...\n'));

    const testHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f0f2f5; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <h1 style="color: #667eea; margin-bottom: 16px;">AI News Agent 测试邮件</h1>
    <p style="color: #374151; line-height: 1.7;">如果你收到了这封邮件，说明邮件通知配置成功!</p>
    <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 24px;">发送时间: ${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>`;

    try {
      const stats = { feedCount: 0, totalArticles: 0, newArticles: 0 };
      const { messageId } = await sendEmailReport(testHtml, stats, 0, {
        ...emailConfig,
        subjectPrefix: `[测试] ${emailConfig.subjectPrefix || 'AI 资讯日报'}`,
      });
      console.log(chalk.green(`测试邮件已发送 (${messageId})`));
      console.log(chalk.gray(`收件人: ${Array.isArray(emailConfig.to) ? emailConfig.to.join(', ') : emailConfig.to}`));
    } catch (err) {
      console.error(chalk.red(`发送失败: ${err.message}`));
      console.log(chalk.gray('请检查 SMTP 配置，运行 ai-news config-email 重新配置'));
    }
  });

program.parse();
