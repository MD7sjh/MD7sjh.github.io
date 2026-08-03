/* Navigation, overview, attendance, and home summaries. */
'use strict';

function navTo(sectionId) {
  currentSection = sectionId;
  sections.forEach(id => $(id).classList.toggle('section-hidden', id !== sectionId));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.target === sectionId));
  if (sectionId === 'accounting-section') renderAccounting();
  if (sectionId === 'savings-section') renderSavings();
  if (sectionId === 'dashboard-section') renderDashboard();
  if (sectionId === 'settings-section') refreshSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateClock() {
  const d = new Date();
  const dateText = `${d.getFullYear()}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 周${'日一二三四五六'[d.getDay()]}`;
  $('sidebarNowDate').textContent = dateText;
  $('sidebarNowTime').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  if ($('cuteTopbarDate')) $('cuteTopbarDate').textContent = dateText;
  if ($('cuteGreeting')) {
    const hour = d.getHours();
    const hello = hour < 6 ? '夜深啦，博士生！🌙' : hour < 12 ? '早上好，博士生！🌷' : hour < 18 ? '下午好，博士生！🌼' : '晚上好，博士生！✨';
    $('cuteGreeting').textContent = hello;
  }
}
function renderSidebarSnapshot() {
  $('sbFocus').textContent = formatMinutes(focusMinutesOn());
  $('sbTask').textContent = activeTask()?.title || '无';
  $('sbHabit').textContent = `${todayHabitCompletion()}%`;
  $('sbReview').textContent = String(supportPageCountOn());
  $('sbSubmission').textContent = String(runningSubmissionCount());
  if ($('sbExpense')) $('sbExpense').textContent = formatAccountingMoney(accountingMonthTotals().expense, { compact:true });
  if ($('sbSavings')) $('sbSavings').textContent = formatSavingsMoney(savingsTotals().saved, { compact:true });
}
function renderHomeQuickLinks() {
  const cards = [
    { target:'workflow-section', label:'项目看板', value:`${openTasksList().length} 项`, color:'text-dopamine-pink', icon:'fa-diagram-project' },
    { target:'submission-section', label:'投稿项目', value:`${state.submissions.length} 项`, color:'text-dopamine-sky', icon:'fa-paper-plane' },
    { target:'accounting-section', label:'记账管理', value:`本月 ${formatAccountingMoney(accountingMonthTotals().expense, { compact:true })}`, color:'text-dopamine-pink', icon:'fa-wallet' },
    { target:'savings-section', label:'攒钱规划', value:`已攒 ${formatSavingsMoney(savingsTotals().saved, { compact:true })}`, color:'text-dopamine-mint', icon:'fa-piggy-bank' },
    { target:'thesis-section', label:'论文进度', value:`${thesisOverallProgress()}%`, color:'text-dopamine-purple', icon:'fa-book-open' },
    { target:'habit-section', label:'习惯完成度', value:`${todayHabitCompletion()}%`, color:'text-dopamine-mint', icon:'fa-leaf' },
    { target:'care-section', label:'心灵关怀', value: careCountOn() ? '已记录' : '待关照', color:'text-dopamine-mint', icon:'fa-seedling' },
    { target:'mentor-section', label:'导师沟通', value: mentorCountOn() ? '已梳理' : '待整理', color:'text-dopamine-purple', icon:'fa-user-tie' },
    { target:'review-section', label:'今日复盘', value: reviewCountOn() ? '已写' : '待写', color:'text-dopamine-pink', icon:'fa-heart' },
    { target:'dashboard-section', label:'数据看板', value:'查看趋势', color:'text-dopamine-purple', icon:'fa-chart-line' },
    { target:'settings-section', label:'数据管理', value:'备份 / 导入', color:'text-dopamine-orange', icon:'fa-database' }
  ];
  $('homeQuickLinks').innerHTML = cards.map(card => `
    <div class="overview-link small-stat p-3" data-target="${card.target}">
      <div class="flex items-center justify-between text-sm ${card.color}"><span class="font-black">${card.label}</span><i class="fa-solid ${card.icon}"></i></div>
      <div class="mt-2 font-black text-lg">${card.value}</div>
    </div>
  `).join('');
  $('homeQuickLinks').querySelectorAll('[data-target]').forEach(el => el.onclick = () => navTo(el.dataset.target));
}
function renderHomeThemeStats() {
  const range = getStatsRange(todayStr());
  if ($('homeStatsRangeLabel')) $('homeStatsRangeLabel').textContent = range.label;
  const days = Math.max(1, range.dates.length);
  const focusMins = range.dates.reduce((sum, d) => sum + focusMinutesOn(d), 0);
  const workMins = range.dates.reduce((sum, d) => sum + totalAttendanceMinutes(d), 0);
  const avgHabit = Math.round(range.dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / days);
  const careEntries = range.dates.reduce((sum, d) => sum + careCountOn(d), 0);
  const mentorEntries = range.dates.reduce((sum, d) => sum + mentorCountOn(d), 0);
  const reviewEntries = range.dates.reduce((sum, d) => sum + reviewCountOn(d), 0);
  const doneTasks = state.tasks.filter(t => t.doneAt && isDateInRange(dateFromDateTime(t.doneAt), range.start, range.end)).length;
  const newSubs = state.submissions.filter(s => s.createdAt && isDateInRange(dateFromDateTime(s.createdAt), range.start, range.end)).length;
  const savingsRangeEntries = savingsEntriesInRange(range.start, range.end);
  const savingsNet = savingsRangeEntries.reduce((sum, item) => sum + (item.type === 'withdrawal' ? -item.amount : item.amount), 0);
  const cards = [
    { label:`${statsModeText()}专注`, value: formatMinutes(focusMins), color:'text-dopamine-orange' },
    { label:`${statsModeText()}打卡`, value: formatMinutes(workMins), color:'text-dopamine-sky' },
    { label:`${statsModeText()}习惯均值`, value: `${avgHabit}%`, color:'text-dopamine-mint' },
    { label:`${statsModeText()}心灵关怀`, value: careEntries, color:'text-dopamine-mint' },
    { label:`${statsModeText()}导师沟通`, value: mentorEntries, color:'text-dopamine-purple' },
    { label:`${statsModeText()}复盘`, value: reviewEntries, color:'text-dopamine-pink' },
    { label:`${statsModeText()}完成任务`, value: doneTasks, color:'text-dopamine-purple' },
    { label:`${statsModeText()}新增投稿`, value: newSubs, color:'text-dopamine-sky' },
    { label:`${statsModeText()}净攒入`, value: formatSavingsMoney(savingsNet, { compact:true }), color:savingsNet >= 0 ? 'text-emerald-600' : 'text-rose-600' }
  ];
  $('homeThemeStats').innerHTML = cards.map(item => `
    <div class="small-stat p-4">
      <div class="text-sm text-calm-mute">${item.label}</div>
      <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
    </div>
  `).join('');
}
function addWorkLog() {
  const day = getDayAttendance();
  day.logs.push({ id:uid('work'), date:todayStr(), start:nowTime(), end:null, note:'' });
  saveState(); renderAll();
}
function endWorkLog() {
  const open = [...todayOpenLogs()].pop();
  if (!open) { alert('今天没有进行中的工作段。'); return; }
  open.end = nowTime();
  saveState(); renderAll();
}
function addLeave() {
  const day = getDayAttendance();
  day.leaves.push({ id:uid('leave'), date:todayStr(), type:$('leaveTypeSelect').value || '其他' });
  saveState(); renderAll();
}
function closeAllOpenLogs() {
  const now = nowTime();
  todayOpenLogs().forEach(log => { log.end = now; });
  saveState(); renderAll();
}
function clearTodayLeaves() {
  getDayAttendance().leaves = [];
  saveState(); renderAll();
}
function renderHomeAttendance() {
  const day = getDayAttendance();
  $('todayCheckinCount').textContent = String(day.logs.length);
  $('todayWorkMinutes').textContent = formatMinutes(totalAttendanceMinutes());
  $('todayLeaveCount').textContent = String(day.leaves.length);
  $('todayOpenLogCount').textContent = String(todayOpenLogs().length);
  const logHtml = sortByTime(day.logs).map(log => `
    <div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 border border-calm-line">
      <div>
        <div class="font-bold">工作段 <span class="text-xs text-calm-mute">${log.start}${log.end ? ` - ${log.end}` : ' - 进行中'}</span></div>
        <div class="text-xs text-calm-mute">${log.end ? formatMinutes(minutesBetween(log.start, log.end)) : '尚未结束'}</div>
      </div>
      <button class="text-sm font-bold text-dopamine-orange" data-edit-log="${log.id}">修改</button>
    </div>
  `).join('');
  const leaveHtml = day.leaves.map(item => `
    <div class="flex items-center justify-between gap-3 rounded-2xl bg-purple-50 px-3 py-3 border border-purple-100">
      <div><div class="font-bold text-dopamine-purple">请假：${item.type}</div><div class="text-xs text-calm-mute">${item.date}</div></div>
      <button class="text-sm font-bold text-dopamine-orange" data-edit-leave="${item.id}">修改</button>
    </div>
  `).join('');
  $('todayAttendanceList').innerHTML = logHtml + leaveHtml || '<div class="text-calm-mute text-sm">今天还没有记录。</div>';
  $('todayAttendanceList').querySelectorAll('[data-edit-log]').forEach(btn => btn.onclick = () => openWorkLogEditor(btn.dataset.editLog));
  $('todayAttendanceList').querySelectorAll('[data-edit-leave]').forEach(btn => btn.onclick = () => openLeaveEditor(btn.dataset.editLeave));
}
