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
