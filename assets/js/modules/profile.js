/* Auth-profile display name and personalized greeting. */
'use strict';

const WORKSPACE_PROFILE_NAME_KEY = `${STORAGE_KEY}__display_name`;
let workspaceDisplayName = localStorage.getItem(WORKSPACE_PROFILE_NAME_KEY) || '';

function getWorkspaceDisplayName() { return workspaceDisplayName || '朋友'; }
function setWorkspaceDisplayName(name='') {
  workspaceDisplayName = String(name || '').trim();
  if (workspaceDisplayName) localStorage.setItem(WORKSPACE_PROFILE_NAME_KEY, workspaceDisplayName);
  else localStorage.removeItem(WORKSPACE_PROFILE_NAME_KEY);
  renderWorkspaceGreeting();
}
function renderWorkspaceGreeting(date=new Date()) {
  const el = $('cuteGreeting');
  if (!el) return;
  const name = getWorkspaceDisplayName();
  const hour = date.getHours();
  const prefix = hour < 6 ? '夜深啦' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const emoji = hour < 6 ? '🌙' : hour < 12 ? '🌷' : hour < 18 ? '🌼' : '✨';
  el.textContent = `${prefix}，${name}！${emoji}`;
}
function applyAuthUserProfile(user) {
  if (!user) return;
  const metadataName = String(user.user_metadata?.display_name || user.user_metadata?.name || '').trim();
  const fallback = String(user.email || '').split('@')[0].trim();
  setWorkspaceDisplayName(metadataName || workspaceDisplayName || fallback || '朋友');
  const avatar = $('cuteAvatar');
  if (avatar) avatar.title = `当前用户：${getWorkspaceDisplayName()}`;
}
window.PERSONAL_WORKSPACE_PROFILE = {
  applyUser: applyAuthUserProfile,
  setName: setWorkspaceDisplayName,
  getName: getWorkspaceDisplayName,
  renderGreeting: renderWorkspaceGreeting
};
