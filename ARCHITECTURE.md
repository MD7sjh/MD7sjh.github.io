# Personal Workspace v15 · 模块化架构

## 设计原则

后续功能继续采用模块化开发：业务模块不直接实现 Supabase 读写，只修改共享 `state` 并调用 `saveState()`；云同步由独立插件统一处理。

## 目录

```text
assets/
├── css/
│   ├── base.css
│   ├── pastel-theme.css
│   ├── papers.css
│   ├── travel.css
│   ├── research-ideas.css
│   ├── accounting.css
│   └── savings.css
└── js/
    ├── config/
    ├── core/
    ├── modules/
    ├── ui/
    ├── app/
    └── cloud/
```

## Core

- `core/constants.js`：常量、模块枚举、页面列表、运行时 UI 状态。
- `core/utils.js`：日期、时间、格式化与通用工具。
- `core/preferences.js`：侧栏与统计范围偏好。
- `core/normalizers.js`：数据清洗、默认值和旧版本迁移。
- `core/meta.js`：论文、向上管理、旅行等元数据查询。
- `core/state.js`：统一 state、本地持久化与跨模块 selector。

## 业务模块

- `profile.js`：个人显示名称与顶部问候。
- `home.js`：首页、打卡、导航与统计。
- `tasks.js`：任务。
- `focus-schedule.js`：专注与日程。
- `workflow.js`：项目看板。
- `research-ideas.js`：科研思路、来源与参考资料。
- `papers.js`：多论文进度。
- `submissions.js`：投稿管理。
- `accounting.js`：记账管理。
- `savings.js`：攒钱规划。
- `travel.js`：旅行规划与碎片记录。
- `upward-management.js`：向上管理。
- `review.js`：每日复盘与跨模块摘要。
- `dashboard.js`：综合数据看板。
- `settings.js`：JSON 导入导出与数据管理。

## App / Cloud

- `app/render.js`：统一渲染协调器。
- `app/runtime-bridge.js`：向云同步插件暴露稳定运行时接口。
- `app/bootstrap.js`：事件绑定与启动。
- `cloud/supabase-sync.js`：登录、名称 metadata、云读取、自动保存与多设备同步。

## 数据迁移

- `thesis` → `papers.items[]`，仅当旧论文存在有效数据时迁移。
- `mentor.entries` → `upward.entries`，旧数据默认角色设为 `advisor`。
- 新建向上管理记录默认角色为中性的 `other`。
- 本地存储 `phd_master_workspace_merged_v1` → `personal_workspace_state_v1`。

Supabase 表结构仍为一用户一条 JSONB 工作台数据，因此无需 SQL Schema 迁移。
