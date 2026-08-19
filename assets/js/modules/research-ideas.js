/* Research ideas: idea capture, sources, references, validation tasks, and exports. */
'use strict';

let selectedResearchIdeaId = '';

function researchIdeaAreaMeta(area) {
  return RESEARCH_IDEA_AREAS.find(item => item.value === area) || RESEARCH_IDEA_AREAS[RESEARCH_IDEA_AREAS.length - 1];
}
function researchIdeaStatusMeta(status) {
  return RESEARCH_IDEA_STATUSES.find(item => item.value === status) || RESEARCH_IDEA_STATUSES[0];
}
function researchIdeaPriorityMeta(priority) {
  return RESEARCH_IDEA_PRIORITIES.find(item => item.value === priority) || RESEARCH_IDEA_PRIORITIES[1];
}
function researchIdeaSourceTypeMeta(type) {
  return RESEARCH_IDEA_SOURCE_TYPES.find(item => item.value === type) || RESEARCH_IDEA_SOURCE_TYPES[RESEARCH_IDEA_SOURCE_TYPES.length - 1];
}
function researchIdeaReferenceTypeMeta(type) {
  return RESEARCH_IDEA_REFERENCE_TYPES.find(item => item.value === type) || RESEARCH_IDEA_REFERENCE_TYPES[0];
}
function safeIdeaUrl(raw='') {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const parsed = new URL(value, window.location.href);
    return ['http:','https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}
function researchIdeaTagArray(raw='') {
  return [...new Set(String(raw || '').split(/[,，;；]/).map(item => item.trim()).filter(Boolean))].slice(0, 20);
}
function researchIdeaReferenceText(reference) {
  const pieces = [reference.authors, reference.title, reference.venue, reference.year].filter(Boolean);
  return pieces.join(' · ');
}
function initializeResearchIdeaControls() {
  const areaOptions = RESEARCH_IDEA_AREAS.map(item => `<option value="${item.value}">${item.icon} ${escapeHtml(item.label)}</option>`).join('');
  const statusOptions = RESEARCH_IDEA_STATUSES.map(item => `<option value="${item.value}">${escapeHtml(item.label)}</option>`).join('');
  const priorityOptions = RESEARCH_IDEA_PRIORITIES.map(item => `<option value="${item.value}">${escapeHtml(item.label)}</option>`).join('');
  const sourceOptions = RESEARCH_IDEA_SOURCE_TYPES.map(item => `<option value="${item.value}">${item.icon} ${escapeHtml(item.label)}</option>`).join('');
  const refOptions = RESEARCH_IDEA_REFERENCE_TYPES.map(item => `<option value="${item.value}">${item.icon} ${escapeHtml(item.label)}</option>`).join('');
  const refill = (id, html, fallback='') => {
    const el = $(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = html;
    if ([...el.options].some(option => option.value === current)) el.value = current;
    else if ([...el.options].some(option => option.value === fallback)) el.value = fallback;
  };
  refill('researchIdeaArea', areaOptions, '3d_graphics');
  refill('researchIdeaStatus', statusOptions, 'captured');
  refill('researchIdeaPriority', priorityOptions, 'medium');
  refill('researchIdeaFilterArea', `<option value="">全部方向</option>${areaOptions}`, '');
  refill('researchIdeaFilterStatus', `<option value="">全部状态</option>${statusOptions}`, '');
  refill('researchIdeaFilterPriority', `<option value="">全部优先级</option>${priorityOptions}`, '');
  refill('researchIdeaInitialSourceType', sourceOptions, 'paper');
  refill('researchIdeaSourceType', sourceOptions, 'paper');
  refill('researchIdeaReferenceType', refOptions, 'paper');
  if ($('researchIdeaSourceDate') && !$('researchIdeaSourceDate').value) $('researchIdeaSourceDate').value = todayStr();
  const projectSelects = [$('researchIdeaProject')].filter(Boolean);
  projectSelects.forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">暂不关联项目</option>' + state.projects.map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
    if (state.projects.some(project => project.id === current)) select.value = current;
  });
}
function addResearchIdea() {
  const title = $('researchIdeaTitle').value.trim();
  const insight = $('researchIdeaInsight').value.trim();
  if (!title) { alert('请填写思路标题。'); return; }
  if (!insight) { alert('请简要写下核心思路。'); return; }
  const timestamp = nowDateTime();
  const source = normalizeResearchIdeaSource({
    type: $('researchIdeaInitialSourceType').value,
    title: $('researchIdeaInitialSourceTitle').value.trim(),
    detail: $('researchIdeaInitialSourceDetail').value.trim(),
    url: $('researchIdeaInitialSourceUrl').value.trim(),
    date: todayStr(),
    createdAt: timestamp
  });
  const idea = normalizeResearchIdea({
    id: uid('idea'),
    title,
    area: $('researchIdeaArea').value,
    status: $('researchIdeaStatus').value,
    priority: $('researchIdeaPriority').value,
    tags: researchIdeaTagArray($('researchIdeaTags').value),
    projectId: $('researchIdeaProject').value || '',
    problem: $('researchIdeaProblem').value.trim(),
    insight,
    method: $('researchIdeaMethod').value.trim(),
    expectedValue: $('researchIdeaExpectedValue').value.trim(),
    nextStep: $('researchIdeaNextStep').value.trim(),
    sources: source ? [source] : [],
    references: [],
    createdAt: timestamp,
    updatedAt: timestamp
  });
  state.researchIdeas.ideas.unshift(idea);
  selectedResearchIdeaId = idea.id;
  ['researchIdeaTitle','researchIdeaTags','researchIdeaProblem','researchIdeaInsight','researchIdeaMethod','researchIdeaExpectedValue','researchIdeaNextStep','researchIdeaInitialSourceTitle','researchIdeaInitialSourceUrl','researchIdeaInitialSourceDetail'].forEach(id => { if ($(id)) $(id).value = ''; });
  $('researchIdeaStatus').value = 'captured';
  $('researchIdeaPriority').value = 'medium';
  saveState();
  renderAll();
}
function openResearchIdeaEditor(id) {
  const idea = researchIdeaById(id);
  if (!idea) return;
  openEditDialog({
    title:'修改科研思路',
    desc:idea.title,
    fields:[
      { name:'title', label:'标题', value:idea.title },
      { name:'area', label:'研究方向', type:'select', value:idea.area, options:RESEARCH_IDEA_AREAS.map(item => ({ value:item.value, label:`${item.icon} ${item.label}` })) },
      { name:'status', label:'状态', type:'select', value:idea.status, options:RESEARCH_IDEA_STATUSES.map(item => ({ value:item.value, label:item.label })) },
      { name:'priority', label:'优先级', type:'select', value:idea.priority, options:RESEARCH_IDEA_PRIORITIES.map(item => ({ value:item.value, label:item.label })) },
      { name:'projectId', label:'关联项目', type:'select', value:idea.projectId || '', options:[{ value:'', label:'暂不关联项目' }, ...state.projects.map(project => ({ value:project.id, label:project.title }))] },
      { name:'tags', label:'标签（逗号分隔）', value:(idea.tags || []).join(', ') },
      { name:'problem', label:'想解决的问题', type:'textarea', rows:3, value:idea.problem },
      { name:'insight', label:'核心思路', type:'textarea', rows:4, value:idea.insight },
      { name:'method', label:'可能的方法 / 技术路线', type:'textarea', rows:4, value:idea.method },
      { name:'expectedValue', label:'预期贡献 / 价值', type:'textarea', rows:3, value:idea.expectedValue },
      { name:'nextStep', label:'下一步验证动作', type:'textarea', rows:3, value:idea.nextStep }
    ],
    onSave:(values) => {
      idea.title = values.title.trim() || idea.title;
      idea.area = researchIdeaAreaMeta(values.area).value;
      idea.status = researchIdeaStatusMeta(values.status).value;
      idea.priority = researchIdeaPriorityMeta(values.priority).value;
      idea.projectId = values.projectId || '';
      idea.tags = researchIdeaTagArray(values.tags);
      idea.problem = values.problem.trim();
      idea.insight = values.insight.trim();
      idea.method = values.method.trim();
      idea.expectedValue = values.expectedValue.trim();
      idea.nextStep = values.nextStep.trim();
      idea.archivedAt = idea.status === 'archived' ? (idea.archivedAt || nowDateTime()) : '';
      idea.updatedAt = nowDateTime();
      saveState(); renderAll();
    },
    onDelete:() => {
      state.researchIdeas.ideas = state.researchIdeas.ideas.filter(item => item.id !== id);
      if (selectedResearchIdeaId === id) selectedResearchIdeaId = '';
      saveState(); renderAll();
    }
  });
}
function createResearchIdeaValidationTask(id) {
  const idea = researchIdeaById(id);
  if (!idea) return;
  let task = state.tasks.find(item => item.id === idea.validationTaskId);
  const patch = {
    title:`验证科研思路：${idea.title}`,
    projectId:idea.projectId || '',
    gtdBucket:'next',
    quadrant:idea.priority === 'high' ? 'q1' : 'q2',
    todayBucket:idea.priority === 'high' ? 'should' : '',
    dueDate:'',
    estimate:45,
    context:'科研思路',
    note:`research-idea:${idea.id}${idea.nextStep ? `｜${idea.nextStep}` : ''}`
  };
  if (task && task.status !== 'done') {
    Object.assign(task, patch);
  } else {
    task = createTask({ ...patch, status:'planned' });
    idea.validationTaskId = task?.id || '';
  }
  if (idea.status === 'captured') idea.status = 'validating';
  idea.updatedAt = nowDateTime();
  saveState(); renderAll();
}
function selectedResearchIdea() {
  let idea = researchIdeaById(selectedResearchIdeaId);
  if (!idea) {
    idea = (state.researchIdeas?.ideas || [])[0] || null;
    selectedResearchIdeaId = idea?.id || '';
  }
  return idea;
}
function addResearchIdeaSource() {
  const idea = selectedResearchIdea();
  if (!idea) { alert('请先选择一个科研思路。'); return; }
  const source = normalizeResearchIdeaSource({
    type:$('researchIdeaSourceType').value,
    title:$('researchIdeaSourceTitle').value.trim(),
    detail:$('researchIdeaSourceDetail').value.trim(),
    url:$('researchIdeaSourceUrl').value.trim(),
    date:$('researchIdeaSourceDate').value || todayStr(),
    createdAt:nowDateTime()
  });
  if (!source) { alert('请至少填写来源标题、说明或链接。'); return; }
  idea.sources.unshift(source);
  idea.updatedAt = nowDateTime();
  ['researchIdeaSourceTitle','researchIdeaSourceUrl','researchIdeaSourceDetail'].forEach(id => $(id).value = '');
  saveState(); renderAll();
}
function openResearchIdeaSourceEditor(ideaId, sourceId) {
  const idea = researchIdeaById(ideaId);
  const source = idea?.sources?.find(item => item.id === sourceId);
  if (!idea || !source) return;
  openEditDialog({
    title:'修改思路来源', desc:idea.title,
    fields:[
      { name:'type', label:'来源类型', type:'select', value:source.type, options:RESEARCH_IDEA_SOURCE_TYPES.map(item => ({ value:item.value, label:`${item.icon} ${item.label}` })) },
      { name:'date', label:'日期', type:'date', value:source.date },
      { name:'title', label:'来源标题', value:source.title },
      { name:'url', label:'链接', value:source.url },
      { name:'detail', label:'它启发了什么', type:'textarea', value:source.detail }
    ],
    onSave:(values) => {
      source.type = researchIdeaSourceTypeMeta(values.type).value;
      source.date = values.date || source.date;
      source.title = values.title.trim();
      source.url = values.url.trim();
      source.detail = values.detail.trim();
      source.updatedAt = nowDateTime();
      idea.updatedAt = nowDateTime();
      saveState(); renderAll();
    },
    onDelete:() => {
      idea.sources = idea.sources.filter(item => item.id !== sourceId);
      idea.updatedAt = nowDateTime();
      saveState(); renderAll();
    }
  });
}
function addResearchIdeaReference() {
  const idea = selectedResearchIdea();
  if (!idea) { alert('请先选择一个科研思路。'); return; }
  const reference = normalizeResearchIdeaReference({
    type:$('researchIdeaReferenceType').value,
    title:$('researchIdeaReferenceTitle').value.trim(),
    authors:$('researchIdeaReferenceAuthors').value.trim(),
    year:$('researchIdeaReferenceYear').value.trim(),
    venue:$('researchIdeaReferenceVenue').value.trim(),
    doi:$('researchIdeaReferenceDoi').value.trim(),
    url:$('researchIdeaReferenceUrl').value.trim(),
    note:$('researchIdeaReferenceNote').value.trim(),
    createdAt:nowDateTime()
  });
  if (!reference) { alert('请填写参考文献标题。'); return; }
  idea.references.unshift(reference);
  idea.updatedAt = nowDateTime();
  ['researchIdeaReferenceTitle','researchIdeaReferenceAuthors','researchIdeaReferenceYear','researchIdeaReferenceVenue','researchIdeaReferenceDoi','researchIdeaReferenceUrl','researchIdeaReferenceNote'].forEach(id => $(id).value = '');
  saveState(); renderAll();
}
function openResearchIdeaReferenceEditor(ideaId, referenceId) {
  const idea = researchIdeaById(ideaId);
  const reference = idea?.references?.find(item => item.id === referenceId);
  if (!idea || !reference) return;
  openEditDialog({
    title:'修改参考文献', desc:idea.title,
    fields:[
      { name:'type', label:'资料类型', type:'select', value:reference.type, options:RESEARCH_IDEA_REFERENCE_TYPES.map(item => ({ value:item.value, label:`${item.icon} ${item.label}` })) },
      { name:'title', label:'标题', value:reference.title },
      { name:'authors', label:'作者', value:reference.authors },
      { name:'year', label:'年份', value:reference.year },
      { name:'venue', label:'期刊 / 会议 / 来源', value:reference.venue },
      { name:'doi', label:'DOI', value:reference.doi },
      { name:'url', label:'链接', value:reference.url },
      { name:'note', label:'与该思路的关系', type:'textarea', value:reference.note }
    ],
    onSave:(values) => {
      reference.type = researchIdeaReferenceTypeMeta(values.type).value;
      reference.title = values.title.trim() || reference.title;
      reference.authors = values.authors.trim();
      reference.year = values.year.trim();
      reference.venue = values.venue.trim();
      reference.doi = values.doi.trim();
      reference.url = values.url.trim();
      reference.note = values.note.trim();
      reference.updatedAt = nowDateTime();
      idea.updatedAt = nowDateTime();
      saveState(); renderAll();
    },
    onDelete:() => {
      idea.references = idea.references.filter(item => item.id !== referenceId);
      idea.updatedAt = nowDateTime();
      saveState(); renderAll();
    }
  });
}
function renderResearchIdeaSummary() {
  const ideas = state.researchIdeas?.ideas || [];
  const withSource = ideas.filter(item => item.sources?.length).length;
  const validating = ideas.filter(item => ['validating','developing'].includes(item.status)).length;
  const adopted = ideas.filter(item => item.status === 'adopted').length;
  const cards = [
    { label:'全部思路', value:ideas.length, color:'text-dopamine-purple' },
    { label:'正在验证 / 发展', value:validating, color:'text-dopamine-orange' },
    { label:'已有来源', value:`${withSource}/${ideas.length || 0}`, color:'text-dopamine-sky' },
    { label:'参考资料', value:researchIdeaReferencesCount(), color:'text-dopamine-pink' },
    { label:'已纳入项目', value:adopted, color:'text-dopamine-mint' }
  ];
  $('researchIdeaSummary').innerHTML = cards.map(item => `<div class="small-stat p-4"><div class="text-sm text-calm-mute">${item.label}</div><div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div></div>`).join('');
}
function filteredResearchIdeas() {
  const query = ($('researchIdeaFilterQuery')?.value || '').trim().toLowerCase();
  const status = $('researchIdeaFilterStatus')?.value || '';
  const priority = $('researchIdeaFilterPriority')?.value || '';
  const area = $('researchIdeaFilterArea')?.value || '';
  return [...(state.researchIdeas?.ideas || [])].filter(idea => {
    if (status && idea.status !== status) return false;
    if (priority && idea.priority !== priority) return false;
    if (area && idea.area !== area) return false;
    if (query) {
      const sourceText = (idea.sources || []).map(item => `${item.title} ${item.detail}`).join(' ');
      const refText = (idea.references || []).map(item => `${item.title} ${item.authors} ${item.venue}`).join(' ');
      const haystack = `${idea.title} ${idea.problem} ${idea.insight} ${idea.method} ${idea.expectedValue} ${idea.nextStep} ${(idea.tags || []).join(' ')} ${sourceText} ${refText}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }).sort((a,b) => {
    const statusOrder = { validating:0, developing:1, exploring:2, captured:3, adopted:4, archived:5 };
    const priorityOrder = { high:0, medium:1, low:2 };
    return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      || (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
      || (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });
}
function renderResearchIdeaList() {
  const ideas = filteredResearchIdeas();
  $('researchIdeaCount').textContent = `${ideas.length} 个`;
  $('researchIdeaList').innerHTML = ideas.map(idea => {
    const area = researchIdeaAreaMeta(idea.area);
    const status = researchIdeaStatusMeta(idea.status);
    const priority = researchIdeaPriorityMeta(idea.priority);
    const project = projectById(idea.projectId);
    const task = state.tasks.find(item => item.id === idea.validationTaskId);
    const active = selectedResearchIdeaId === idea.id;
    return `<article class="research-idea-card ${active ? 'active' : ''} p-4" data-idea-select="${idea.id}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs font-black text-dopamine-purple">${area.icon} ${escapeHtml(area.label)}</div>
          <h3 class="font-black text-lg mt-1">${escapeHtml(idea.title)}</h3>
        </div>
        <div class="flex gap-1 flex-wrap justify-end"><span class="pill ${status.color}">${escapeHtml(status.label)}</span><span class="pill ${priority.color}">${escapeHtml(priority.label)}</span></div>
      </div>
      <div class="text-sm leading-6 mt-3 text-calm-ink">${escapeHtml(idea.insight || idea.problem || '还没有补充核心思路。')}</div>
      <div class="flex flex-wrap gap-1.5 mt-3">${(idea.tags || []).slice(0,6).map(tag => `<span class="idea-tag">#${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs text-calm-mute">
        <div>来源 <b class="text-calm-ink">${idea.sources?.length || 0}</b></div>
        <div>参考 <b class="text-calm-ink">${idea.references?.length || 0}</b></div>
        <div>实验 <b class="text-calm-ink">${experimentRunsForIdea(idea.id).length}</b></div>
        <div>${project ? `项目 <b class="text-calm-ink">已关联</b>` : '项目 未关联'}</div>
      </div>
      ${idea.nextStep ? `<div class="idea-form-note p-3 mt-3 text-xs"><b>下一步：</b>${escapeHtml(idea.nextStep)}</div>` : ''}
      <div class="flex flex-wrap gap-2 mt-4">
        <button class="px-3 py-2 rounded-xl bg-purple-50 text-dopamine-purple text-xs font-bold" data-idea-view="${idea.id}">查看详情</button>
        <button class="px-3 py-2 rounded-xl bg-white border border-calm-line text-xs font-bold" data-idea-edit="${idea.id}">修改</button>
        <button class="px-3 py-2 rounded-xl bg-sky-50 text-dopamine-sky text-xs font-bold" data-idea-task="${idea.id}">${task && task.status !== 'done' ? '更新验证任务' : '生成验证任务'}</button>
      </div>
    </article>`;
  }).join('') || '<div class="text-sm text-calm-mute p-5">还没有符合筛选条件的科研思路。先记录一个问题、假设或方法灵感吧。</div>';
  $('researchIdeaList').querySelectorAll('[data-idea-select]').forEach(card => card.onclick = event => {
    if (event.target.closest('button,a')) return;
    selectedResearchIdeaId = card.dataset.ideaSelect;
    renderResearchIdeas();
  });
  $('researchIdeaList').querySelectorAll('[data-idea-view]').forEach(btn => btn.onclick = () => { selectedResearchIdeaId = btn.dataset.ideaView; renderResearchIdeas(); });
  $('researchIdeaList').querySelectorAll('[data-idea-edit]').forEach(btn => btn.onclick = () => openResearchIdeaEditor(btn.dataset.ideaEdit));
  $('researchIdeaList').querySelectorAll('[data-idea-task]').forEach(btn => btn.onclick = () => createResearchIdeaValidationTask(btn.dataset.ideaTask));
}
function renderResearchIdeaDetail() {
  const idea = selectedResearchIdea();
  if (!idea) {
    $('researchIdeaDetail').innerHTML = '<div class="text-sm text-calm-mute p-5">选择一个科研思路后，可在这里查看完整内容、补充来源和参考文献。</div>';
    $('researchIdeaSourceManager').classList.add('hidden');
    $('researchIdeaReferenceManager').classList.add('hidden');
    return;
  }
  $('researchIdeaSourceManager').classList.remove('hidden');
  $('researchIdeaReferenceManager').classList.remove('hidden');
  const area = researchIdeaAreaMeta(idea.area);
  const status = researchIdeaStatusMeta(idea.status);
  const priority = researchIdeaPriorityMeta(idea.priority);
  const project = projectById(idea.projectId);
  const task = state.tasks.find(item => item.id === idea.validationTaskId);
  const field = (label, value) => `<div class="small-stat p-4"><div class="idea-section-label">${escapeHtml(label)}</div><div class="text-sm leading-6 mt-2 whitespace-pre-wrap">${escapeHtml(value || '未填写')}</div></div>`;
  $('researchIdeaDetail').innerHTML = `<div class="idea-detail-panel p-5">
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <div class="text-sm font-black text-dopamine-purple">${area.icon} ${escapeHtml(area.label)}</div>
        <h2 class="text-2xl font-black mt-1">${escapeHtml(idea.title)}</h2>
        <div class="flex flex-wrap gap-2 mt-3"><span class="pill ${status.color}">${escapeHtml(status.label)}</span><span class="pill ${priority.color}">${escapeHtml(priority.label)}</span>${project ? `<span class="pill bg-sky-100 text-sky-700">项目：${escapeHtml(project.title)}</span>` : ''}</div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="px-3 py-2 rounded-xl bg-white border border-calm-line text-sm font-bold" data-detail-edit="${idea.id}">修改</button>
        <button class="px-3 py-2 rounded-xl bg-sky-50 text-dopamine-sky text-sm font-bold" data-detail-task="${idea.id}">${task && task.status !== 'done' ? '更新验证任务' : '生成验证任务'}</button>
        <button class="px-3 py-2 rounded-xl bg-purple-50 text-dopamine-purple text-sm font-bold" data-detail-export="${idea.id}">导出 MD</button>
      </div>
    </div>
    <div class="flex flex-wrap gap-1.5 mt-4">${(idea.tags || []).map(tag => `<span class="idea-tag">#${escapeHtml(tag)}</span>`).join('') || '<span class="text-xs text-calm-mute">暂无标签</span>'}</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
      ${field('研究问题', idea.problem)}
      ${field('核心思路', idea.insight)}
      ${field('可能的方法 / 技术路线', idea.method)}
      ${field('预期贡献 / 价值', idea.expectedValue)}
      ${field('下一步验证动作', idea.nextStep)}
      ${field('记录信息', `创建：${idea.createdAt || '—'}\n更新：${idea.updatedAt || '—'}${task ? `\n验证任务：${task.status === 'done' ? '已完成' : '未完成'}` : ''}\n关联实验：${experimentRunsForIdea(idea.id).length} 条`)}
    </div>
  </div>`;
  $('researchIdeaDetail').querySelector('[data-detail-edit]').onclick = () => openResearchIdeaEditor(idea.id);
  $('researchIdeaDetail').querySelector('[data-detail-task]').onclick = () => createResearchIdeaValidationTask(idea.id);
  $('researchIdeaDetail').querySelector('[data-detail-export]').onclick = () => exportResearchIdeasMarkdown(idea.id);

  $('researchIdeaSourceList').innerHTML = (idea.sources || []).map(source => {
    const meta = researchIdeaSourceTypeMeta(source.type);
    const url = safeIdeaUrl(source.url);
    return `<div class="idea-source-row p-3 flex items-start justify-between gap-3">
      <div class="min-w-0"><div class="font-bold">${meta.icon} ${escapeHtml(source.title || meta.label)}</div><div class="text-xs text-calm-mute mt-1">${escapeHtml(meta.label)} · ${escapeHtml(source.date || '未填写日期')}</div>${source.detail ? `<div class="text-sm leading-6 mt-2">${escapeHtml(source.detail)}</div>` : ''}${url ? `<a class="text-xs font-bold text-dopamine-sky mt-2 inline-block" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">打开来源链接 ↗</a>` : ''}</div>
      <button class="text-sm font-bold text-dopamine-orange shrink-0" data-source-edit="${source.id}">修改</button>
    </div>`;
  }).join('') || '<div class="text-sm text-calm-mute">还没有记录思路来源。</div>';
  $('researchIdeaSourceList').querySelectorAll('[data-source-edit]').forEach(btn => btn.onclick = () => openResearchIdeaSourceEditor(idea.id, btn.dataset.sourceEdit));

  $('researchIdeaReferenceList').innerHTML = (idea.references || []).map(reference => {
    const meta = researchIdeaReferenceTypeMeta(reference.type);
    const url = safeIdeaUrl(reference.url);
    const citation = researchIdeaReferenceText(reference);
    return `<div class="idea-reference-row p-3 flex items-start justify-between gap-3">
      <div class="min-w-0"><div class="font-bold">${meta.icon} ${escapeHtml(reference.title)}</div><div class="text-xs text-calm-mute mt-1">${escapeHtml(citation || meta.label)}${reference.doi ? ` · DOI: ${escapeHtml(reference.doi)}` : ''}</div>${reference.note ? `<div class="text-sm leading-6 mt-2">${escapeHtml(reference.note)}</div>` : ''}${url ? `<a class="text-xs font-bold text-dopamine-sky mt-2 inline-block" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">打开参考资料 ↗</a>` : ''}</div>
      <button class="text-sm font-bold text-dopamine-orange shrink-0" data-reference-edit="${reference.id}">修改</button>
    </div>`;
  }).join('') || '<div class="text-sm text-calm-mute">还没有添加参考文献或相关资料。</div>';
  $('researchIdeaReferenceList').querySelectorAll('[data-reference-edit]').forEach(btn => btn.onclick = () => openResearchIdeaReferenceEditor(idea.id, btn.dataset.referenceEdit));
}
function renderResearchIdeaCharts() {
  const ideas = state.researchIdeas?.ideas || [];
  makeOrUpdateChart('researchIdeaStatusChart','researchIdeaStatus',{
    type:'doughnut',
    data:{
      labels:RESEARCH_IDEA_STATUSES.map(item => item.label),
      datasets:[{ data:RESEARCH_IDEA_STATUSES.map(status => ideas.filter(idea => idea.status === status.value).length), backgroundColor:['#F49AB0','#72BCEB','#F6C96B','#B8A4E3','#72C7A2','#B7B7C2'] }]
    },
    options:{ responsive:true, maintainAspectRatio:false }
  });
  makeOrUpdateChart('researchIdeaSourceChart','researchIdeaSources',{
    type:'bar',
    data:{
      labels:RESEARCH_IDEA_SOURCE_TYPES.map(item => item.label),
      datasets:[{ label:'来源数量', data:RESEARCH_IDEA_SOURCE_TYPES.map(type => ideas.reduce((sum, idea) => sum + (idea.sources || []).filter(source => source.type === type.value).length, 0)), backgroundColor:'#9B5DE5', borderRadius:10 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } }
  });
}
function researchIdeaMarkdown(idea) {
  const area = researchIdeaAreaMeta(idea.area);
  const status = researchIdeaStatusMeta(idea.status);
  const priority = researchIdeaPriorityMeta(idea.priority);
  const project = projectById(idea.projectId);
  const lines = [
    `# 科研思路：${idea.title}`,'',
    `- 研究方向：${area.label}`,
    `- 状态：${status.label}`,
    `- 优先级：${priority.label}`,
    `- 标签：${(idea.tags || []).join('、') || '无'}`,
    `- 关联项目：${project?.title || '未关联'}`,
    `- 创建时间：${idea.createdAt || '—'}`,
    `- 更新时间：${idea.updatedAt || '—'}`,'',
    '## 想解决的问题','',idea.problem || '未填写','',
    '## 核心思路','',idea.insight || '未填写','',
    '## 可能的方法 / 技术路线','',idea.method || '未填写','',
    '## 预期贡献 / 价值','',idea.expectedValue || '未填写','',
    '## 下一步验证动作','',idea.nextStep || '未填写','',
    '## 思路来源',''
  ];
  if (idea.sources?.length) {
    idea.sources.forEach((source,index) => {
      const meta = researchIdeaSourceTypeMeta(source.type);
      lines.push(`### ${index+1}. ${source.title || meta.label}`,'',`- 类型：${meta.label}`,`- 日期：${source.date || '未填写'}`,`- 链接：${source.url || '无'}`,`- 启发：${source.detail || '未填写'}`,'');
    });
  } else lines.push('暂无来源记录。','');
  lines.push('## 参考文献与相关资料','');
  if (idea.references?.length) {
    idea.references.forEach((reference,index) => {
      lines.push(`### ${index+1}. ${reference.title}`,'',`- 类型：${researchIdeaReferenceTypeMeta(reference.type).label}`,`- 作者：${reference.authors || '未填写'}`,`- 年份：${reference.year || '未填写'}`,`- Venue：${reference.venue || '未填写'}`,`- DOI：${reference.doi || '无'}`,`- 链接：${reference.url || '无'}`,`- 关联说明：${reference.note || '未填写'}`,'');
    });
  } else lines.push('暂无参考资料。','');
  return lines.join('\n').trim();
}
function exportResearchIdeasMarkdown(ideaId='') {
  const ideas = ideaId ? [researchIdeaById(ideaId)].filter(Boolean) : (state.researchIdeas?.ideas || []);
  if (!ideas.length) { alert('还没有科研思路可导出。'); return; }
  const markdown = ideas.map(researchIdeaMarkdown).join('\n\n---\n\n');
  const blob = new Blob([markdown], { type:'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ideaId ? `research_idea_${ideas[0].title.replace(/[\\/:*?"<>|]/g,'_')}.md` : `research_ideas_${todayStr()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
function renderResearchIdeas() {
  initializeResearchIdeaControls();
  if (!researchIdeaById(selectedResearchIdeaId)) selectedResearchIdeaId = state.researchIdeas?.ideas?.[0]?.id || '';
  renderResearchIdeaSummary();
  renderResearchIdeaList();
  renderResearchIdeaDetail();
  renderResearchIdeaCharts();
}
function bindResearchIdeaEvents() {
  initializeResearchIdeaControls();
  $('btnAddResearchIdea').onclick = addResearchIdea;
  $('btnExportResearchIdeasMd').onclick = () => exportResearchIdeasMarkdown();
  ['researchIdeaFilterQuery','researchIdeaFilterStatus','researchIdeaFilterPriority','researchIdeaFilterArea'].forEach(id => {
    const el = $(id);
    if (!el) return;
    const eventName = el.tagName === 'INPUT' ? 'input' : 'change';
    el.addEventListener(eventName, renderResearchIdeas);
  });
  $('btnAddResearchIdeaSource').onclick = addResearchIdeaSource;
  $('btnAddResearchIdeaReference').onclick = addResearchIdeaReference;
}
