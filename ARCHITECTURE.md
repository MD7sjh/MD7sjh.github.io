# v16.1 模块化架构

```text
index.html
assets/
  css/
    base.css
    pastel-theme.css
    research-ideas.css
    experiments.css
    travel.css
    papers.css
    workflow-todo.css
    workflow-projects.css
  js/
    config/
    core/
    services/
      travel-weather.js
    modules/
      profile.js
      home.js
      tasks.js
      focus-schedule.js
      workflow.js
      research-ideas.js
      experiments.js
      papers.js
      submissions.js
      travel.js
      upward-management.js
      review.js
      dashboard.js
      settings.js
    ui/
    app/
    cloud/
supabase/setup.sql
```

`travel.js` 只负责旅行领域状态与 UI；`services/travel-weather.js` 单独负责在线天气与地点解析。地图相关代码不存在。核心状态仍由 `core/state.js` 持久化，并通过 `cloud/supabase-sync.js` 同步整个 JSON state。


## 论文与项目弱关联（v16.1.3）

`papers.items[].projectId` 是可选引用。论文模块不会创建、更新或删除项目；项目模块也不会自动修改论文。未设置 `projectId` 的论文作为独立论文维护。删除项目时只清空相应论文的 `projectId`。


## v16.1.4 Workflow Todo UI
`assets/js/modules/workflow.js` 继续负责项目与任务计划层；`assets/css/workflow-todo.css` 仅负责新的轻量 Todo List 呈现，不改变任务数据模型。


## v16.1.5 Workflow Project List UI
`assets/js/modules/workflow.js` 继续拥有项目筛选与项目选择逻辑；`assets/css/workflow-projects.css` 只负责轻量项目列表的视觉与响应式布局。项目数据模型没有增加强制字段，仍沿用 `projects[]` 的 title / outcome / area / status / startDate / deadline / logs 等结构。
