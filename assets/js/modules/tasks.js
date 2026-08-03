/* Task lifecycle and task-focus/project linkage. */
'use strict';

function createTask(payload = {}) {
  const task = normalizeTaskItem({
    id: uid('task'),
    title: payload.title || '',
    status: payload.status || 'todo',
    projectId: payload.projectId || '',
    gtdBucket: payload.gtdBucket || 'next',
    quadrant: payload.quadrant || 'q2',
    todayBucket: payload.todayBucket || '',
    dueDate: payload.dueDate || '',
    estimate: payload.estimate ?? 25,
    context: payload.context || '',
    note: payload.note || '',
    createdAt: payload.createdAt || nowDateTime(),
    startedAt: payload.startedAt || '',
    doneAt: payload.doneAt || ''
  });
  if (!task) return;
  state.tasks.unshift(task);
  return task;
}
function addTask() {
  const title = $('taskInput').value.trim();
  if (!title) return;
  createTask({ title, gtdBucket:'next', quadrant:'q2', todayBucket:'should', estimate:25 });
  $('taskInput').value = '';
  saveState(); renderAll();
}
function recordFocusRun({ id, date, title, category='research', note='', start, end, minutes, taskId='' }) {
  const cleanStart = parseHM(start);
  const cleanEnd = parseHM(end);
  if (!cleanStart || !cleanEnd || !title) return;
  const mins = Math.max(1, Math.round(Number(minutes) || minutesBetween(cleanStart, cleanEnd)));
  const focusId = id || uid('focus');
  state.focus.sessions.unshift({ id: focusId, date, title, category, note, start: cleanStart, end: cleanEnd, minutes: mins, taskId });
  const task = state.tasks.find(item => item.id === taskId);
  if (task) {
    getDayTimeBlocks(date).push({ id: uid('block'), taskId, start: cleanStart, end: cleanEnd, title, color: blockColorForTask(task) });
  }
}
function taskFocusMinutesOnDate(taskId, date=todayStr()) {
  return state.focus.sessions
    .filter(item => item.taskId === taskId && item.date === date)
    .reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
}
function addUniqueProgressLog(list, sourceTaskId, payload) {
  if (!Array.isArray(list) || !sourceTaskId) return false;
  if (list.some(item => item.sourceTaskId === sourceTaskId)) return false;
  list.unshift({ id: uid('plog'), sourceTaskId, at: nowDateTime(), ...payload });
  return true;
}
function thesisLogTypeForTask(task) {
  const text = `${task.title || ''} ${task.context || ''} ${task.note || ''}`;
  if (/实验|数据|样本|分析/.test(text)) return 'experiment';
  if (/改|修|润色|revision|返修/i.test(text)) return 'revise';
  if (/组会|讨论|meeting|导师/i.test(text)) return 'meeting';
  if (/写|章|论文|draft|chapter/i.test(text)) return 'writing';
  return 'other';
}
function submissionForCompletedTask(task, project) {
  const note = String(project?.note || '');
  if (note.startsWith('submission:')) return state.submissions.find(item => submissionProjectNote(item.id) === note) || null;
  if (note === 'module:submission') {
    return state.submissions.find(item => task.title.includes(item.title)) || null;
  }
  return null;
}
function recordProjectProgressFromTask(task) {
  const project = projectById(task.projectId);
  if (!project) return;
  project.logs = Array.isArray(project.logs) ? project.logs : [];
  const doneDate = dateFromDateTime(task.doneAt) || todayStr();
  const minutes = taskFocusMinutesOnDate(task.id, doneDate);
  const note = `任务完成：${task.title}`;
  addUniqueProgressLog(project.logs, task.id, {
    date: doneDate,
    type: '任务完成',
    minutes,
    note
  });
  project.updatedAt = nowDateTime();

  const projectNote = String(project.note || '');
  if (projectNote === 'module:thesis' || task.note === 'module:thesis') {
    state.thesis.logs = Array.isArray(state.thesis.logs) ? state.thesis.logs : [];
    addUniqueProgressLog(state.thesis.logs, task.id, {
      date: doneDate,
      type: thesisLogTypeForTask(task),
      minutes,
      words: 0,
      note: `${note}${project.title ? `（${project.title}）` : ''}`
    });
  }

  const submission = submissionForCompletedTask(task, project);
  if (submission) {
    submission.logs = Array.isArray(submission.logs) ? submission.logs : [];
    addUniqueProgressLog(submission.logs, task.id, {
      date: doneDate,
      type: '任务完成',
      minutes,
      note,
      stage: submission.stage
    });
    submission.updatedAt = nowDateTime();
    syncSubmissionProject(submission);
  }
}
function finishActiveFocusRunForTask(task) {
  const active = state.focus.active;
  if (active?.taskId === task.id) {
    recordFocusRun({
      id: active.id,
      date: active.date || todayStr(),
      title: active.title || task.title,
      category: active.category || 'research',
      note: active.note || '任务自动记录',
      start: active.start,
      end: nowTime(),
      minutes: Math.max(1, Math.round((Date.now() - active.startedAtTs) / 60000)),
      taskId: task.id
    });
    state.focus.active = null;
    return;
  }
  const startAt = task.startedAt || nowDateTime();
  const date = dateFromDateTime(startAt) || todayStr();
  recordFocusRun({
    date,
    title: task.title,
    category: 'research',
    note: '任务自动记录',
    start: String(startAt).slice(11, 16),
    end: nowTime(),
    taskId: task.id
  });
}
function stopAllActiveTaskRuns(exceptId='') {
  state.tasks.forEach(task => {
    if (task.status === 'active' && task.id !== exceptId) {
      finishActiveFocusRunForTask(task);
      task.status = 'todo';
    }
  });
  if (state.focus.active && state.focus.active.taskId !== exceptId) {
    const linked = state.tasks.find(task => task.id === state.focus.active.taskId);
    if (linked) linked.status = 'todo';
    stopFocus(false);
  }
}
function toggleTaskStart(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  if (task.status === 'active') {
    finishActiveFocusRunForTask(task);
    task.status = 'todo';
    saveState(); renderAll();
    stopFocusTicker();
    return;
  }
  stopAllActiveTaskRuns(id);
  const startDateTime = nowDateTime();
  task.status = 'active';
  task.gtdBucket = task.gtdBucket === 'inbox' || task.gtdBucket === 'done' ? 'next' : task.gtdBucket;
  task.todayBucket = task.todayBucket || 'should';
  task.doneAt = '';
  task.startedAt = startDateTime;
  state.focus.active = {
    id: uid('focus'),
    title: task.title,
    category: 'research',
    note: '任务自动记录',
    date: todayStr(),
    start: nowTime(),
    startedAtTs: Date.now(),
    taskId: task.id
  };
  saveState(); renderAll();
  startFocusTicker();
}
function finishTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  if (task.status === 'done') return;
  if (task.status === 'active') finishActiveFocusRunForTask(task);
  task.status = 'done';
  task.gtdBucket = 'done';
  task.todayBucket = '';
  task.doneAt = nowDateTime();
  recordProjectProgressFromTask(task);
  saveState(); renderAll();
  stopFocusTicker();
}
function deleteTask(id) { state.tasks = state.tasks.filter(task => task.id !== id); saveState(); renderAll(); }
function updateTaskField(id, patch = {}) {
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  Object.assign(task, patch);
  if (task.status === 'done') {
    task.gtdBucket = 'done';
    task.todayBucket = '';
  } else if (task.gtdBucket === 'done') {
    task.gtdBucket = 'next';
  }
  saveState();
  renderAll();
}
function setTaskBucket(id, bucket) {
  if (bucket === 'done') return finishTask(id);
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;
  task.gtdBucket = GTD_BUCKETS.some(opt => opt.value === bucket) ? bucket : task.gtdBucket;
  if (task.status === 'done') {
    task.status = 'todo';
    task.doneAt = '';
  }
  saveState();
  renderAll();
}
function setTaskQuadrant(id, quadrant) { updateTaskField(id, { quadrant: taskQuadrantMeta(quadrant).value }); }
function setTaskTodayBucket(id, bucket) { updateTaskField(id, { todayBucket: todayBucketMeta(bucket).value }); }
function setTaskProject(id, projectId) { updateTaskField(id, { projectId }); }
function todayExecutionTasks(date=todayStr()) {
  const rank = { active:0, todo:1, planned:2, done:3 };
  const todayRank = { must:0, should:1, could:2, '':3 };
  return state.tasks
    .filter(task => {
      const doneDate = dateFromDateTime(task.doneAt);
      if (task.status === 'done') return doneDate === date;
      return task.status === 'active'
        || !!task.todayBucket
        || task.dueDate === date
        || dateFromDateTime(task.createdAt) === date;
    })
    .sort((a, b) => {
      const statusDiff = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      if (statusDiff) return statusDiff;
      const todayDiff = (todayRank[a.todayBucket || ''] ?? 9) - (todayRank[b.todayBucket || ''] ?? 9);
      if (todayDiff) return todayDiff;
      return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99')
        || (b.startedAt || b.createdAt || '').localeCompare(a.startedAt || a.createdAt || '');
    });
}
function renderTasks() {
  const activeCount = state.tasks.filter(t=>t.status==='active').length;
  $('activeTaskBadge').textContent = `进行中 ${activeCount}`;
  const todayTasks = todayExecutionTasks();
  const doneToday = todayTasks.filter(task => task.status === 'done').length;
  const openToday = todayTasks.length - doneToday;
  const taskLinkedFocus = state.focus.sessions.filter(item => item.date === todayStr() && item.taskId);
  const taskLinkedBlocks = (state.timeBlocks?.[todayStr()] || []).filter(item => item.taskId);
  const taskLinkedMinutes = taskLinkedFocus.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  $('taskNowPane').innerHTML = todayTasks.length
    ? `今日 ${todayTasks.length} 项 · 待完成 ${openToday} 项 · 已完成 ${doneToday} 项${activeCount ? ` · 进行中 ${activeCount} 项` : ''}`
    : '暂无今日任务。可以新增临时任务，或在项目看板把任务交给今天。';
  if ($('taskAutoLogPane')) {
    $('taskAutoLogPane').textContent = `自动记录：任务专注 ${taskLinkedFocus.length} 次 / ${formatMinutes(taskLinkedMinutes)}，已生成日程时间块 ${taskLinkedBlocks.length} 个。`;
  }
  const list = todayTasks.map(task => {
    const bucket = taskBucketMeta(task.gtdBucket);
    const project = projectById(task.projectId);
    const today = todayBucketMeta(task.todayBucket);
    const sessions = state.focus.sessions.filter(item => item.taskId === task.id && item.date === todayStr());
    const sessionMinutes = sessions.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
    const isDone = task.status === 'done';
    const isActive = task.status === 'active';
    return `
      <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="font-bold ${isDone ? 'line-through text-calm-mute' : ''}">${escapeHtml(task.title)}</div>
          <div class="text-xs text-calm-mute mt-1 flex flex-wrap gap-2">
            <span>${escapeHtml(isDone ? '已完成' : isActive ? '进行中' : task.status === 'planned' ? '计划中' : '待开始')}</span>
            <span>·</span>
            <span>${escapeHtml(today.value ? today.label : bucket.label)}</span>
            ${project ? `<span>· ${escapeHtml(project.title)}</span>` : ''}
            ${task.dueDate ? `<span>· 截止 ${escapeHtml(task.dueDate)}</span>` : ''}
            ${isActive ? `<span>· 开始于 ${escapeHtml(task.startedAt || '')}</span>` : ''}
            ${sessions.length ? `<span>· 今日专注 ${sessions.length} 次 / ${formatMinutes(sessionMinutes)}</span>` : ''}
          </div>
        </div>
        <div class="flex gap-2 shrink-0">
          ${isDone ? '' : `<button class="px-2 py-1 rounded-xl text-xs font-bold bg-pink-50 text-dopamine-pink" data-task-start="${task.id}">${isActive ? '结束' : '开始'}</button>`}
          ${isDone ? '' : `<button class="px-2 py-1 rounded-xl text-xs font-bold bg-green-50 text-green-600" data-task-done="${task.id}">完成</button>`}
          <button class="px-2 py-1 rounded-xl text-xs font-bold bg-gray-100 text-calm-mute" data-task-edit="${task.id}">修改</button>
        </div>
      </div>`;
  }).join('');
  $('taskList').innerHTML = list || '<div class="text-sm text-calm-mute">还没有今日任务，先新增一条吧。</div>';
  $('taskList').querySelectorAll('[data-task-start]').forEach(btn => btn.onclick = () => toggleTaskStart(btn.dataset.taskStart));
  $('taskList').querySelectorAll('[data-task-done]').forEach(btn => btn.onclick = () => finishTask(btn.dataset.taskDone));
  $('taskList').querySelectorAll('[data-task-edit]').forEach(btn => btn.onclick = () => openTaskEditor(btn.dataset.taskEdit));
}
