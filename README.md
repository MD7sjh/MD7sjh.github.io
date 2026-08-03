# PhD Master Workspace · Pastel Modular v14

本版本基于 v13 模块化架构迭代。

## v14 变化

- 新增“科研思路”模块：问题、核心思路、方法路线、预期贡献、下一步验证。
- 每条思路可记录多个“思路来源”。
- 每条思路可记录多篇参考文献、数据集、代码或网页资料。
- 可生成验证任务、关联项目、筛选状态并导出 Markdown。
- 删除“健康管理”和“心灵关怀”的页面、脚本、状态字段与统计联动。
- 保留 Supabase 登录、多设备同步、JSON 备份、记账和攒钱规划。

## GitHub Pages

将本目录内所有内容上传到仓库根目录，至少包括：

- `index.html`
- `.nojekyll`
- `assets/`

不要只上传 `index.html`。

## Supabase

继续使用原来的 `workspace_state` JSONB 表，不需要重新建表或运行新 SQL。首次保存新版数据时，旧的健康管理与心灵关怀字段会被新版结构移除。
