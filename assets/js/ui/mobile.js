/** Mobile bottom navigation for the existing page sections. */
'use strict';

(() => {
  const primary = [
    ['home-section', '首页', 'fa-house'],
    ['workflow-section', '项目', 'fa-diagram-project'],
    ['thesis-section', '论文', 'fa-book-open'],
    ['habit-section', '健康', 'fa-heart-pulse']
  ];
  const more = [
    ['submission-section', '投稿管理'],
    ['care-section', '心灵关怀'],
    ['mentor-section', '导师管理'],
    ['review-section', '每日复盘'],
    ['achievement-section', '成就殿堂'],
    ['dashboard-section', '数据看板'],
    ['settings-section', '数据管理']
  ];

  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', '移动端主导航');
  nav.innerHTML = primary.map(([id, label, icon]) => `
    <button type="button" data-mobile-target="${id}"><i class="fa-solid ${icon}"></i><span>${label}</span></button>
  `).join('') + '<button type="button" id="mobileMoreBtn"><i class="fa-solid fa-ellipsis"></i><span>更多</span></button>';
  document.body.appendChild(nav);

  const sheet = document.createElement('div');
  sheet.className = 'mobile-more-sheet';
  sheet.hidden = true;
  sheet.innerHTML = `<div class="mobile-more-panel">
    <div class="mobile-more-head"><strong>更多功能</strong><button type="button" id="mobileMoreClose" aria-label="关闭">×</button></div>
    <div class="mobile-more-grid">${more.map(([id, label]) => `<button type="button" data-mobile-target="${id}">${label}</button>`).join('')}</div>
    <div class="mobile-account-actions">
      <button type="button" id="mobileSyncNow">立即同步</button>
      <button type="button" id="mobileLogout">退出登录</button>
    </div>
  </div>`;
  document.body.appendChild(sheet);

  function update(id = currentSection) {
    nav.querySelectorAll('[data-mobile-target]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mobileTarget === id);
    });
  }
  function go(id) {
    navTo(id);
    update(id);
    sheet.hidden = true;
  }

  document.querySelectorAll('[data-mobile-target]').forEach(btn => {
    btn.addEventListener('click', () => go(btn.dataset.mobileTarget));
  });
  document.getElementById('mobileMoreBtn').addEventListener('click', () => { sheet.hidden = false; });
  document.getElementById('mobileMoreClose').addEventListener('click', () => { sheet.hidden = true; });
  sheet.addEventListener('click', event => { if (event.target === sheet) sheet.hidden = true; });
  document.getElementById('mobileSyncNow').addEventListener('click', () => {
    const button = document.getElementById('cloudSyncNowBtn');
    if (button) button.click();
    else alert('请先登录云端账号。');
    sheet.hidden = true;
  });
  document.getElementById('mobileLogout').addEventListener('click', () => {
    const button = document.getElementById('cloudLogoutBtn');
    if (button) button.click();
    else alert('当前尚未登录。');
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => update(btn.dataset.target));
  });
  update();
})();
