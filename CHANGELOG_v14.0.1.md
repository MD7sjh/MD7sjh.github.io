# v14.0.1 Hotfix

- 修复登录后提示 `mentorStatusMeta is not defined`。
- 新增 `assets/js/core/meta.js`，集中提供导师状态、导师承诺状态和每日复盘能量状态的元数据查询函数。
- 将本地资源缓存版本更新为 `14.0.1`，避免 GitHub Pages 继续使用旧脚本。
- 改进云同步错误提示：区分数据库读取失败与读取后页面渲染失败。
- 不修改 Supabase 表结构，不修改现有云端数据格式。
