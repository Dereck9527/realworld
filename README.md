# Concept Atlas Codex Plugin

Concept Atlas 是一个研究型 Codex 插件，用于把“一个概念从哪里来、如何发展、怎样跨学科传播、今天如何使用”整理成可核查的 Markdown 报告。

它通过概念消歧、来源阅读、历史角色分类、跨域迁移分析和主张—来源账本，减少单一发明者叙事、日期混淆和无来源概括。

## 快速使用

将本目录作为插件源安装后，在 Codex 中输入：

```text
使用 $concept-atlas 研究“熵”的起源、发展、跨学科传播和当前应用。
```

## 2. 自动联网研究概念（先配置 Keenable 密钥）

Concept Atlas 支持通过外部 Keenable 网页研究适配器自动联网检索和阅读来源。使用自动联网研究前，必须在启动 Codex 或研究适配器的同一环境中设置 `KENABLE_API_KEY`。

macOS/Linux：

```bash
export KENABLE_API_KEY='你的-Keenable-API-密钥'
```

Windows PowerShell：

```powershell
$env:KENABLE_API_KEY = '你的-Keenable-API-密钥'
```

设置后从该环境启动 Codex，或重启研究适配器并新建任务。只检查变量是否存在时，不要打印密钥内容：

```bash
test -n "$KENABLE_API_KEY" && echo "KENABLE_API_KEY is set" || echo "KENABLE_API_KEY is missing"
```

密钥安全规则：

- 只通过环境变量提供；不要写进插件清单、代码、报告、证据卡、README、Git 历史或工具参数。
- 不要提交包含密钥的 `.env`、日志或调试输出。
- 未配置密钥或联网适配器不可用时，报告必须标记为 `provisional`，并说明证据限制。

仓库只提供 Concept Atlas 技能和研究规范，不捆绑 Keenable 密钥或远程研究后端；联网能力由运行环境中的适配器提供。

也可以指定领域、受众、深度、语言、证据截止日和输出格式：

```text
使用 $concept-atlas 研究“引力自力”。
领域：广义相对论与引力波；受众：研究生；深度：deep；
语言：中文；证据截止日：2026-08-13；输出：Markdown。
```

深度选项：

- `quick`：简要身份、谱系和入门路径。
- `standard`：完整十段式报告。
- `deep`：优先权互证、学术争议、跨域传播和当前使用细节。

## 插件内容

```text
.codex-plugin/plugin.json       # 插件清单
skills/concept-atlas/SKILL.md   # 主技能
skills/concept-atlas/agents/    # Codex 界面元数据
skills/concept-atlas/references/ # 证据、角色、报告和质量规范
skills/concept-atlas/scripts/   # 离线 Markdown 校验器与测试
```

## 报告契约

输出固定包含：范围与假设、研究模式与证据截止日、概念身份、角色化谱系、跨域转移、当前含义/应用/社群、初学者框架、不确定性、主张—来源账本和参考文献。

重要规则：

- 区分前驱、命名、形式化、验证、采用、传播和重新解释。
- 关键主张必须映射到直接来源 URL。
- 区分事件日期与发表日期。
- 将事实、推断、争议和证据不足分别标出。
- 浏览不可用时输出 `provisional`，并披露证据限制。

## 离线校验

从插件目录的父目录运行：

```bash
python3 skills/concept-atlas/scripts/validate_report.py REPORT.md --json
python3 skills/concept-atlas/scripts/test_validate_report.py
```

校验器只检查 Markdown 报告结构，不认证来源权威性、历史准确性或主张—来源之间的真实蕴含关系。

## 手工 ChatGPT 工作流

没有插件时，可使用 [`skills/concept-atlas/references/portable-chatgpt-workflow.md`](skills/concept-atlas/references/portable-chatgpt-workflow.md) 中的提示词，沿用同一套证据规则和报告结构。

## 发布

本目录已经包含完整插件代码和 `.codex-plugin/plugin.json`，可以作为独立 GitHub 仓库根目录发布。发布前运行离线测试，并根据实际仓库补充许可证和远程仓库地址。不要把 `KENABLE_API_KEY` 或任何本地密钥提交到仓库。

```bash
git init
git add .
git commit -m "Initial Concept Atlas plugin"
git branch -M main
git remote add origin https://github.com/<OWNER>/<REPOSITORY>.git
git push -u origin main
```
