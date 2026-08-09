# Personal Workspace · Pastel Modular v15

这是基于 v14.0.1 模块化版本继续迭代的通用个人工作台。定位不再限定博士阶段，可同时用于科研、高校、企业工作与个人生活规划。

## v15 主要变化

- 品牌升级为 **Personal Workspace**。
- 登录注册时可填写个人显示名称；顶部问候会显示该名称，已有账号可在账号卡中修改。
- “博士毕业论文进度”升级为 **论文进度**，支持多篇 Conference / Journal / Workshop / Thesis / Technical Report。
- “向上管理导师”升级为 **向上管理**，支持导师 / PI、领导、老板、项目负责人、客户或合作方负责人等。
- 新增 **旅行规划**：旅行计划 + 地点、吃喝、住宿、交通、待办、攻略链接和零碎想法。
- 首页、项目看板、每日复盘、数据看板、数据管理、JSON 备份与 Supabase 云同步均已同步适配。
- 旧版 `thesis` 与 `mentor` 数据会自动迁移至 `papers` 与 `upward`。
- 浏览器本地存储键升级为 `personal_workspace_state_v1`，旧的 `phd_master_workspace_merged_v1` 会自动迁移，不删除旧缓存。

## 主要模块

1. 总览首页
2. 项目看板
3. 科研思路
4. 论文进度
5. 投稿管理
6. 记账管理
7. 攒钱规划
8. 旅行规划
9. 向上管理
10. 每日复盘
11. 数据看板
12. 数据管理

## GitHub Pages

将本目录内的文件直接上传到仓库根目录。至少需要：

- `index.html`
- `.nojekyll`
- `assets/` 完整目录

更新旧版本时建议先删除仓库中的旧 `assets/`，再上传新版 `assets/` 与 `index.html`，避免浏览器或 GitHub Pages 混用旧脚本。

## Supabase

继续使用原有的 `workspace_state` JSONB 表，不需要因为 v15 重新建表、重新注册账号或运行新的迁移 SQL。

个人名称保存在 Supabase Auth 的 `user_metadata.display_name`；工作台业务数据仍保存于 `workspace_state.state`。
