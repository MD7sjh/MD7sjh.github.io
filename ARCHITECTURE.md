# 加载顺序与依赖

1. `core/constants.js`
2. `core/utils.js`、`core/preferences.js`
3. `core/normalizers.js`、`core/state.js`
4. 所有业务模块
5. `ui/dialogs.js`
6. `app/render.js`、`app/bootstrap.js`
7. Supabase public config、SDK、云同步模块

业务代码只调用 `saveState()`。云同步模块在应用启动后包装该函数，因此各业务模块不需要直接耦合 Supabase。


## 记账模块边界

- 页面：`index.html#accounting-section`
- 业务：`assets/js/modules/accounting.js`
- 样式：`assets/css/accounting.css`
- 数据兼容：`core/normalizers.js#normalizeAccountingState`
- 本地 / 云端保存：继续统一调用 `saveState()`，模块不直接耦合 Supabase
