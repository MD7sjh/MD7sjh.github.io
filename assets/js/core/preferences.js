/* Statistics range and sidebar preferences. */
'use strict';

function syncStatsModeButtons() {
  document.querySelectorAll('.stats-mode-btn').forEach(btn => {
    const active = btn.dataset.statsMode === statsMode;
    btn.classList.toggle('bg-dopamine-orange', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('shadow-soft', active);
    btn.classList.toggle('text-calm-mute', !active);
  });
}
function statsModeToDashboardDays(mode) { return mode === 'week' ? 7 : mode === 'month' ? 30 : 1; }
function syncDashboardRangeToStatsMode() {
  const el = $('dashboardRange');
  if (!el) return;
  const nextDays = String(statsModeToDashboardDays(statsMode));
  if (el.value !== nextDays) el.value = nextDays;
}
function setStatsMode(nextMode, { persist=true, rerender=true } = {}) {
  const mode = ['day','week','month'].includes(nextMode) ? nextMode : 'day';
  if (statsMode === mode) return;
  statsMode = mode;
  if (persist) localStorage.setItem(PREF_STATS_MODE_KEY, statsMode);
  syncStatsModeButtons();
  syncDashboardRangeToStatsMode();
  if (rerender) renderAll();
}
function applySidebarHidden(hidden) {
  const layout = $('appLayout');
  if (!layout) return;
  layout.classList.toggle('layout-sidebar-hidden', !!hidden);
  const btn = $('btnSidebarToggle');
  if (!btn) return;
  const label = hidden ? '显示边栏' : '隐藏边栏';
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.innerHTML = `<i class="fa-solid ${hidden ? 'fa-angles-right' : 'fa-angles-left'}"></i>`;
}
function toggleSidebar() {
  sidebarHidden = !sidebarHidden;
  localStorage.setItem(PREF_SIDEBAR_HIDDEN_KEY, sidebarHidden ? '1' : '0');
  applySidebarHidden(sidebarHidden);
}
function loadPrefs() {
  let storedMode = localStorage.getItem(PREF_STATS_MODE_KEY);
  let storedSidebar = localStorage.getItem(PREF_SIDEBAR_HIDDEN_KEY);
  if (storedMode == null || storedSidebar == null) {
    for (const legacyKey of (typeof LEGACY_STORAGE_KEYS !== 'undefined' ? LEGACY_STORAGE_KEYS : [])) {
      if (storedMode == null) storedMode = localStorage.getItem(`${legacyKey}__stats_mode`);
      if (storedSidebar == null) storedSidebar = localStorage.getItem(`${legacyKey}__sidebar_hidden`);
    }
  }
  statsMode = ['day','week','month'].includes(storedMode) ? storedMode : 'day';
  sidebarHidden = storedSidebar === '1';
  applySidebarHidden(sidebarHidden);
  syncStatsModeButtons();
  syncDashboardRangeToStatsMode();
}
