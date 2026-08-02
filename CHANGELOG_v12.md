# v12 · 记账管理模块

本版本基于 Pastel Modular v11 继续模块化迭代，没有回退到单文件开发。

## 新增功能

- 收入 / 支出记录、修改和删除
- 餐饮、交通、房租、科研、学习、医疗等常见分类
- 现金、银行卡、电子钱包、信用卡等账户
- CNY、MOP、HKD、SGD、USD 显示切换
- 月度总预算与分类预算
- 每日收支趋势图与支出分类图
- 月份、类型、分类、账户和关键词筛选
- CSV 导出
- 首页快捷入口、侧栏本月支出、数据看板与每日复盘联动
- JSON 导入导出、localStorage 和 Supabase 云同步兼容

## 模块文件

- `assets/js/modules/accounting.js`：记账业务逻辑
- `assets/css/accounting.css`：记账页面样式
- `assets/js/core/normalizers.js`：记账数据兼容
- `assets/js/core/state.js`：记账状态加载与统计选择器

## 云端说明

仍然使用原来的 `workspace_state.state` JSONB 保存完整工作台状态，因此不需要修改 Supabase 数据表结构。

## v12.1.1 云同步加载修复

- 新增稳定运行时桥接 `assets/js/app/runtime-bridge.js`。
- 修复模块化脚本与 Supabase 同步插件的初始化接口。
- 为本地静态资源增加缓存版本号，避免 GitHub Pages 新旧文件混用。
