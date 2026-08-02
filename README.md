# PhD Master Workspace · Pastel Modular v12 · Accounting

这是基于当前简约可爱 UI 和 Supabase 多设备同步版完成的模块化代码包。

## 目录

- `index.html`：页面结构和资源引用。
- `assets/css/`：基础样式与可爱主题。
- `assets/js/core/`：常量、工具、偏好、数据兼容、状态管理。
- `assets/js/modules/`：各业务功能。
- `assets/js/ui/`：通用编辑弹窗。
- `assets/js/app/`：统一渲染和启动。
- `assets/js/cloud/`：Supabase 登录与同步。
- `assets/js/config/`：Tailwind 与 Supabase 公共配置。
- `supabase/setup.sql`：云端表和 RLS。

项目使用普通浏览器脚本按顺序加载，而没有贸然改成 ES Module。这保留了原有稳定的共享状态和 Supabase 插件行为，但已经把功能按职责拆分，便于阅读和维护。

## GitHub Pages

将本目录中的全部文件和文件夹上传到仓库根目录。至少必须有：

```
index.html
.nojekyll
assets/
```

在 GitHub 打开 `Settings → Pages → Deploy from a branch → main → /(root)`。

## Supabase

若你已经创建 `workspace_state` 并配置 RLS，无需重复执行 SQL；否则在 Supabase SQL Editor 运行 `supabase/setup.sql`。

`assets/js/config/supabase.config.js` 中是浏览器公开使用的 URL 和 Publishable Key。绝对不要放入 service_role、Secret key 或数据库密码。

## 本地运行

在项目根目录运行：

```bash
python -m http.server 8000
```

访问 `http://localhost:8000/`。

## 常用修改位置

- UI 色彩与圆角：`assets/css/pastel-theme.css`
- 任务：`assets/js/modules/tasks.js`
- 项目：`assets/js/modules/workflow.js`
- 论文：`assets/js/modules/thesis.js`
- 投稿：`assets/js/modules/submissions.js`
- 记账：`assets/js/modules/accounting.js` 与 `assets/css/accounting.css`
- 登录和同步：`assets/js/cloud/supabase-sync.js`


## v12 新增：记账管理

- 收入 / 支出记录与编辑删除
- 日常分类、账户 / 支付方式和备注
- 月度总预算与分类预算
- 每日收支趋势和支出分类图
- 月份、类型、分类、账户和关键词筛选
- CSV 导出
- 数据自动进入现有 JSON、localStorage 与 Supabase 云同步

Supabase 表无需新增字段，因为工作台仍将完整 `state` 保存到 `workspace_state.state` JSONB 中。
