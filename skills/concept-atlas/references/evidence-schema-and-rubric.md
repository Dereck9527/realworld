# 证据卡模式与输出量规

## 严格证据卡与日期精度

每张卡只能含 `id`、`claim`、`claimType`、`historicalContext`、`mechanism`、`problemSolved`、`concreteExample`、`frameworkSignificance`、`sourceUrl`、`sourceTitle`、`sourceType`、`publicationDate`、`evidenceSummary`、`confidence`、`inference`、`disputes`、`supports`，且全部必填。未知字段会被拒绝。

深度字段的职责不能互相替代：

- `historicalContext`：当时或当前的实际情境、约束与参与者为什么会遇到这个问题。
- `mechanism`：概念内部怎样工作，包括关系式、因果步骤、分类结构或操作原则。
- `problemSolved`：它比旧方法多解决了什么，或把什么不可处理的问题变得可处理。
- `concreteExample`：严格包含 `title`、`scenario`、至少一步的 `walkthrough` 与 `insight`。步骤要有可跟随的对象、数字、判断或操作；不能只复述 `claim`。
- `frameworkSignificance`：这个节点如何改变后续概念、方法或范式，以及初学者应把它放在知识地图的什么位置。

- `claimType`：`precursor`、`coinage`、`formalization`、`adoption`、`transfer`、`current-use`。
- `sourceType`：`primary-paper`、`book`、`academic-review`、`institutional-reference`、`other`；`confidence`：`high`、`medium`、`low`。
- `publicationDate` 可为经日历校验的 `YYYY`、`YYYY-MM` 或 `YYYY-MM-DD`。只知道年份或月份时不得补造日；时间线按这些 ISO 片段字典序排列。
- `sourceUrl` 是 http/https URL；`inference` 是布尔值；`disputes`、`supports` 是字符串数组，后者只能引用同批 id。

## 计划和优先权

报告的 `plan` 必须严格具有 `version`、`concept`、`settings`、`disambiguationPrompts`、`researchDimensions`、`searchQueryGroups`、`evidenceRequirements`、`status`。渲染时会校验所有层级，并将 `plan.concept` 与请求概念做 trim/大小写规范化比较。

`claim` 含 `first`、`earliest`、`首次` 或 `最早` 时，校验器沿该卡及 `supports` 链统计可信来源域名。少于两个不同域名会报 `ABSOLUTE_PRIORITY_INSUFFICIENT`；应补独立来源或改为限定措辞。规则检查证据结构，不替代史学判断。

## 输出量规

报告只能重组已校验证据卡，必须附原卡 URL，并将前驱、命名、形式化、采用、跨域转移、当前图景和不确定性分开。时间先后不等于因果；解释性连接应标 `inference: true`。时间线、问题链、跨域转移和当前图景的每个条目都必须展开为“情境—机制—问题—实例—框架意义”，使初学者能从实例回到原理，再回到谱系位置。
