/* Focus timer and schedule timeline. */
'use strict';

function startFocusTicker() {
  stopFocusTicker();
  focusInterval = setInterval(renderFocusTimer, 1000);
  renderFocusTimer();
}
function stopFocusTicker() { if (focusInterval) { clearInterval(focusInterval); focusInterval = null; } }
function renderFocusTimer() {
  const active = state.focus.active;
  if (!active) {
    $('focusClock').textContent = '00:00:00';
    $('focusStatusPill').textContent = '未开始';
    return;
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - active.startedAtTs) / 1000));
  const h = Math.floor(elapsed/3600), m = Math.floor((elapsed%3600)/60), s = elapsed%60;
  $('focusClock').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  $('focusStatusPill').textContent = '进行中';
}
function startFocus() {
  if (state.focus.active) { alert('已经有进行中的专注了。'); return; }
  const linkedTask = activeTask();
  const title = $('focusTitle').value.trim() || linkedTask?.title || '未命名专注';
  state.focus.active = {
    id: uid('focus'),
    title,
    category: $('focusCategory').value,
    note: $('focusNote').value.trim(),
    date: todayStr(),
    start: nowTime(),
    startedAtTs: Date.now(),
    taskId: linkedTask?.id || null
  };
  saveState(); renderAll();
  startFocusTicker();
}
function stopFocus(shouldRender=true) {
  const active = state.focus.active;
  if (!active) return;
  const end = nowTime();
  const mins = Math.max(1, Math.round((Date.now() - active.startedAtTs) / 60000));
  recordFocusRun({ id: active.id, date: active.date, title: active.title, category: active.category, note: active.note, start: active.start, end, minutes: mins, taskId: active.taskId || '' });
  const linkedTask = state.tasks.find(task => task.id === active.taskId);
  if (linkedTask && linkedTask.status === 'active') linkedTask.status = 'todo';
  state.focus.active = null;
  saveState();
  if (shouldRender) renderAll();
  stopFocusTicker();
}
function discardFocus() {
  const active = state.focus.active;
  const linkedTask = state.tasks.find(task => task.id === active?.taskId);
  if (linkedTask && linkedTask.status === 'active') linkedTask.status = 'todo';
  state.focus.active = null;
  saveState(); renderAll();
  stopFocusTicker();
}
function addManualFocus() {
  const date = $('manualFocusDate').value || todayStr();
  const title = $('manualFocusTitle').value.trim();
  const start = parseHM($('manualFocusStart').value);
  const end = parseHM($('manualFocusEnd').value);
  if (!title || !start || !end) { alert('请至少填写日期、主题、开始和结束时间。'); return; }
  state.focus.sessions.unshift({ id:uid('focus'), date, title, category:'other', note:'手动补录', start, end, minutes:minutesBetween(start,end) });
  $('manualFocusTitle').value = '';
  saveState(); renderAll();
}
function renderFocusTimeline() {
  renderFocusTimer();
  const todaySessions = state.focus.sessions.filter(s => s.date === todayStr());
  $('focusTodaySummary').textContent = `今日 ${formatMinutes(focusMinutesOn())}`;
  $('focusTimeline').innerHTML = todaySessions.map(item => `
    <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
      <div>
        <div class="font-bold">${escapeHtml(item.title)}</div>
        <div class="text-xs text-calm-mute mt-1">${item.start} - ${item.end} · ${formatMinutes(item.minutes)}</div>
      </div>
      <button class="text-sm font-bold text-dopamine-orange" data-focus-edit="${item.id}">修改</button>
    </div>
  `).join('') || '<div class="text-sm text-calm-mute">今天还没有专注记录。</div>';
  $('focusTimeline').querySelectorAll('[data-focus-edit]').forEach(btn => btn.onclick = () => openFocusEditor(btn.dataset.focusEdit));
  if (state.focus.active) startFocusTicker(); else stopFocusTicker();
}
function schedulePlannerTasks() {
  return todayExecutionTasks().filter(task => task.status !== 'done');
}
function renderSchedulePlanner() {
  const select = $('scheduleTaskSelect');
  if (!select) return;
  const date = $('scheduleDate').value || todayStr();
  const blocks = sortByTime(getDayTimeBlocks(date));
  const tasks = schedulePlannerTasks();
  const selected = select.value;
  select.innerHTML = '<option value="">从今日执行选择</option>' + tasks.map(task => {
    const project = projectById(task.projectId);
    const today = todayBucketMeta(task.todayBucket);
    const label = `${today.short} · ${project ? `${project.title} / ` : ''}${task.title}${task.estimate ? ` · ${task.estimate}分钟` : ''}`;
    return `<option value="${task.id}" ${task.id===selected?'selected':''}>${escapeHtml(label)}</option>`;
  }).join('');
  if (selected && !tasks.some(task => task.id === selected)) select.value = '';
  const scheduledMinutes = blocks.reduce((sum, item) => sum + minutesBetween(item.start, item.end), 0);
  $('schedulePlanSummary').textContent = `${blocks.length} 个时间块 · ${formatMinutes(scheduledMinutes)}`;
}
function addScheduledTaskBlock() {
  const date = $('scheduleDate').value || todayStr();
  const task = state.tasks.find(item => item.id === $('scheduleTaskSelect').value);
  const start = parseHM($('scheduleTaskStart').value);
  let end = parseHM($('scheduleTaskEnd').value);
  const title = $('scheduleTaskTitle').value.trim() || task?.title || '';
  if (start && !end && task?.estimate) end = addMinutesToHM(start, task.estimate);
  if (!start || !end || !title) { alert('请选择任务或填写标题，并设置开始 / 结束时间。'); return; }
  getDayTimeBlocks(date).push({
    id: uid('block'),
    taskId: task?.id || '',
    start,
    end,
    title,
    color: task ? blockColorForTask(task) : '#4D9DE0'
  });
  if (task) {
    if (!task.todayBucket) task.todayBucket = 'should';
    if (task.gtdBucket === 'inbox') task.gtdBucket = 'next';
  }
  $('scheduleTaskTitle').value = '';
  saveState();
  renderAll();
}
function renderTimeline() {
  const date = $('scheduleDate').value || todayStr();
  const blocks = sortByTime(getDayTimeBlocks(date));
  const startMinute = 6 * 60; const endMinute = 24 * 60; const hourHeight = 72;
  const hourLines = [];
  for (let hour = 6; hour < 24; hour++) {
    hourLines.push(`<div class="timeline-hour"><div class="timeline-hour-label">${pad(hour)}:00</div></div>`);
  }
  const events = blocks.map(block => {
    let top = ((hmToMinutes(block.start) - startMinute) / 60) * hourHeight;
    let height = Math.max(32, minutesBetween(block.start, block.end) / 60 * hourHeight);
    if (top < 0) top = 0;
    const bg = block.color || '#4D9DE0';
    return `<div class="timeline-event" style="top:${top}px;height:${height}px;background:${bg};" data-block-edit="${block.id}"><div class="font-black truncate">${escapeHtml(block.title)}</div><div class="text-xs opacity-90">${block.start} - ${block.end}</div></div>`;
  }).join('');
  $('timelineContainer').innerHTML = `${hourLines.join('')}<div class="absolute inset-0">${events}</div>`;
  $('timelineContainer').querySelectorAll('[data-block-edit]').forEach(el => el.onclick = () => openBlockEditor(el.dataset.blockEdit, date));
}
