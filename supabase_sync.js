/*
 * PhD Master Workspace · Supabase 登录与云同步插件
 * 放置位置：与 index.html 同一目录
 *
 * 说明：
 * 1. 该文件必须在原工作台脚本执行完后加载。
 * 2. Supabase Publishable Key 本来就是给浏览器使用的；真正的数据安全依赖 RLS。
 * 3. 当前同步方式是一名用户对应一条 JSONB 数据，适合个人工作台。
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://zetpuzkejljlacnaqnfi.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_sSiDe3a9MaH2ErBgYFMMGA_L2idCTag';
  const CLOUD_TABLE = 'workspace_state';
  const SAVE_DELAY_MS = 900;

  if (!window.supabase?.createClient) {
    console.error('[Cloud Sync] Supabase SDK 未加载。');
    alert('Supabase SDK 未加载，请检查网络或 HTML 中的脚本顺序。');
    return;
  }

  // 这些变量和函数来自原始“博士工作台 2.0.html”。
  if (
    typeof STORAGE_KEY === 'undefined' ||
    typeof state === 'undefined' ||
    typeof saveState !== 'function' ||
    typeof loadState !== 'function' ||
    typeof renderAll !== 'function'
  ) {
    console.error('[Cloud Sync] 未找到原工作台的全局状态或函数。');
    alert('云同步插件必须放在原工作台脚本之后加载。');
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  // 方便在浏览器控制台调试，但不包含任何管理员密钥。
  window.phdSupabase = client;

  const SYNC_META_KEY = `${STORAGE_KEY}__supabase_sync_meta`;
  const originalSaveState = saveState;

  let currentUser = null;
  let saveTimer = null;
  let dirty = false;
  let saving = false;
  let localRevision = 0;
  let lastCloudUpdatedAt = '';
  let lastRefreshAt = 0;
  let handlingSession = false;

  function injectUi() {
    const style = document.createElement('style');
    style.textContent = `
      .cloud-auth-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background:
          radial-gradient(circle at top left, rgba(255,140,66,.24), transparent 38%),
          radial-gradient(circle at bottom right, rgba(155,93,229,.22), transparent 40%),
          rgba(247,248,252,.96);
        backdrop-filter: blur(14px);
      }
      .cloud-auth-overlay[hidden] { display: none !important; }
      .cloud-auth-card {
        width: min(430px, 100%);
        padding: 28px;
        border-radius: 26px;
        background: rgba(255,255,255,.96);
        border: 1px solid rgba(255,255,255,.9);
        box-shadow: 0 28px 80px -30px rgba(40,45,70,.36);
      }
      .cloud-auth-logo {
        width: 58px;
        height: 58px;
        border-radius: 20px;
        margin: 0 auto 14px;
        display: grid;
        place-items: center;
        color: white;
        font-size: 24px;
        background: linear-gradient(135deg, #FF8C42, #FF6B8B);
        box-shadow: 0 16px 30px -16px rgba(255,107,139,.8);
      }
      .cloud-auth-title {
        margin: 0;
        text-align: center;
        font-size: 25px;
        font-weight: 900;
        color: #45495F;
      }
      .cloud-auth-subtitle {
        margin: 8px 0 22px;
        text-align: center;
        color: #8A8FA6;
        font-size: 14px;
        line-height: 1.65;
      }
      .cloud-field {
        width: 100%;
        box-sizing: border-box;
        margin-top: 10px;
        padding: 13px 15px;
        border-radius: 15px;
        border: 1px solid #E4E7F0;
        background: #fff;
        color: #45495F;
        font-size: 16px;
        outline: none;
      }
      .cloud-field:focus {
        border-color: #9B5DE5;
        box-shadow: 0 0 0 4px rgba(155,93,229,.10);
      }
      .cloud-auth-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
      }
      .cloud-btn {
        border: 0;
        border-radius: 15px;
        padding: 12px 14px;
        font-weight: 850;
        cursor: pointer;
      }
      .cloud-btn:disabled { opacity: .55; cursor: wait; }
      .cloud-btn-primary {
        color: white;
        background: linear-gradient(90deg, #9B5DE5, #4D9DE0);
      }
      .cloud-btn-secondary {
        color: #45495F;
        background: #F3F4F8;
        border: 1px solid #E4E7F0;
      }
      .cloud-btn-link {
        width: 100%;
        margin-top: 9px;
        color: #8A8FA6;
        background: transparent;
        font-weight: 700;
      }
      .cloud-auth-message {
        min-height: 22px;
        margin-top: 13px;
        text-align: center;
        font-size: 13px;
        color: #8A8FA6;
        line-height: 1.55;
      }
      .cloud-status-badge {
        position: fixed;
        z-index: 9990;
        top: 12px;
        right: 12px;
        max-width: calc(100vw - 24px);
        padding: 8px 12px;
        border: 1px solid rgba(228,231,240,.9);
        border-radius: 999px;
        background: rgba(255,255,255,.92);
        box-shadow: 0 12px 30px -20px rgba(20,25,50,.45);
        backdrop-filter: blur(12px);
        color: #8A8FA6;
        font-size: 12px;
        font-weight: 800;
      }
      .cloud-status-badge[data-tone="ok"] { color: #27886D; }
      .cloud-status-badge[data-tone="busy"] { color: #4D9DE0; }
      .cloud-status-badge[data-tone="warn"] { color: #E57A2E; }
      .cloud-status-badge[data-tone="error"] { color: #DC4C64; }
      .cloud-account-card {
        margin-top: 14px;
        padding: 13px;
        border-radius: 16px;
        border: 1px solid #ECEEF5;
        background: rgba(255,255,255,.78);
        font-size: 12px;
      }
      .cloud-account-card[hidden] { display: none !important; }
      .cloud-account-email {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 850;
        color: #45495F;
      }
      .cloud-account-status {
        margin-top: 5px;
        color: #8A8FA6;
      }
      .cloud-account-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
        margin-top: 10px;
      }
      .cloud-account-actions button {
        padding: 8px 9px;
        border-radius: 11px;
        border: 1px solid #E4E7F0;
        background: white;
        color: #45495F;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }
      @media (max-width: 480px) {
        .cloud-auth-card { padding: 23px 18px; border-radius: 22px; }
        .cloud-auth-actions { grid-template-columns: 1fr; }
        .cloud-status-badge { top: auto; bottom: 12px; }
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'cloudAuthOverlay';
    overlay.className = 'cloud-auth-overlay';
    overlay.innerHTML = `
      <div class="cloud-auth-card">
        <div class="cloud-auth-logo">🎓</div>
        <h1 class="cloud-auth-title">博士工作台</h1>
        <p class="cloud-auth-subtitle">
          登录后，任务、论文进度、投稿和复盘数据会在电脑与手机之间同步。
        </p>
        <input id="cloudAuthEmail" class="cloud-field" type="email"
               autocomplete="email" placeholder="邮箱">
        <input id="cloudAuthPassword" class="cloud-field" type="password"
               autocomplete="current-password" placeholder="密码（至少 6 位）">
        <div class="cloud-auth-actions">
          <button id="cloudLoginBtn" class="cloud-btn cloud-btn-primary">登录</button>
          <button id="cloudSignupBtn" class="cloud-btn cloud-btn-secondary">首次注册</button>
        </div>
        <button id="cloudOfflineBtn" class="cloud-btn cloud-btn-link">
          暂时离线使用本机数据
        </button>
        <div id="cloudAuthMessage" class="cloud-auth-message"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const badge = document.createElement('div');
    badge.id = 'cloudStatusBadge';
    badge.className = 'cloud-status-badge';
    badge.dataset.tone = 'busy';
    badge.textContent = '正在检查登录状态…';
    document.body.appendChild(badge);

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      const account = document.createElement('div');
      account.id = 'cloudAccountCard';
      account.className = 'cloud-account-card';
      account.hidden = true;
      account.innerHTML = `
        <div class="cloud-account-email" id="cloudAccountEmail">—</div>
        <div class="cloud-account-status" id="cloudAccountStatus">未同步</div>
        <div class="cloud-account-actions">
          <button id="cloudSyncNowBtn">立即同步</button>
          <button id="cloudLogoutBtn">退出登录</button>
        </div>
      `;
      sidebar.appendChild(account);
    }

    document.getElementById('cloudLoginBtn')?.addEventListener('click', signIn);
    document.getElementById('cloudSignupBtn')?.addEventListener('click', signUp);
    document.getElementById('cloudOfflineBtn')?.addEventListener('click', () => {
      hideAuth();
      setStatus('离线模式：数据只保存在本机', 'warn');
    });
    document.getElementById('cloudSyncNowBtn')?.addEventListener('click', () => saveCloudState(true));
    document.getElementById('cloudLogoutBtn')?.addEventListener('click', signOut);

    document.getElementById('cloudAuthPassword')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') signIn();
    });
  }

  function setAuthMessage(message, tone = 'normal') {
    const el = document.getElementById('cloudAuthMessage');
    if (!el) return;
    el.textContent = message || '';
    el.style.color =
      tone === 'error' ? '#DC4C64' :
      tone === 'ok' ? '#27886D' :
      tone === 'warn' ? '#E57A2E' :
      '#8A8FA6';
  }

  function setAuthBusy(busy) {
    const login = document.getElementById('cloudLoginBtn');
    const signup = document.getElementById('cloudSignupBtn');
    if (login) login.disabled = busy;
    if (signup) signup.disabled = busy;
  }

  function showAuth(message = '') {
    const overlay = document.getElementById('cloudAuthOverlay');
    if (overlay) overlay.hidden = false;
    if (message) setAuthMessage(message);
  }

  function hideAuth() {
    const overlay = document.getElementById('cloudAuthOverlay');
    if (overlay) overlay.hidden = true;
  }

  function setStatus(message, tone = 'normal') {
    const badge = document.getElementById('cloudStatusBadge');
    if (badge) {
      badge.textContent = message;
      badge.dataset.tone = tone;
    }
    const side = document.getElementById('cloudAccountStatus');
    if (side) side.textContent = message;
  }

  function setAccount(user) {
    const card = document.getElementById('cloudAccountCard');
    const email = document.getElementById('cloudAccountEmail');
    if (card) card.hidden = !user;
    if (email) email.textContent = user?.email || '已登录';
  }

  function readMeta() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function writeMeta(extra = {}) {
    const current = readMeta();
    const next = {
      ...current,
      ...extra,
      userId: currentUser?.id || current.userId || '',
      lastCloudUpdatedAt:
        extra.lastCloudUpdatedAt ??
        lastCloudUpdatedAt ??
        current.lastCloudUpdatedAt ??
        ''
    };
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
  }

  function hasMeaningfulState(candidate) {
    if (!candidate || typeof candidate !== 'object') return false;
    return Boolean(
      candidate.tasks?.length ||
      candidate.projects?.length ||
      candidate.focus?.sessions?.length ||
      candidate.foods?.length ||
      candidate.weights?.length ||
      candidate.submissions?.length ||
      candidate.thesis?.logs?.length ||
      Object.keys(candidate.attendance || {}).length ||
      Object.keys(candidate.timeBlocks || {}).length ||
      Object.keys(candidate.habits?.entries || {}).length ||
      Object.keys(candidate.care?.entries || {}).length ||
      Object.keys(candidate.mentor?.entries || {}).length ||
      Object.keys(candidate.reviewDaily?.entries || {}).length
    );
  }

  function cloudStateIsEmpty(raw) {
    return !raw || typeof raw !== 'object' || Object.keys(raw).length === 0;
  }

  function replaceStateInPlace(rawState) {
    // 借用原网页自己的 loadState() 完成兼容和字段清洗。
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawState || {}));
    const normalized = loadState();

    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, normalized);

    originalSaveState();
    dirty = false;
    renderAll();
  }

  async function queryCloudRow() {
    const { data, error } = await client
      .from(CLOUD_TABLE)
      .select('state, updated_at')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function saveCloudState(force = false) {
    if (!currentUser || saving || (!dirty && !force)) return;

    if (!navigator.onLine) {
      setStatus('离线：已保存在本机，联网后再同步', 'warn');
      return;
    }

    saving = true;
    const revisionAtStart = localRevision;
    setStatus('正在同步…', 'busy');

    try {
      const timestamp = new Date().toISOString();
      const { data, error } = await client
        .from(CLOUD_TABLE)
        .upsert(
          {
            user_id: currentUser.id,
            state,
            updated_at: timestamp
          },
          { onConflict: 'user_id' }
        )
        .select('updated_at')
        .single();

      if (error) throw error;

      lastCloudUpdatedAt = data?.updated_at || timestamp;
      writeMeta({ lastCloudUpdatedAt });

      if (revisionAtStart === localRevision) {
        dirty = false;
        setStatus('云端已同步', 'ok');
      } else {
        dirty = true;
        setStatus('有新的本机修改，继续同步…', 'busy');
        scheduleCloudSave();
      }
    } catch (error) {
      console.error('[Cloud Sync] 保存失败：', error);
      setStatus(`同步失败：${error.message || '请检查网络与 RLS'}`, 'error');
    } finally {
      saving = false;
    }
  }

  function scheduleCloudSave() {
    clearTimeout(saveTimer);
    if (!currentUser) return;
    saveTimer = setTimeout(() => saveCloudState(false), SAVE_DELAY_MS);
  }

  // 保留原网页所有 saveState() 调用，同时额外安排云端同步。
  saveState = function patchedSaveState(...args) {
    const result = originalSaveState.apply(this, args);
    dirty = true;
    localRevision += 1;
    setStatus(currentUser ? '等待同步…' : '仅保存在本机', currentUser ? 'busy' : 'warn');
    scheduleCloudSave();
    return result;
  };

  async function loadCloudForCurrentUser() {
    if (!currentUser) return;

    setStatus('正在读取云端数据…', 'busy');
    setAuthMessage('正在读取云端数据，请稍候…');

    try {
      const row = await queryCloudRow();
      const meta = readMeta();
      const localHasData = hasMeaningfulState(state);
      const cloudHasData = row && !cloudStateIsEmpty(row.state);

      if (!row || !cloudHasData) {
        // 第一次使用：云端为空，直接把当前浏览器的数据上传。
        dirty = true;
        await saveCloudState(true);
        writeMeta({ userId: currentUser.id });
        hideAuth();
        return;
      }

      // 若这是第一次在当前浏览器绑定此账号，且本机也有旧数据，避免静默覆盖。
      if (localHasData && meta.userId !== currentUser.id) {
        const uploadLocal = window.confirm(
          '检测到“本机数据”和“云端数据”同时存在。\n\n' +
          '点击“确定”：使用本机数据覆盖云端。\n' +
          '点击“取消”：使用云端数据覆盖本机。\n\n' +
          '不确定时建议先取消，并在数据管理里导出 JSON 备份。'
        );

        if (uploadLocal) {
          dirty = true;
          await saveCloudState(true);
        } else {
          replaceStateInPlace(row.state);
        }
      } else {
        replaceStateInPlace(row.state);
      }

      lastCloudUpdatedAt = row.updated_at || '';
      writeMeta({
        userId: currentUser.id,
        lastCloudUpdatedAt
      });
      setStatus('云端数据已加载', 'ok');
      hideAuth();
    } catch (error) {
      console.error('[Cloud Sync] 读取失败：', error);
      setStatus(`读取失败：${error.message || '请检查数据库设置'}`, 'error');
      setAuthMessage(
        `读取云端失败：${error.message || '请确认 SQL 和 RLS 已执行'}。你可以暂时离线进入。`,
        'error'
      );
      showAuth();
    }
  }

  async function refreshFromCloudIfNewer() {
    if (!currentUser || saving || !navigator.onLine) return;

    const now = Date.now();
    if (now - lastRefreshAt < 5000) return;
    lastRefreshAt = now;

    try {
      const row = await queryCloudRow();
      if (!row?.updated_at || !row?.state) return;

      const remoteTime = Date.parse(row.updated_at) || 0;
      const knownTime = Date.parse(lastCloudUpdatedAt || readMeta().lastCloudUpdatedAt || '') || 0;
      if (remoteTime <= knownTime) return;

      if (dirty) {
        const useRemote = window.confirm(
          '云端存在其他设备刚保存的新版本，同时本机也有未同步修改。\n\n' +
          '点击“确定”使用云端版本；点击“取消”保留本机版本并上传。'
        );
        if (!useRemote) {
          await saveCloudState(true);
          return;
        }
      }

      replaceStateInPlace(row.state);
      lastCloudUpdatedAt = row.updated_at;
      writeMeta({ lastCloudUpdatedAt });
      setStatus('已读取其他设备的新版本', 'ok');
    } catch (error) {
      console.warn('[Cloud Sync] 自动刷新失败：', error);
    }
  }

  async function signUp() {
    const email = document.getElementById('cloudAuthEmail')?.value.trim();
    const password = document.getElementById('cloudAuthPassword')?.value || '';

    if (!email || password.length < 6) {
      setAuthMessage('请输入有效邮箱和至少 6 位密码。', 'error');
      return;
    }

    setAuthBusy(true);
    setAuthMessage('正在注册…');

    try {
      const redirectTo = window.location.href.split('#')[0];
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo }
      });
      if (error) throw error;

      if (data.session) {
        setAuthMessage('注册成功，正在进入工作台…', 'ok');
      } else {
        setAuthMessage('注册成功。请先打开验证邮件，确认后再回来登录。', 'ok');
      }
    } catch (error) {
      setAuthMessage(`注册失败：${error.message || '未知错误'}`, 'error');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signIn() {
    const email = document.getElementById('cloudAuthEmail')?.value.trim();
    const password = document.getElementById('cloudAuthPassword')?.value || '';

    if (!email || !password) {
      setAuthMessage('请输入邮箱和密码。', 'error');
      return;
    }

    setAuthBusy(true);
    setAuthMessage('正在登录…');

    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthMessage('登录成功，正在读取数据…', 'ok');
    } catch (error) {
      setAuthMessage(`登录失败：${error.message || '请检查邮箱和密码'}`, 'error');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (!window.confirm('确定退出登录吗？退出前会先尝试同步，并清除本机工作台缓存。')) return;

    await saveCloudState(true);
    const { error } = await client.auth.signOut();
    if (error) {
      alert(`退出失败：${error.message}`);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_META_KEY);
    location.reload();
  }

  async function clearCloudAndLocalData() {
    if (!window.confirm('确定清空全部本地与云端工作台数据吗？此操作不可撤销。')) return;

    try {
      if (currentUser) {
        const { error } = await client
          .from(CLOUD_TABLE)
          .delete()
          .eq('user_id', currentUser.id);
        if (error) throw error;
      }

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SYNC_META_KEY);
      location.reload();
    } catch (error) {
      alert(`清空失败：${error.message || '请检查删除权限策略'}`);
    }
  }

  async function handleSession(session) {
    if (handlingSession) return;
    handlingSession = true;

    try {
      if (!session?.user) {
        currentUser = null;
        setAccount(null);
        setStatus('未登录', 'warn');
        showAuth();
        return;
      }

      const sameUser = currentUser?.id === session.user.id;
      currentUser = session.user;
      setAccount(currentUser);
      showAuth('登录成功，正在读取云端数据…');

      if (!sameUser || !lastCloudUpdatedAt) {
        await loadCloudForCurrentUser();
      } else {
        hideAuth();
      }
    } finally {
      handlingSession = false;
    }
  }

  async function initialize() {
    injectUi();

    // 原网页在 bindEvents() 中已经绑定了旧清空函数，这里换成云端+本地同时清空。
    const clearButton = document.getElementById('btnClearAllData');
    if (clearButton) clearButton.onclick = clearCloudAndLocalData;

    window.addEventListener('online', () => {
      setStatus(currentUser ? '网络已恢复，准备同步…' : '网络已恢复', 'busy');
      if (dirty) scheduleCloudSave();
      refreshFromCloudIfNewer();
    });

    window.addEventListener('offline', () => {
      setStatus('离线：修改会先保存在本机', 'warn');
    });

    window.addEventListener('focus', refreshFromCloudIfNewer);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshFromCloudIfNewer();
    });

    const { data, error } = await client.auth.getSession();
    if (error) {
      console.error('[Cloud Sync] 获取会话失败：', error);
      setAuthMessage(`无法检查登录状态：${error.message}`, 'error');
      showAuth();
    } else {
      await handleSession(data.session);
    }

    client.auth.onAuthStateChange((_event, session) => {
      // 避免在 Supabase 的回调锁中执行额外异步请求。
      setTimeout(() => handleSession(session), 0);
    });
  }

  initialize().catch(error => {
    console.error('[Cloud Sync] 初始化失败：', error);
    setStatus(`初始化失败：${error.message || '未知错误'}`, 'error');
    showAuth(`初始化失败：${error.message || '未知错误'}`);
  });
})();
