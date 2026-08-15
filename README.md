<p align="center">
  <a href="#chinese">🇨🇳 中文</a>
  &nbsp;·&nbsp;
  <a href="#english">🇬🇧 English</a>
</p>

<a name="chinese"></a>

# Concept Atlas Codex 插件

Concept Atlas 是一个面向研究的 Codex 插件，用于追溯一个概念的起源、发展、跨学科传播与当代应用，并生成带有主张—来源账本的可核查 Markdown 报告。

它通过区分历史角色、事件日期与发表日期，并要求关键主张对应直接来源，减少“单一发明者叙事”、年代混淆和无来源概括。

## 1. 快速开始

将本目录作为 Codex 插件安装或加载，然后在 Codex 中输入：

```text
使用 $concept-atlas 研究“熵”的起源、发展、跨学科传播和当前应用。
```

也可以指定领域、受众、深度、语言、证据截止日和输出格式：

```text
使用 $concept-atlas 研究“引力自力”。
领域：广义相对论与引力波；受众：研究生；深度：deep；
语言：中文；证据截止日：2026-08-13；输出：Markdown。
```

## 2. 自动联网研究概念

Concept Atlas 支持通过外部 Keenable 网页研究适配器自动检索和阅读来源。使用自动联网研究前，必须在启动 Codex 或研究适配器的同一环境中设置 `KENABLE_API_KEY`。

macOS/Linux：

```bash
export KENABLE_API_KEY='YOUR-KEENABLE-API-KEY'
```

Windows PowerShell：

```powershell
$env:KENABLE_API_KEY = 'YOUR-KEENABLE-API-KEY'
```

设置变量后，请从该环境启动 Codex，或重启研究适配器并新建任务。只检查变量是否存在时，不要打印密钥内容：

```bash
test -n "$KENABLE_API_KEY" && echo "KENABLE_API_KEY is set" || echo "KENABLE_API_KEY is missing"
```

密钥安全规则：

- 只通过环境变量提供密钥；不要写入插件清单、源代码、报告、证据卡、README、Git 历史、命令参数或日志。
- 不要提交包含密钥的 `.env` 文件、日志或调试输出。
- 如果密钥或联网适配器不可用，报告必须标记为 `provisional`，并说明证据限制。

本仓库包含 Concept Atlas 技能、本地 MCP server、有界研究引擎和报告渲染器，不捆绑 Keenable 密钥或远程研究后端；联网能力由运行环境中的适配器提供。

## 3. 公式输出与报告渲染

`render_concept_report` 和 `research_concept` 支持 `mathMode`：

- `portable`（默认）：将常见 LaTeX 片段转换为普通 Markdown 可读的 Unicode/纯文本公式；
- `latex`：统一使用 `$...$` 与 `$$...$$`，适合支持 MathJax/KaTeX 的 Markdown 阅读器；
- `html`：生成带 MathJax 的独立 HTML 报告，并保留 portable Markdown 回退。

命令行渲染示例：

```bash
bun mcp/scripts/render-report.ts reports/concept-evidence.json reports/concept.md --math=portable
bun mcp/scripts/render-report.ts reports/concept-evidence.json reports/concept.html --math=html
```

`html` 报告打开时从 MathJax CDN 加载公式排版器；离线环境请使用 `portable` Markdown。原始证据 JSON 不会被公式转换改写。

## 4. 研究深度

- `quick`：概念身份、简要谱系和初学者入门路径。
- `standard`：完整的十段式报告。
- `deep`：优先权互证、学术争议、跨域传播和当前使用细节。

## 5. 插件输出内容

每份报告包含：

- 范围、假设、研究模式和证据截止日；
- 概念身份与术语消歧；
- 按历史角色区分的概念谱系；
- 跨学科转移与重新解释；
- 当前含义、应用和社群；
- 初学者知识框架；
- 不确定性、争议和证据限制；
- 主张—来源账本与参考文献。

## 6. 证据与历史规则

- 区分前驱、命名、形式化、验证、采用、传播和重新解释。
- 关键主张必须映射到直接来源 URL。
- 区分事件发生日期与作品发表日期。
- 将事实、推断、争议和证据不足分别标出。
- 优先权主张优先使用一手来源，并用后续研究解释背景与接受史。
- 浏览不可用时，输出 `provisional` 报告并披露证据限制。

## 7. 仓库结构

```text
.codex-plugin/plugin.json        # 插件清单
.mcp.json                        # 本地 MCP server 配置
mcp/                             # 研究引擎、渲染器和 MCP 工具
demo/                            # 离线演示报告
skills/concept-atlas/SKILL.md    # 主技能
skills/concept-atlas/agents/     # Codex 界面元数据
skills/concept-atlas/references/ # 证据与报告规范
skills/concept-atlas/scripts/    # 离线校验器与测试
```

## 8. 离线校验

请在插件目录中运行：

```bash
python3 skills/concept-atlas/scripts/validate_report.py REPORT.md --json
python3 skills/concept-atlas/scripts/test_validate_report.py
bun test mcp/tests
bun build ./mcp/server.ts --target=browser --outdir /tmp/concept-atlas-build
```

校验器只检查 Markdown 报告结构，不认证来源权威性、历史准确性或主张—来源之间是否存在真实蕴含关系。

## 9. 手工 ChatGPT 工作流

如果暂时无法使用插件，可参考 [`portable-chatgpt-workflow.md`](skills/concept-atlas/references/portable-chatgpt-workflow.md) 中的提示词；它沿用同一套证据规则、角色账本和报告契约。

## 10. 发布与安全

本目录可直接作为独立 GitHub 仓库根目录。发布前请运行 Python/Bun 测试，并确认文件和 Git 历史中没有任何密钥、SQLite 数据库、个人研究报告或临时 work 目录。

```bash
git status
bun test mcp/tests
git diff --check
```

不要把真实的 `KENABLE_API_KEY` 写入本 README 或仓库中的任何位置。

<p align="right"><a href="#english">English ↓</a></p>

<a name="english"></a>

# Concept Atlas Codex Plugin

Concept Atlas is a research-oriented Codex plugin for tracing where a concept came from, how it evolved, how it moved across disciplines, and how it is used today. It produces cited Markdown reports with an explicit claim–source ledger.

It reduces common research errors such as single-inventor narratives, date confusion, unsupported generalizations, and the failure to distinguish historical roles.

## 1. Quick start

Install or load this directory as a Codex plugin, then ask Codex:

```text
Research “entropy” with $concept-atlas: origin, development, interdisciplinary transmission, and current applications.
```

You may also specify the domain, audience, depth, language, evidence cutoff date, and output format:

```text
Use $concept-atlas to research “gravitational self-force”.
Domain: general relativity and gravitational waves; audience: graduate students; depth: deep;
Language: English; evidence cutoff: 2026-08-13; output: Markdown.
```

## 2. Automatic web research

Concept Atlas can use an external Keenable web-research adapter to search for and read sources automatically. Before starting automatic research, set `KENABLE_API_KEY` in the same environment that starts Codex or the research adapter.

macOS/Linux:

```bash
export KENABLE_API_KEY='YOUR-KEENABLE-API-KEY'
```

Windows PowerShell:

```powershell
$env:KENABLE_API_KEY = 'YOUR-KEENABLE-API-KEY'
```

After setting the variable, start Codex from that environment, or restart the research adapter and create a new task. To check whether the variable exists without printing its value:

```bash
test -n "$KENABLE_API_KEY" && echo "KENABLE_API_KEY is set" || echo "KENABLE_API_KEY is missing"
```

Security rules:

- Store the key only in an environment variable. Never put it in the manifest, source code, reports, evidence cards, README, Git history, command arguments, or logs.
- Never commit `.env` files, logs, or debug output that contain the key.
- If the key or adapter is unavailable, the report must be marked `provisional` and must disclose the evidence limitation.

The repository contains the Concept Atlas skill, a local MCP server, the bounded research engine, and the report renderer. It does not bundle the Keenable key or a remote research backend; web access is provided by the adapter available in the runtime environment.

## 3. Formula output and report rendering

`render_concept_report` and `research_concept` support `mathMode`:

- `portable` (default): converts common LaTeX fragments to readable Unicode/plain-text formulas for ordinary Markdown readers;
- `latex`: normalizes formulas to `$...$` and `$$...$$` for MathJax/KaTeX-compatible Markdown readers;
- `html`: generates a standalone MathJax HTML report and keeps a portable Markdown fallback.

Example CLI rendering:

```bash
bun mcp/scripts/render-report.ts reports/concept-evidence.json reports/concept.md --math=portable
bun mcp/scripts/render-report.ts reports/concept-evidence.json reports/concept.html --math=html
```

The HTML report loads MathJax from its CDN when opened; use portable Markdown in offline environments. The source evidence JSON is never rewritten by formula conversion.

## 4. Research depth

- `quick`: identity, genealogy, and a beginner entry path.
- `standard`: the complete ten-section report contract.
- `deep`: priority cross-checking, scholarly disputes, interdisciplinary transfer, and current-use details.

## 5. What the plugin produces

Each report includes:

- scope, assumptions, research mode, and evidence cutoff;
- concept identity and disambiguation;
- a role-separated genealogy;
- cross-disciplinary transfer and reinterpretation;
- current meanings, applications, and communities;
- a beginner knowledge framework;
- uncertainty, disputes, and evidence limitations;
- a claim–source ledger and references.

## 6. Evidence and history rules

- Distinguish precursor, naming, formalization, validation, adoption, dissemination, and reinterpretation.
- Map important claims to direct source URLs.
- Distinguish the date an event happened from the date a work was published.
- Label facts, inferences, disputes, and insufficient evidence separately.
- Prefer primary sources for priority claims, while using later scholarship to explain context and reception.
- If browsing is unavailable, produce a `provisional` report and disclose the limitation.

## 7. Repository layout

```text
.codex-plugin/plugin.json        # Plugin manifest
.mcp.json                        # Local MCP server configuration
mcp/                             # Research engine, renderer, and MCP tools
demo/                            # Offline demo report
skills/concept-atlas/SKILL.md    # Main skill
skills/concept-atlas/agents/     # Codex UI metadata
skills/concept-atlas/references/ # Evidence and report guidance
skills/concept-atlas/scripts/    # Offline validator and tests
```

## 8. Offline validation

Run these commands from the plugin directory:

```bash
python3 skills/concept-atlas/scripts/validate_report.py REPORT.md --json
python3 skills/concept-atlas/scripts/test_validate_report.py
bun test mcp/tests
bun build ./mcp/server.ts --target=browser --outdir /tmp/concept-atlas-build
```

The validator checks the structure of a Markdown report. It does not certify source authority, historical accuracy, or whether a source genuinely entails a claim.

## 9. Portable ChatGPT workflow

When the plugin is unavailable, use [`portable-chatgpt-workflow.md`](skills/concept-atlas/references/portable-chatgpt-workflow.md). It preserves the same evidence rules, role ledger, and report contract.

## 10. Publishing and security

This directory is designed to be the root of an independent GitHub repository. Before publishing, run the Python/Bun tests and confirm that no credentials, SQLite databases, personal research reports, or temporary work directories are present in the files or Git history.

```bash
git status
bun test mcp/tests
git diff --check
```

Never place a real `KENABLE_API_KEY` in this README or anywhere in the repository.

<p align="right"><a href="#chinese">↑ 中文</a></p>
