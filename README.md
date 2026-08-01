# 博士工作台：模块化 Supabase 版

本项目直接基于 `phd-index.html` 拆分，保留原有业务功能和昨天加入的 Supabase 登录/同步插件。

## 目录说明

- `index.html`：页面结构与各模块容器。
- `assets/css/app.css`：原有页面样式。
- `assets/css/mobile.css`：移动端底部导航、弹窗和横向表格适配。
- `assets/js/core/`：常量、工具函数、数据标准化、本地存储和启动代码。
- `assets/js/modules/`：首页、任务、项目、论文、投稿、健康等业务模块。
- `assets/js/ui/`：通用编辑弹窗与移动端导航。
- `assets/js/cloud/supabase_sync.js`：原有 Supabase 登录、云同步和冲突处理代码。
- `supabase/setup.sql`：Supabase 数据表及 RLS 权限。

## GitHub Pages 部署

把本压缩包解压后的全部内容上传到仓库根目录。必须保持 `assets/` 的目录结构。

仓库根目录至少需要：

```text
index.html
.nojekyll
assets/
```

建议同时上传：

```text
README.md
GITHUB_UPLOAD_CHECKLIST.md
supabase/setup.sql
```

不要上传个人 JSON 备份、数据库密码、Secret key、service_role key 或私人论文文件。

## Supabase

如果你之前已经运行过建表 SQL，不需要重复执行。否则在 Supabase → SQL Editor 中运行 `supabase/setup.sql`。

## 本地预览

不要直接双击 `index.html`。在当前目录运行：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。
