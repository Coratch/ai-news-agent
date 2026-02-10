# AI News Agent

AI 前沿资讯智能订阅 Agent — 自动抓取 RSS 订阅源，通过 AI 智能匹配用户关注点，生成中文摘要报告。支持 Anthropic Claude 和 MiniMax 双后端。

## 项目概览

### 痛点
- AI 领域资讯爆炸，手动追踪效率低
- 关注的技术方向（如 Claude Code 新版本特性）散落在多个博客/论坛，容易遗漏
- 英文资讯需要额外时间阅读理解

### 目标价值
- 自动聚合多个 RSS 源的 AI 资讯
- 基于用户自定义的关注主题，AI 智能筛选匹配文章
- 生成中文摘要 + 行动建议，节省 80% 的信息获取时间

## 架构

```
RSS 订阅源 → 抓取解析 → 去重(SQLite) → AI 快速筛选 → 正文提取 → AI 深度分析 → 多格式输出(终端/Markdown/HTML/邮件)
                                         (阶段1)                    (阶段2)
                                    ┌─────────────────────┐
                                    │  Anthropic Claude    │
                              AI 后端│  或                  │
                                    │  MiniMax (M2.1 等)   │
                                    └─────────────────────┘
```

**两阶段 AI 分析策略**（控制成本）：
1. **快速筛选**：仅传标题+摘要（几百 token），批量判断是否匹配用户关注点
2. **深度分析**：仅对匹配文章提取全文，生成中文摘要和行动建议

## 快速开始

### 方式一：npm 全局安装（推荐）

```bash
npm install -g @coratch/ai-news-agent
```

安装后直接使用 `ai-news` 命令。

### 方式二：从源码安装

```bash
git clone https://github.com/Coratch/ai-news-agent.git
cd ai-news-agent
npm install
npm link  # 全局注册 ai-news 命令
```

### 设置 API Key

支持两种 AI 后端，选择其一即可：

**方式 A：Anthropic Claude（默认）**

```bash
export ANTHROPIC_API_KEY=your-api-key
```

**方式 B：MiniMax**

```bash
export AI_PROVIDER=minimax
export MINIMAX_API_KEY=your-api-key
```

> MiniMax 通过 Anthropic SDK 兼容端点接入，无需额外安装依赖。

### 初始化配置

```bash
ai-news init
```

交互式创建配置，选择 RSS 源和关注主题。

### 运行

```bash
# 正常模式（需要 API Key）
ai-news run

# Dry-run 模式（本地关键词匹配，无需 API Key）
ai-news run --dry-run
```

## CLI 命令

| 命令 | 说明 |
|------|------|
| `ai-news init` | 交互式初始化配置 |
| `ai-news run` | 执行一次抓取+分析 |
| `ai-news run --dry-run` | 跳过 AI，使用本地关键词匹配 |
| `ai-news add-feed` | 添加 RSS 订阅源 |
| `ai-news add-topic` | 添加关注主题 |
| `ai-news config-email` | 交互式配置邮件通知 |
| `ai-news test-email` | 发送测试邮件验证配置 |
| `ai-news history` | 查看历史匹配记录 |
| `ai-news config` | 显示当前配置（含邮件状态） |

## 配置文件

配置文件位于 `~/.ai-news-agent/config.yaml`：

```yaml
# RSS 订阅源
feeds:
  - name: "Hacker News - Claude"
    url: "https://hnrss.org/newest?q=claude+anthropic"

# 关注主题（AI 据此匹配文章）
topics:
  - name: "Claude Code 版本特性"
    description: "Claude Code CLI 工具的新版本发布、新功能、效率提升特性"
    keywords: ["claude code", "claude cli"]
    priority: high  # high/medium/low

# 邮件通知（可选，运行 ai-news config-email 交互式配置）
output:
  email:
    enabled: false
    smtp:
      host: "smtp.163.com"
      port: 465
      secure: true
      user: "your-email@163.com"
      pass: "your-auth-code"        # 邮箱授权码（非登录密码）
    from: "AI News <your-email@163.com>"
    to:
      - "recipient@example.com"
    subjectPrefix: "AI 资讯日报"

# AI API 设置
# 支持 Anthropic 和 MiniMax 双后端，通过环境变量 AI_PROVIDER 切换
claude:
  model: "claude-haiku-4-5-20251001"  # 或 MiniMax-M2.1 / MiniMax-M2.1-lightning
  max_articles_per_run: 50
```

### 可用模型

| 后端 | 模型 | 特点 |
|------|------|------|
| Anthropic | `claude-haiku-4-5-20251001` | 快速、低成本（默认） |
| Anthropic | `claude-sonnet-4-5-20250929` | 更强能力 |
| MiniMax | `MiniMax-M2.1` | 多语言编程能力强，~60 tps |
| MiniMax | `MiniMax-M2.1-lightning` | 更快更轻量，~100 tps |
| MiniMax | `MiniMax-M2` | 高级推理与 Agent 能力 |

## 输出示例

### 终端输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AI 资讯日报 — 2026/2/9
  已扫描 4 个源 | 32 篇文章 | 新增 32 篇 | 命中 4 篇
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [HIGH] Claude Code 版本特性
  Claude Code 1.0.20: 支持后台 Agent 模式
  来源: Anthropic Blog | 2026/2/8 10:00

  新版本引入后台 Agent 模式，允许多个任务并行执行...

   • 后台 Agent 支持并行任务
   • 新增 /compact 命令优化上下文管理

  → 立即升级，后台 Agent 对多任务开发场景有直接帮助
```

### Markdown / HTML 报告

自动保存到 `~/.ai-news-agent/reports/YYYY-MM-DD.md` 和 `YYYY-MM-DD.html`

### 邮件通知

配置后，每次 `ai-news run` 匹配到文章会自动发送邮件报告：

```bash
# 1. 交互式配置 SMTP（支持 QQ、网易、Gmail 等）
ai-news config-email

# 2. 发送测试邮件验证
ai-news test-email

# 3. 正常运行，自动发送邮件
ai-news run
```

邮件发送失败不会阻断主流程，本地报告始终正常生成。

## 技术栈

| 组件 | 技术 | 用途 |
|------|------|------|
| RSS 解析 | rss-parser | 抓取和解析 RSS feed |
| 正文提取 | linkedom | 从网页 HTML 提取正文 |
| AI 分析 | @anthropic-ai/sdk | AI 匹配+摘要（支持 Anthropic / MiniMax） |
| 数据存储 | better-sqlite3 | 文章去重和历史记录 |
| CLI 框架 | commander + inquirer | 命令行交互 |
| 邮件发送 | nodemailer | SMTP 邮件通知 |
| 终端美化 | chalk + ora | 彩色输出和进度动画 |

## 项目结构

```
ai-news-agent/
├── bin/
│   └── ai-news.js          # CLI 入口
├── src/
│   ├── index.js             # 主流程编排
│   ├── config.js            # 配置管理
│   ├── feeds.js             # RSS 抓取
│   ├── extractor.js         # 网页正文提取
│   ├── analyzer.js          # AI 分析（Anthropic / MiniMax 双后端）
│   ├── storage.js           # SQLite 去重存储
│   ├── output.js            # 终端+Markdown+HTML 输出
│   └── email.js             # 邮件发送（SMTP/nodemailer）
├── config.example.yaml      # 配置示例
├── package.json
└── README.md
```

## 效果预估

| 指标 | 手动方式 | 使用 Agent |
|------|---------|-----------|
| 每日信息获取时间 | 30-60 分钟 | 2 分钟（看报告） |
| 遗漏重要资讯概率 | 高 | 低（自动化覆盖） |
| 英文资讯理解成本 | 高 | 低（中文摘要） |
| API 成本 | - | ~$0.01/次（Haiku / MiniMax） |

## 后续规划

- [x] 邮件通知（SMTP/nodemailer）
- [ ] 定时任务（node-cron / 系统 crontab）
- [ ] 更多 RSS 源预设（arxiv、GitHub trending 等）
- [ ] Web UI 管理界面
- [ ] 多用户支持
