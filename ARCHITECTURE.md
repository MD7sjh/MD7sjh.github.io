# 模块化架构 v14

## 加载顺序

1. `assets/js/core/constants.js`
2. `assets/js/core/utils.js`、`preferences.js`
3. `assets/js/core/normalizers.js`、`state.js`
4. 业务模块
5. `assets/js/ui/dialogs.js`
6. `assets/js/app/render.js`、`runtime-bridge.js`、`bootstrap.js`
7. Supabase 配置、SDK 与云同步模块

## 科研思路模块

- 页面：`index.html#research-ideas-section`
- 样式：`assets/css/research-ideas.css`
- 业务：`assets/js/modules/research-ideas.js`
- 数据：`state.researchIdeas.ideas[]`
- 数据清洗：`normalizeResearchIdeasState()`
- 持久化：统一调用 `saveState()`，不直接依赖 Supabase

每条科研思路包含基础论证、多个来源、多个参考资料、关联项目与验证任务。

## 已移除模块

以下模块及其页面、脚本、状态字段和统计联动已删除：

- `assets/js/modules/habits.js`
- `assets/js/modules/care.js`
- `state.habits / foods / weights / mood / care`
