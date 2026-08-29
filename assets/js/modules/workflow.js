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
  $('workflowProjectCreatePanel')?.classList.add('hidden');
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
  if (source === 'submission') {
    const active = state.submissions.filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage));
    const next = active.filter(item => item.deadline).sort((a,b)=>a.deadline.localeCompare(b.deadline))[0] || active[0];
    return { title:'投稿与发表管线', outcome:`推进 ${active.length} 个进行中投稿，优先处理临近截止与返修`, area:'submission', deadline:nearestSubmissionDeadline(), note:'module:submission', taskTitle:next?`推进投稿：${next.title}`:'检查投稿管线：补充下一步动作', taskDue:next?.deadline||'' };
  }
  const pending = upwardPendingItems(todayStr()); const next=pending[0];
  return { title:'向上管理与承诺跟进', outcome:`跟进 ${pending.length} 条未落实承诺，并固定关键反馈与下一步`, area:'admin', deadline:next?.entry?.followupDate||'', note:'module:upward', taskTitle:next?`跟进承诺：${next.entry.commitment.slice(0,32)}`:'整理向上沟通记录并确认下一步', taskDue:next?.entry?.followupDate||'' };
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
    context: source === 'upward' ? '沟通' : source === 'submission' ? '投稿' : '工作',
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

  function projectProgress(project) {
    const tasks = tasksForProject(project.id);
    if (project.status === 'done' && !tasks.length) return 100;
    const doneCount = tasks.filter(item => item.status === 'done').length;
    return tasks.length ? Math.round(doneCount / tasks.length * 100) : 0;
  }

  function projectAreaVisual(areaValue) {
    return ({
      research: { icon:'fa-flask-vial', className:'research' },
      writing: { icon:'fa-file-pen', className:'writing' },
      submission: { icon:'fa-paper-plane', className:'submission' },
      admin: { icon:'fa-comments', className:'admin' },
      life: { icon:'fa-seedling', className:'life' },
      other: { icon:'fa-folder', className:'other' }
    })[areaValue] || { icon:'fa-folder', className:'other' };
  }

  function projectStatusVisual(status) {
    return ({
      active: { label:'进行中', className:'active' },
      paused: { label:'已暂停', className:'paused' },
      done: { label:'已完成', className:'done' }
    })[status] || { label:'进行中', className:'active' };
  }

  function projectUpdatedLabel(project) {
    const raw = String(project.updatedAt || project.createdAt || '');
    if (!raw) return '暂无更新';
    const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10) || '暂无更新';
    const diff = Math.max(0, Date.now() - parsed.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚更新';
    if (mins < 60) return `${mins} 分钟前更新`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前更新`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前更新`;
    return `${parsed.getFullYear()}-${pad(parsed.getMonth()+1)}-${pad(parsed.getDate())} 更新`;
  }

  const projectProgressValues = allProjects.map(projectProgress);
  const activeProjects = allProjects.filter(item => item.status === 'active').length;
  const doneProjects = allProjects.filter(item => item.status === 'done').length;
  const totalProjectTasks = allProjects.reduce((sum, project) => sum + tasksForProject(project.id).length, 0);
  const avgProjectProgress = projectProgressValues.length
    ? Math.round(projectProgressValues.reduce((sum, value) => sum + value, 0) / projectProgressValues.length)
    : 0;

  $('workflowStats').innerHTML = [
    { label:'进行中', value:activeProjects, note:'正在推进的项目', icon:'fa-box-open', tone:'pink' },
    { label:'已完成', value:doneProjects, note:'已经收尾的项目', icon:'fa-circle-check', tone:'yellow' },
    { label:'项目任务', value:totalProjectTasks, note:'所有项目关联任务', icon:'fa-list-check', tone:'purple' },
    { label:'平均进度', value:`${avgProjectProgress}%`, note:'按任务完成率估算', icon:'fa-chart-line', tone:'mint' }
  ].map(item => `
    <div class="workflow-project-stat ${item.tone}">
      <div class="workflow-project-stat-icon"><i class="fa-solid ${item.icon}"></i></div>
      <div>
        <div class="workflow-project-stat-label">${escapeHtml(item.label)}</div>
        <div class="workflow-project-stat-value">${escapeHtml(String(item.value))}</div>
        <div class="workflow-project-stat-note">${escapeHtml(item.note)}</div>
      </div>
    </div>
  `).join('');

  if ($('workflowCaptureProject')) {
    const current = $('workflowCaptureProject').value;
    $('workflowCaptureProject').innerHTML = '<option value="">未关联项目</option>' + allProjects.map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
    $('workflowCaptureProject').value = allProjects.some(project => project.id === current) ? current : (workflowSelectedProjectId || '');
  }
  if ($('workflowProjectFilterSelect')) {
    $('workflowProjectFilterSelect').innerHTML = '<option value="">全部项目</option>' + allProjects.map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
    $('workflowProjectFilterSelect').value = workflowSelectedProjectId || '';
  }

  const projectFilter = $('workflowProjectListFilter')?.value || 'all';
  const projectSearch = String($('workflowProjectSearch')?.value || '').trim().toLowerCase();
  const projectSort = $('workflowProjectSort')?.value || 'updated';

  document.querySelectorAll('[data-workflow-project-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.workflowProjectFilter === projectFilter);
  });

  const visibleProjects = allProjects.filter(project => {
    if (projectFilter !== 'all' && project.status !== projectFilter) return false;
    if (!projectSearch) return true;
    const area = projectAreaMeta(project.area);
    const searchable = `${project.title} ${project.outcome || ''} ${area.label || ''}`.toLowerCase();
    return searchable.includes(projectSearch);
  }).sort((a, b) => {
    if (projectSort === 'deadline') {
      return (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99')
        || (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }
    if (projectSort === 'progress') {
      return projectProgress(b) - projectProgress(a)
        || (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }
    if (projectSort === 'created') {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }
    return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
  });

  $('workflowProjectList').innerHTML = visibleProjects.map(project => {
    const area = projectAreaMeta(project.area);
    const visual = projectAreaVisual(project.area);
    const status = projectStatusVisual(project.status);
    const tasks = tasksForProject(project.id);
    const openCount = tasks.filter(task => task.status !== 'done').length;
    const doneCount = tasks.filter(task => task.status === 'done').length;
    const progress = projectProgress(project);
    const linkedPapers = (state.papers?.items || []).filter(paper => paper.projectId === project.id).length;
    const selected = workflowSelectedProjectId === project.id;
    const dueText = project.deadline
      ? (project.status === 'done' ? `截止 ${project.deadline}` : (() => {
          const days = diffDays(date, project.deadline);
          if (Number.isNaN(days)) return `截止 ${project.deadline}`;
          if (days < 0) return `逾期 ${Math.abs(days)} 天`;
          if (days === 0) return '今天截止';
          if (days <= 7) return `${days} 天后截止`;
          return `截止 ${project.deadline}`;
        })())
      : '';
    return `
      <div class="workflow-project-row ${selected ? 'selected' : ''}" data-workflow-focus-project="${project.id}">
        <div class="workflow-project-main">
          <div class="workflow-project-icon ${visual.className}"><i class="fa-solid ${visual.icon}"></i></div>
          <div class="min-w-0">
            <div class="workflow-project-title">${escapeHtml(project.title)}</div>
            <div class="workflow-project-meta">
              <span class="workflow-project-area ${visual.className}">${escapeHtml(area.label)}</span>
              <span><i class="fa-regular fa-clock"></i>${escapeHtml(projectUpdatedLabel(project))}</span>
              ${dueText ? `<span class="${dueText.startsWith('逾期') || dueText === '今天截止' ? 'danger' : ''}"><i class="fa-regular fa-calendar"></i>${escapeHtml(dueText)}</span>` : ''}
              ${linkedPapers ? `<span><i class="fa-regular fa-file-lines"></i>关联论文 ${linkedPapers}</span>` : ''}
            </div>
          </div>
        </div>
        <div><span class="workflow-project-status ${status.className}">${status.label}</span></div>
        <div class="workflow-project-progress">
          <div class="workflow-project-progress-head"><strong>${progress}%</strong><span>${doneCount}/${tasks.length || 0} 完成</span></div>
          <div class="workflow-project-progress-track"><span style="width:${progress}%"></span></div>
        </div>
        <div class="workflow-project-task-count">
          <strong>${tasks.length}</strong><span>任务</span>
          <small>${openCount} 未完成</small>
        </div>
        <button class="workflow-project-more" data-project-edit="${project.id}" title="修改项目"><i class="fa-solid fa-ellipsis"></i></button>
      </div>`;
  }).join('') || '<div class="workflow-project-empty">没有匹配的项目。你可以调整筛选条件，或新建一个项目。</div>';

  if ($('workflowProjectListSummary')) {
    const selectedText = workflowSelectedProjectId ? ` · 当前任务筛选：${projectById(workflowSelectedProjectId)?.title || '项目'}` : '';
    $('workflowProjectListSummary').textContent = `显示 ${visibleProjects.length} / ${allProjects.length} 个项目${selectedText}`;
  }

  document.querySelectorAll('[data-workflow-project-filter]').forEach(btn => btn.onclick = () => {
    if ($('workflowProjectListFilter')) $('workflowProjectListFilter').value = btn.dataset.workflowProjectFilter || 'all';
    renderWorkflow();
  });

  $('workflowProjectList').querySelectorAll('[data-workflow-focus-project]').forEach(row => row.onclick = event => {
    if (event.target.closest('button')) return;
    const id = row.dataset.workflowFocusProject;
    workflowSelectedProjectId = workflowSelectedProjectId === id ? '' : id;
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

  const filter = $('workflowTaskFilter')?.value || 'all';
  const scopedTasks = workflowSelectedProjectId
    ? allTasks.filter(item => item.projectId === workflowSelectedProjectId)
    : allTasks;

  const filteredTasks = scopedTasks.filter(task => {
    if (filter === 'open') return task.status !== 'done';
    if (filter === 'done') return task.status === 'done';
    if (filter === 'today') {
      return task.status === 'active'
        || (!!task.todayBucket && task.status !== 'done')
        || (task.dueDate === date && task.status !== 'done');
    }
    return true;
  }).sort((a, b) => {
    const doneDiff = Number(a.status === 'done') - Number(b.status === 'done');
    if (doneDiff) return doneDiff;
    const activeDiff = Number(b.status === 'active') - Number(a.status === 'active');
    if (activeDiff) return activeDiff;
    const priorityOrder = { q1:0, q2:1, q3:2, q4:3 };
    const priorityDiff = (priorityOrder[a.quadrant] ?? 9) - (priorityOrder[b.quadrant] ?? 9);
    if (priorityDiff) return priorityDiff;
    return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99')
      || (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  function todoPriorityMeta(task) {
    if (task.quadrant === 'q1') return { label:'高', className:'high' };
    if (task.quadrant === 'q4') return { label:'低', className:'low' };
    return { label:'中', className:'medium' };
  }

  function todoDueMeta(task) {
    if (!task.dueDate) return null;
    const days = diffDays(date, task.dueDate);
    if (Number.isNaN(days)) return { text:task.dueDate, className:'' };
    if (task.status !== 'done' && days < 0) return { text:`逾期 ${Math.abs(days)} 天`, className:'overdue' };
    if (task.status !== 'done' && days === 0) return { text:'今天截止', className:'overdue' };
    if (task.status !== 'done' && days <= 3) return { text:task.dueDate, className:'due-soon' };
    return { text:task.dueDate, className:'' };
  }

  const scopedOpenCount = scopedTasks.filter(task => task.status !== 'done').length;
  const scopedDoneCount = scopedTasks.filter(task => task.status === 'done').length;
  const scopedTotal = scopedTasks.length;
  const completion = scopedTotal ? Math.round(scopedDoneCount / scopedTotal * 100) : 0;
  if ($('workflowTodoSummary')) {
    const projectLabel = workflowSelectedProjectId ? `${projectById(workflowSelectedProjectId)?.title || '当前项目'} · ` : '';
    $('workflowTodoSummary').textContent = `${projectLabel}未完成 ${scopedOpenCount} · 已完成 ${scopedDoneCount} · ${completion}%`;
  }

  document.querySelectorAll('[data-workflow-todo-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.workflowTodoFilter === filter);
  });

  $('workflowTaskTable').innerHTML = filteredTasks.map(task => {
    const project = projectById(task.projectId);
    const priority = todoPriorityMeta(task);
    const due = todoDueMeta(task);
    const isDone = task.status === 'done';
    return `
      <div class="workflow-todo-row">
        <button class="workflow-todo-check ${isDone ? 'done' : ''}" data-workflow-check="${task.id}" title="${isDone ? '恢复为未完成' : '标记完成'}">
          ${isDone ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
        </button>
        <div class="min-w-0">
          <div class="workflow-todo-title ${isDone ? 'done' : ''}">${escapeHtml(task.title)}</div>
          <div class="workflow-todo-meta">
            ${project ? `<span class="workflow-todo-chip project"><i class="fa-regular fa-folder"></i>${escapeHtml(project.title)}</span>` : ''}
            ${task.status === 'active' ? '<span class="workflow-todo-chip active"><i class="fa-solid fa-play"></i>进行中</span>' : ''}
            ${task.todayBucket && !isDone ? '<span class="workflow-todo-chip today"><i class="fa-regular fa-sun"></i>今日</span>' : ''}
            ${due ? `<span class="workflow-todo-chip ${due.className}"><i class="fa-regular fa-calendar"></i>${escapeHtml(due.text)}</span>` : ''}
            <span class="workflow-todo-priority ${priority.className}"><i class="fa-solid fa-flag"></i>${priority.label}</span>
          </div>
        </div>
        <button class="workflow-todo-more" data-workflow-edit="${task.id}" title="修改任务"><i class="fa-solid fa-ellipsis"></i></button>
      </div>`;
  }).join('') || '<div class="workflow-todo-empty">这一组还没有任务。可以在上方快速添加一条。</div>';

  document.querySelectorAll('[data-workflow-todo-filter]').forEach(btn => btn.onclick = () => {
    if ($('workflowTaskFilter')) $('workflowTaskFilter').value = btn.dataset.workflowTodoFilter || 'all';
    renderWorkflow();
  });
  $('workflowTaskTable').querySelectorAll('[data-workflow-check]').forEach(btn => btn.onclick = () => {
    const task = state.tasks.find(item => item.id === btn.dataset.workflowCheck);
    if (!task) return;
    if (task.status === 'done') {
      task.status = 'todo';
      task.gtdBucket = task.projectId ? 'next' : 'inbox';
      task.doneAt = '';
      saveState();
      renderAll();
      return;
    }
    finishTask(task.id);
  });
  $('workflowTaskTable').querySelectorAll('[data-workflow-edit]').forEach(btn => btn.onclick = () => openTaskEditor(btn.dataset.workflowEdit));
}
