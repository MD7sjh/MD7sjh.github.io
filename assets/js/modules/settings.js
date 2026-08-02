/* JSON backup/import and data management. */
'use strict';

function renderSettingsRangeStats() {
  const range = getStatsRange(todayStr());
  if ($('settingsStatsRangeLabel')) $('settingsStatsRangeLabel').textContent = range.label;
  const createdTasks = state.tasks.filter(t => t.createdAt && isDateInRange(dateFromDateTime(t.createdAt), range.start, range.end)).length;
  const doneTasks = state.tasks.filter(t => t.doneAt && isDateInRange(dateFromDateTime(t.doneAt), range.start, range.end)).length;
  const newSubs = state.submissions.filter(s => s.createdAt && isDateInRange(dateFromDateTime(s.createdAt), range.start, range.end)).length;
  const thesisLogs = (state.thesis?.logs || []).filter(l => isDateInRange(l.date, range.start, range.end)).length;
  const careLogs = range.dates.reduce((sum, date) => sum + careCountOn(date), 0);
  const mentorLogs = range.dates.reduce((sum, date) => sum + mentorCountOn(date), 0);
  const moneyItems = (state.accounting?.transactions || []).filter(item => isDateInRange(item.date, range.start, range.end));
  const moneyExpense = moneyItems.filter(item => item.type === 'expense').reduce((sum,item)=>sum+item.amount,0);
  const cards = [
    { label:`${statsModeText()}新增任务`, value: createdTasks, color:'text-dopamine-pink' },
    { label:`${statsModeText()}完成任务`, value: doneTasks, color:'text-dopamine-mint' },
    { label:`${statsModeText()}新增投稿`, value: newSubs, color:'text-dopamine-sky' },
    { label:`${statsModeText()}论文日志`, value: thesisLogs, color:'text-dopamine-purple' },
    { label:`${statsModeText()}心灵关怀`, value: careLogs, color:'text-dopamine-yellow' },
    { label:`${statsModeText()}导师沟通`, value: mentorLogs, color:'text-dopamine-orange' },
    { label:`${statsModeText()}记账笔数`, value: moneyItems.length, color:'text-dopamine-pink' },
    { label:`${statsModeText()}支出`, value: formatAccountingMoney(moneyExpense, { compact:true }), color:'text-rose-600' }
  ];
  $('settingsRangeStats').innerHTML = cards.map(item => `
    <div class="rounded-2xl bg-white border border-calm-line px-3 py-3">
      <div class="text-xs text-calm-mute">${item.label}</div>
      <div class="text-xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
    </div>
  `).join('');
}
function refreshSettings() {
  const raw = localStorage.getItem(STORAGE_KEY) || '{}';
  $('jsonEditor').value = raw;
  $('storageSizeText').textContent = bytesToKB(new Blob([raw]).size);
  $('settingsRefreshTime').textContent = nowDateTime();
  $('settingsSummary').innerHTML = [
    ['工作打卡', Object.values(state.attendance).reduce((sum,day)=>sum+(day.logs?.length||0),0)],
    ['请假记录', Object.values(state.attendance).reduce((sum,day)=>sum+(day.leaves?.length||0),0)],
    ['任务数', state.tasks.length],
    ['项目数', state.projects.length],
    ['专注记录', state.focus.sessions.length],
    ['饮食记录', state.foods.length],
    ['体重记录', state.weights.length],
    ['心灵关怀', Object.keys(state.care?.entries || {}).filter(date => careCountOn(date)).length],
    ['导师沟通', Object.keys(state.mentor?.entries || {}).filter(date => mentorCountOn(date)).length],
    ['每日复盘', Object.keys(state.reviewDaily?.entries || {}).filter(date => reviewCountOn(date)).length],
    ['投稿项目', state.submissions.length],
    ['论文日志', state.thesis?.logs?.length || 0],
    ['记账记录', state.accounting?.transactions?.length || 0]
  ].map(([label,value]) => `<div class="rounded-2xl bg-white border border-calm-line px-3 py-3"><div class="text-xs text-calm-mute">${label}</div><div class="text-xl font-black">${value}</div></div>`).join('');
}
function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `phd_workspace_backup_${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url);
}
async function copyJson() {
  await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  alert('已复制到剪贴板。');
}
function importJsonText(raw) {
  try {
    const parsed = JSON.parse(raw);
    const next = {
      attendance: normalizeAttendance(parsed.attendance),
      timeBlocks: parsed.timeBlocks && typeof parsed.timeBlocks === 'object' ? parsed.timeBlocks : {},
      tasks: normalizeTasksState(parsed.tasks),
      projects: normalizeProjectsState(parsed.projects),
      focus: parsed.focus && typeof parsed.focus === 'object' ? { active: parsed.focus.active || null, sessions: Array.isArray(parsed.focus.sessions) ? parsed.focus.sessions : [] } : { active:null, sessions:[] },
      habits: normalizeHabitsState(parsed.habits),
      foods: Array.isArray(parsed.foods) ? parsed.foods : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights.map(item => ({
        id: String(item.id || uid('weight')),
        date: String(item.date || dateFromDateTime(item.at) || todayStr()),
        value: Math.max(0, Number(item.value) || 0),
        unit: ['kg','斤','lb'].includes(item.unit) ? item.unit : 'kg',
        at: String(item.at || nowDateTime())
      })).filter(item => item.value > 0) : [],
      mood: normalizeMoodMap(parsed.mood),
      reflections: normalizeReflectionMap(parsed.reflections),
      care: normalizeCareState(parsed.care, parsed.mood),
      mentor: normalizeMentorState(parsed.mentor),
      reviewDaily: normalizeDailyReviewState(parsed.reviewDaily, parsed.reflections),
      submissions: normalizeSubmissions(parsed.submissions),
      accounting: normalizeAccountingState(parsed.accounting),
      thesis: normalizeThesisState(parsed.thesis)
    };
    Object.keys(state).forEach(key => delete state[key]);
    Object.assign(state, next);
    saveState(); renderAll(); alert('导入完成。');
  } catch (err) { alert('JSON 导入失败，请检查格式。'); }
}
function clearAllData() {
  if (!confirm('确定清空全部数据吗？此操作不可撤销。')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}
