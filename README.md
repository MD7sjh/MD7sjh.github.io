# Personal Workspace · Pastel Modular v16

一个模块化的个人工作 / 科研 / 生活工作台，支持 GitHub Pages + Supabase 多设备同步。

## v16 主要模块

- 总览首页
- 项目看板
- 科研思路
- **实验结果（Deep Learning / Computer Vision）**
- 论文进度
- 投稿管理
- 旅行规划
- 向上管理
- 每日复盘
- 数据看板
- 数据管理

## v16 变化

- 删除记账管理与攒钱规划，包括页面、模块、样式、统计和状态字段。
- 新增独立 `experiments` 数据模块：模型 / 数据集 / ablation / 训练配置 / 指标 / 结论 / 结果文件。
- 实验可关联项目、科研思路与论文，并进入首页、每日复盘、数据看板和数据管理统计。
- 旧云端 JSON 中的 `accounting` / `savings` 在新版正常保存后不再保留。建议升级前先下载 JSON 备份。

## GitHub Pages

将本目录内容直接上传到仓库根目录，保持 `index.html` 与 `assets/` 同级。Supabase 表结构无需修改。
