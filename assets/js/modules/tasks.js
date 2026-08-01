/**
 * Tasks, focus timer and schedule blocks
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: taskBucketMeta, taskQuadrantMeta, taskStatusMeta, blockColorForTask, createTask, addTask, recordFocusRun, taskFocusMinutesOnDate, finishActiveFocusRunForTask, stopAllActiveTaskRuns, toggleTaskStart, finishTask, deleteTask, updateTaskField, setTaskBucket, setTaskQuadrant, setTaskTodayBucket, todayExecutionTasks, renderTasks, startFocusTicker, stopFocusTicker, renderFocusTimer, startFocus, stopFocus, discardFocus, addManualFocus, renderFocusTimeline, schedulePlannerTasks, renderSchedulePlanner, addScheduledTaskBlock, renderTimeline
 */
'use strict';

function taskBucketMeta(bucket) {
      return GTD_BUCKETS.find(item => item.value === bucket) || GTD_BUCKETS[1];
    }

function taskQuadrantMeta(quadrant) {
      return QUADRANT_OPTIONS.find(item => item.value === quadrant) || QUADRANT_OPTIONS[1];
    }

function taskStatusMeta(status) {
      return TASK_STATUS_OPTIONS.find(item => item.value === status) || TASK_STATUS_OPTIONS[1];
    }

function blockColorForTask(task) {
      const quadrant = taskQuadrantMeta(task?.quadrant);
      if (quadrant.value === 'q1') return '#FB7185';
      if (quadrant.value === 'q2') return '#9B5DE5';
      if (quadrant.value === 'q3') return '#4D9DE0';
      return '#9CA3AF';
    }

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
