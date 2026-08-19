# v16 模块化架构

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
  js/
    config/
    core/
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

`experiments.js` 独立管理 CV / 深度学习实验结果；核心状态由 `core/state.js` 持久化，并通过 `cloud/supabase-sync.js` 同步整个 JSON state。
