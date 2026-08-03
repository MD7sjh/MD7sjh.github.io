/* Projects, planning table, and workflow dashboard. */
'use strict';

function addWorkflowProject() {
  const title = $('workflowProjectTitle').value.trim();
  if (!title) { alert('请填写项目名。'); return; }
  state.projects.unshift(normalizeProjectItem({
    id: uid('proj'),
    title,
    outcome: $('workflowProjectOutcome').value.trim(),
    area: $('workflowProjectArea').value,
    status: 'active',
    startDate: $('workflowProjectStartDate')?.value || todayStr(),
    deadline: $('workflowProjectDeadline').value || '',
    createdAt: nowDateTime(),
    updatedAt: nowDateTime()
  }));
  $('workflowProjectTitle').value = '';
  $('workflowProjectOutcome').value = '';
  if ($('workflowProjectStartDate')) $('workflowProjectStartDate').value = todayStr();
  $('workflowProjectDeadline').value = '';
  saveState();
  renderAll();
}
function addWorkflowCaptureTask() {
  const title = $('workflowCaptureText').value.trim();
  if (!title) { alert('请先填写任务名称。'); return; }
  const projectId = $('workflowCaptureProject')?.value || workflowSelectedProjectId || '';
  const estimate = Math.max(0, Number($('workflowCaptureEstimate')?.value) || 25);
  const status = taskStatusMeta($('workflowCaptureStatus')?.value).value;
  createTask({
    title,
    projectId,
    status,
    gtdBucket: status === 'done' ? 'done' : (projectId ? 'next' : 'inbox'),
    quadrant: $('workflowCaptureQuadrant')?.value || 'q2',
    todayBucket: '',
    dueDate: $('workflowCaptureDue')?.value || '',
    estimate,
    startedAt: status === 'active' ? nowDateTime() : '',
    doneAt: status === 'done' ? nowDateTime() : ''
  });
  $('workflowCaptureText').value = '';
  if ($('workflowCaptureDue')) $('workflowCaptureDue').value = '';
  if ($('workflowCaptureEstimate')) $('workflowCaptureEstimate').value = '25';
  if ($('workflowCaptureQuadrant')) $('workflowCaptureQuadrant').value = 'q2';
  if ($('workflowCaptureStatus')) $('workflowCaptureStatus').value = 'planned';
  if ($('workflowCaptureProject')) $('workflowCaptureProject').value = workflowSelectedProjectId || '';
  saveState();
  renderAll();
}
function nearestSubmissionDeadline() {
  return state.submissions
    .filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage) && item.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))[0]?.deadline || '';
}
function workflowModuleProjectConfig(source) {
  const today = todayStr();
  if (source === 'thesis') {
    const openMilestone = (state.thesis?.milestones || []).filter(item => !item.done).sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99'))[0];
    return {
      title: '博士毕业论文推进',
      outcome: `把毕业论文推进到可答辩版本（当前总体进度 ${thesisOverallProgress()}%）`,
      area: 'writing',
      deadline: state.thesis?.meta?.targetDate || openMilestone?.due || '',
      note: 'module:thesis',
      taskTitle: openMilestone ? `推进论文里程碑：${openMilestone.name}` : '推进论文：更新章节或补一条推进日志',
      taskDue: openMilestone?.due || state.thesis?.meta?.targetDate || ''
    };
  }
  if (source === 'submission') {
    const active = state.submissions.filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage));
    const next = active.filter(item => item.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))[0] || active[0];
    return {
      title: '投稿与发表管线',
      outcome: `推进 ${active.length} 个进行中投稿，优先处理临近截止与返修`,
      area: 'submission',
      deadline: nearestSubmissionDeadline(),
      note: 'module:submission',
      taskTitle: next ? `推进投稿：${next.title}` : '检查投稿管线：补充下一步动作',
      taskDue: next?.deadline || ''
    };
  }
  const pending = mentorPendingItems(today);
  const next = pending[0];
  return {
    title: '导师沟通与承诺跟进',
    outcome: `记录导师说过的话、跟进 ${pending.length} 条未落实承诺，避免计划漂移`,
    area: 'admin',
    deadline: next?.entry?.followupDate || '',
    note: 'module:mentor',
    taskTitle: next ? `跟进导师承诺：${next.entry.commitment.slice(0, 32)}` : '整理导师沟通记录并确认下一步',
    taskDue: next?.entry?.followupDate || ''
  };
}
function ensureWorkflowModuleProject(source, shouldRender=true) {
  const config = workflowModuleProjectConfig(source);
  let project = state.projects.find(item => item.note === config.note || item.title === config.title);
  if (project) {
    project.outcome = config.outcome;
    project.area = config.area;
    project.deadline = config.deadline;
    project.note = config.note;
    if (project.status === 'done') project.status = 'active';
    project.updatedAt = nowDateTime();
  } else {
    project = normalizeProjectItem({
      id: uid('proj'),
      title: config.title,
      outcome: config.outcome,
      area: config.area,
      status: 'active',
      deadline: config.deadline,
      note: config.note,
      createdAt: nowDateTime(),
      updatedAt: nowDateTime()
    });
    state.projects.unshift(project);
  }
  if (shouldRender) { saveState(); renderAll(); }
  return project;
}
function createWorkflowModuleTask(source) {
  const config = workflowModuleProjectConfig(source);
  const project = ensureWorkflowModuleProject(source, false);
  createTask({
    title: config.taskTitle,
    projectId: project.id,
    gtdBucket: 'next',
    quadrant: 'q2',
    todayBucket: 'should',
    dueDate: config.taskDue,
    estimate: 30,
    context: source === 'mentor' ? '沟通' : source === 'submission' ? '投稿' : '论文',
    note: config.note
  });
  saveState();
  renderAll();
}
function renderWorkflowModuleLinks(date=todayStr()) {
  return;
}
function renderWorkflow() {
  const date = $('workflowDate').value || todayStr();
  syncAllSubmissionProjects();
  const allTasks = [...state.tasks];
  const allProjects = [...state.projects];
  if (workflowSelectedProjectId && !projectById(workflowSelectedProjectId)) workflowSelectedProjectId = '';

  const openTasks = allTasks.filter(taskOpen);
  const activeProjects = allProjects.filter(item => item.status === 'active').length;
  const unlinkedTasks = openTasks.filter(item => !item.projectId || item.gtdBucket === 'inbox');
  const nextTasks = openTasks.filter(item => item.gtdBucket === 'next');
  const waitingTasks = openTasks.filter(item => item.gtdBucket === 'waiting');
  const mustTasks = openTasks.filter(item => item.todayBucket === 'must');
  const shouldTasks = openTasks.filter(item => item.todayBucket === 'should');
  const couldTasks = openTasks.filter(item => item.todayBucket === 'could');
  const dueSoonTasks = openTasks.filter(item => item.dueDate && diffDays(date, item.dueDate) >= 0 && diffDays(date, item.dueDate) <= 7);
  const doneTasks = allTasks.filter(item => item.status === 'done');

  $('workflowStats').innerHTML = [
    { label:'项目总数', value: allProjects.length, color:'text-dopamine-purple', note:'长期目标池' },
    { label:'进行中项目', value: activeProjects, color:'text-dopamine-mint', note:'当前需要推进' },
    { label:'任务总数', value: allTasks.length, color:'text-dopamine-sky', note:'全部任务记录' },
    { label:'未完成任务', value: openTasks.length, color:'text-dopamine-pink', note:'计划中 / 没开始 / 进行中' },
    { label:'7 天内到期', value: dueSoonTasks.length, color:'text-dopamine-yellow', note:'需要提前安排' },
    { label:'未归项目', value: unlinkedTasks.length, color:'text-dopamine-orange', note:'需要归档清理' }
  ].map(item => `
    <div class="workflow-metric-card p-4">
      <div class="text-sm text-calm-mute">${item.label}</div>
      <div class="text-3xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
      <div class="text-xs text-calm-mute mt-2">${escapeHtml(item.note)}</div>
    </div>
  `).join('');

  const projectDueSoon = [...allProjects]
    .filter(item => item.status !== 'done' && item.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);
  $('workflowInsightCards').innerHTML = [
    {
      tone:'from-purple-50 to-white border-purple-100',
      icon:'fa-folder-open',
      color:'text-dopamine-purple',
      title:'项目层',
      lines:[`进行中 ${activeProjects} 个`, `已完成 ${allProjects.filter(item => item.status === 'done').length} 个`, `暂停 ${allProjects.filter(item => item.status === 'paused').length} 个`]
    },
    {
      tone:'from-amber-50 to-white border-amber-100',
      icon:'fa-clock',
      color:'text-dopamine-orange',
      title:'近期截止',
      lines: projectDueSoon.length ? projectDueSoon.map(item => `${item.title} · ${item.deadline}`) : ['暂无设置截止日期的项目']
    },
    {
      tone:'from-sky-50 to-white border-sky-100',
      icon:'fa-list-check',
      color:'text-dopamine-sky',
      title:'任务层',
      lines:[`下一步 ${nextTasks.length} 项`, `等待反馈 ${waitingTasks.length} 项`, `已完成 ${doneTasks.length} 项`]
    }
  ].map(card => `
    <div class="rounded-2xl border bg-gradient-to-r ${card.tone} p-4">
      <div class="font-black flex items-center gap-2 ${card.color}"><i class="fa-solid ${card.icon}"></i> ${escapeHtml(card.title)}</div>
      <div class="text-sm text-calm-mute mt-3 leading-6">${card.lines.map(line => escapeHtml(line)).join('<br>')}</div>
    </div>
  `).join('');

  const quadrantStats = QUADRANT_OPTIONS.map(opt => ({
    label: opt.short,
    value: openTasks.filter(item => item.quadrant === opt.value).length,
    color: opt.color,
    note: opt.label
  }));
  const todayStats = [
    { label:'今日必做', value: mustTasks.length, color:'bg-rose-100 text-rose-700', note:'Must' },
    { label:'今日应该', value: shouldTasks.length + couldTasks.length, color:'bg-amber-100 text-amber-700', note:'Should / Could' }
  ];
  $('workflowQuadrantSummary').innerHTML = [...quadrantStats, ...todayStats].map(item => `
    <div class="workflow-kpi-strip p-3">
      <div class="flex items-center justify-between gap-2">
        <span class="workflow-tag ${item.color}">${escapeHtml(item.label)}</span>
        <span class="text-xl font-black">${escapeHtml(String(item.value))}</span>
      </div>
      <div class="text-xs text-calm-mute mt-2">${escapeHtml(item.note)}</div>
    </div>
  `).join('');

  $('workflowProjectBadge').textContent = `${allProjects.length} 个`;
  if ($('workflowCaptureProject')) {
    const current = $('workflowCaptureProject').value;
    $('workflowCaptureProject').innerHTML = '<option value="">选择所属项目</option>' + allProjects.map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
    $('workflowCaptureProject').value = allProjects.some(project => project.id === current) ? current : (workflowSelectedProjectId || '');
  }
  if ($('workflowProjectFilterSelect')) {
    $('workflowProjectFilterSelect').innerHTML = '<option value="">全部项目</option>' + allProjects.map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
    $('workflowProjectFilterSelect').value = workflowSelectedProjectId || '';
  }

  const sortedProjects = [...allProjects].sort((a, b) => {
    const order = { active:0, paused:1, done:2 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99');
  });
  function projectProgress(project) {
    const tasks = tasksForProject(project.id);
    const openCount = tasks.filter(taskOpen).length;
    const doneCount = tasks.filter(item => item.status === 'done').length;
    return Math.round(doneCount / Math.max(1, openCount + doneCount) * 100);
  }
  function projectRemainingLabel(project) {
    if (project.status === 'done') return { text:'已完成', tone:'text-emerald-600' };
    if (!project.deadline) return { text:'未设截止', tone:'text-calm-mute' };
    const days = diffDays(date, project.deadline);
    if (Number.isNaN(days)) return { text:'日期异常', tone:'text-calm-mute' };
    if (days < 0) return { text:`逾期 ${Math.abs(days)} 天`, tone:'text-rose-600 font-bold' };
    if (days === 0) return { text:'今日到期', tone:'text-dopamine-orange font-bold' };
    return { text:`剩 ${days} 天`, tone:days <= 7 ? 'text-dopamine-orange font-bold' : 'text-calm-mute' };
  }
  function renderProjectRows(projects) {
    if (!projects.length) return '<div class="px-4 py-5 text-sm text-calm-mute">暂无项目。</div>';
    return projects.map(project => {
      const area = projectAreaMeta(project.area);
      const status = projectStatusMeta(project.status);
      const tasks = tasksForProject(project.id);
      const openCount = tasks.filter(taskOpen).length;
      const doneCount = tasks.filter(item => item.status === 'done').length;
      const logCount = Array.isArray(project.logs) ? project.logs.length : 0;
      const progress = projectProgress(project);
      const startDate = project.startDate || dateFromDateTime(project.createdAt) || '—';
      const remaining = projectRemainingLabel(project);
      const statusTone = project.status === 'done' ? 'bg-emerald-100 text-emerald-700' : project.status === 'paused' ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-700';
      const activeClass = workflowSelectedProjectId === project.id ? 'bg-sky-50' : 'bg-white';
      return `
        <div class="grid grid-cols-[minmax(220px,1.4fr)_140px_minmax(200px,1.2fr)_110px_150px_120px_120px_120px_90px] gap-3 px-4 py-3 border-t border-calm-line items-center text-sm hover:bg-calm-bg/70 ${activeClass}" data-workflow-focus-project="${project.id}">
          <div class="min-w-0">
            <div class="font-bold truncate">${escapeHtml(project.title)}</div>
            <div class="text-xs text-calm-mute mt-1">任务 ${tasks.length} · 未完成 ${openCount} · 已完成 ${doneCount} · 日志 ${logCount}</div>
          </div>
          <div class="text-calm-mute">${escapeHtml(area.label)}</div>
          <div class="min-w-0 text-calm-mute truncate" title="${escapeHtml(project.outcome || '')}">${escapeHtml(project.outcome || '未填写完成结果')}</div>
          <span class="workflow-tag ${statusTone} justify-self-start">${escapeHtml(status.label)}</span>
          <div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full bg-dopamine-purple" style="width:${progress}%"></div></div>
              <span class="text-xs font-black text-calm-mute">${progress}%</span>
            </div>
          </div>
          <div class="text-calm-mute">${project.deadline ? escapeHtml(project.deadline) : '—'}</div>
          <div class="text-calm-mute">${escapeHtml(startDate)}</div>
          <div class="${remaining.tone}">${escapeHtml(remaining.text)}</div>
          <div class="text-right"><button class="text-xs font-bold text-dopamine-orange" data-project-edit="${project.id}">修改</button></div>
        </div>`;
    }).join('');
  }
  const projectGroups = PROJECT_AREAS.map(area => ({ ...area, items: sortedProjects.filter(project => project.area === area.value) }))
    .filter(group => group.items.length);
  $('workflowProjectList').innerHTML = projectGroups.map(group => `
    <details class="rounded-2xl border border-calm-line bg-white overflow-hidden" open>
      <summary class="cursor-pointer select-none px-4 py-3 bg-calm-bg font-black flex items-center justify-between gap-3">
        <span>${escapeHtml(group.label)}</span>
        <span class="pill bg-white border border-calm-line text-calm-mute">${group.items.length} 个</span>
      </summary>
      <div class="overflow-auto scroll-thin">
        <div class="min-w-[1320px]">
          <div class="grid grid-cols-[minmax(220px,1.4fr)_140px_minmax(200px,1.2fr)_110px_150px_120px_120px_120px_90px] gap-3 px-4 py-3 text-xs font-black tracking-wide text-calm-mute bg-white">
            <div>项目名称</div>
            <div>项目分类</div>
            <div>完成结果</div>
            <div>状态</div>
            <div>进度</div>
            <div>截止日期</div>
            <div>开始日期</div>
            <div>剩余日期</div>
            <div class="text-right">操作</div>
          </div>
          ${renderProjectRows(group.items)}
        </div>
      </div>
    </details>`).join('') || '<div class="text-sm text-calm-mute">还没有项目。先创建一个需要多个动作才能完成的长期目标。</div>';

  const filter = $('workflowTaskFilter').value || 'all';
  const scopedTasks = workflowSelectedProjectId ? allTasks.filter(item => item.projectId === workflowSelectedProjectId) : allTasks;
  const filteredTasks = scopedTasks.filter(task => {
    if (filter === 'today') return !!task.todayBucket && task.status !== 'done';
    if (QUADRANT_OPTIONS.some(opt => opt.value === filter)) return task.quadrant === filter;
    return true;
  }).sort((a, b) => {
    const statusOrder = { planned:0, todo:1, active:2, done:3 };
    return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      || (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99')
      || (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  function taskCompletion(task) {
    return taskStatusMeta(task.status).progress;
  }
  function compactDateTime(ts) {
    return ts ? escapeHtml(String(ts).slice(0, 16)) : '—';
  }
  function renderTaskRows(items) {
    if (!items.length) return '<div class="px-4 py-6 text-sm text-calm-mute border-t border-calm-line">这一组暂无任务。</div>';
    return items.map(task => {
      const project = projectById(task.projectId);
      const quadrant = taskQuadrantMeta(task.quadrant);
      const today = todayBucketMeta(task.todayBucket);
      const completion = taskCompletion(task);
      return `
        <div class="grid grid-cols-[minmax(220px,1.3fr)_minmax(160px,1fr)_150px_120px_120px_140px_150px_150px_120px] gap-3 px-4 py-3 border-t border-calm-line items-center text-sm hover:bg-calm-bg/70">
          <div class="min-w-0">
            <div class="font-bold truncate ${task.status === 'done' ? 'line-through text-calm-mute' : ''}">${escapeHtml(task.title)}</div>
            <div class="text-xs text-calm-mute mt-1">${task.estimate ? `预计 ${task.estimate} 分钟` : '未设置预计时长'}</div>
          </div>
          <div class="truncate text-calm-mute">${escapeHtml(project?.title || '未关联项目')}</div>
          <span class="workflow-tag ${quadrant.color} justify-self-start">${escapeHtml(quadrant.label)}</span>
          <select class="px-3 py-2 rounded-xl border border-calm-line bg-white text-sm" data-workflow-status="${task.id}">
            ${TASK_STATUS_OPTIONS.map(opt => `<option value="${opt.value}" ${task.status === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
          </select>
          <div class="text-calm-mute">${task.dueDate ? escapeHtml(task.dueDate) : '—'}</div>
          <div class="text-calm-mute">${compactDateTime(task.startedAt)}</div>
          <div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full bg-dopamine-mint" style="width:${completion}%"></div></div>
              <span class="text-xs font-black text-calm-mute">${completion}%</span>
            </div>
          </div>
          <div>
            <select class="w-full px-3 py-2 rounded-xl border border-calm-line bg-white text-sm" data-workflow-today-toggle="${task.id}" ${task.status === 'done' ? 'disabled' : ''}>
              <option value="" ${task.todayBucket ? '' : 'selected'}>否</option>
              <option value="should" ${task.todayBucket ? 'selected' : ''}>是</option>
            </select>
            <div class="text-[11px] text-calm-mute mt-1">${task.status === 'done' ? '已完成不加入' : today.value ? escapeHtml(today.label) : '不进入今日执行'}</div>
          </div>
          <div class="flex gap-2 justify-end">
            ${task.status === 'done' ? '' : `<button class="text-xs font-bold text-dopamine-pink" data-workflow-start="${task.id}">${task.status === 'active' ? '结束' : '开始'}</button>`}
            ${task.status === 'done' ? '' : `<button class="text-xs font-bold text-green-600" data-workflow-done="${task.id}">完成</button>`}
            <button class="text-xs font-bold text-dopamine-orange" data-workflow-edit="${task.id}">修改</button>
          </div>
        </div>`;
    }).join('');
  }
  const taskGroups = TASK_STATUS_OPTIONS.map(status => ({
    ...status,
    items: filteredTasks.filter(task => task.status === status.value)
  }));
  $('workflowTaskTable').innerHTML = taskGroups.map(group => `
    <details class="border-t border-calm-line first:border-t-0" open>
      <summary class="cursor-pointer select-none px-4 py-3 bg-calm-bg font-black flex items-center justify-between gap-3">
        <span class="flex items-center gap-2"><span class="workflow-tag ${group.color}">${escapeHtml(group.label)}</span><span>任务</span></span>
        <span class="pill bg-white border border-calm-line text-calm-mute">${group.items.length} 项</span>
      </summary>
      <div class="overflow-auto scroll-thin">
        <div class="min-w-[1440px]">
          <div class="grid grid-cols-[minmax(220px,1.3fr)_minmax(160px,1fr)_150px_120px_120px_140px_150px_150px_120px] gap-3 px-4 py-3 text-xs font-black tracking-wide text-calm-mute bg-white">
            <div>任务名称</div>
            <div>所属项目</div>
            <div>紧急程度（4 象限）</div>
            <div>状态</div>
            <div>到期时间</div>
            <div>开始时间</div>
            <div>完成度</div>
            <div>加入今日执行</div>
            <div class="text-right">操作</div>
          </div>
          ${renderTaskRows(group.items)}
        </div>
      </div>
    </details>`).join('');

  $('workflowProjectList').querySelectorAll('[data-workflow-focus-project]').forEach(card => card.onclick = (event) => {
    if (event.target.closest('button')) return;
    workflowSelectedProjectId = card.dataset.workflowFocusProject;
    if ($('workflowProjectFilterSelect')) $('workflowProjectFilterSelect').value = workflowSelectedProjectId;
    renderWorkflow();
  });
  $('workflowProjectList').querySelectorAll('[data-project-edit]').forEach(btn => btn.onclick = () => openProjectEditor(btn.dataset.projectEdit));
  if ($('workflowProjectFilterSelect')) {
    $('workflowProjectFilterSelect').onchange = () => {
      workflowSelectedProjectId = $('workflowProjectFilterSelect').value || '';
      renderWorkflow();
    };
  }
  $('workflowTaskTable').querySelectorAll('[data-workflow-start]').forEach(btn => btn.onclick = () => toggleTaskStart(btn.dataset.workflowStart));
  $('workflowTaskTable').querySelectorAll('[data-workflow-done]').forEach(btn => btn.onclick = () => finishTask(btn.dataset.workflowDone));
  $('workflowTaskTable').querySelectorAll('[data-workflow-edit]').forEach(btn => btn.onclick = () => openTaskEditor(btn.dataset.workflowEdit));
  $('workflowTaskTable').querySelectorAll('[data-workflow-today-toggle]').forEach(select => select.onchange = () => {
    setTaskTodayBucket(select.dataset.workflowTodayToggle, select.value ? 'should' : '');
  });
  $('workflowTaskTable').querySelectorAll('[data-workflow-status]').forEach(select => select.onchange = () => {
    const task = state.tasks.find(item => item.id === select.dataset.workflowStatus);
    if (!task) return;
    const nextStatus = taskStatusMeta(select.value).value;
    if (nextStatus === 'done') return finishTask(task.id);
    updateTaskField(task.id, {
      status: nextStatus,
      gtdBucket: task.gtdBucket === 'done' ? 'next' : task.gtdBucket,
      doneAt: '',
      startedAt: nextStatus === 'active' ? (task.startedAt || nowDateTime()) : task.startedAt
    });
  });
}
