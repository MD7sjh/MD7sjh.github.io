/* Multi-paper progress: conference, journal, thesis, workshop, and reports. */
'use strict';

let selectedPaperId = '';

function selectedPaper() {
  if (!selectedPaperId || !paperById(selectedPaperId)) selectedPaperId = state.papers?.items?.[0]?.id || '';
  return paperById(selectedPaperId);
}
function paperLinkedProject(paper) {
  return projectById(paper?.projectId || '');
}
function paperProjectExecutionMeta(paper) {
  const project = paperLinkedProject(paper);
  if (!project) return { project:null, tasks:[], open:0, done:0, progress:0 };
  const tasks = tasksForProject(project.id);
  const open = tasks.filter(taskOpen).length;
  const done = tasks.filter(item => item.status === 'done').length;
  return { project, tasks, open, done, progress:Math.round(done / Math.max(1, open + done) * 100) };
}
function renderPaperCreateProjectOptions() {
  const select = $('paperNewProjectId');
  if (!select) return;
  const current = select.value || '';
  select.innerHTML = '<option value="">独立论文（暂不关联项目）</option>' + state.projects.map(project => `<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
  select.value = state.projects.some(project => project.id === current) ? current : '';
}
function renderPaperThemeStats() {
  const range = getStatsRange(todayStr());
  $('paperStatsRangeLabel').textContent = range.label;
  const logs = paperLogsInRange(range.start, range.end);
  const minutes = logs.reduce((sum,item) => sum + Number(item.log.minutes || 0),0);
  const words = logs.reduce((sum,item) => sum + Number(item.log.words || 0),0);
  const milestones = (state.papers?.items || []).flatMap(paper => paper.milestones || []).filter(item => item.doneAt && isDateInRange(dateFromDateTime(item.doneAt),range.start,range.end)).length;
  const sectionUpdates = (state.papers?.items || []).flatMap(paper => paper.sections || []).filter(item => item.updatedAt && isDateInRange(dateFromDateTime(item.updatedAt),range.start,range.end)).length;
  const cards = [
    {label:'论文总数',value:state.papers?.items?.length || 0,color:'text-dopamine-purple'},
    {label:'独立论文',value:(state.papers?.items || []).filter(paper => !paperLinkedProject(paper)).length,color:'text-dopamine-pink'},
    {label:'已关联项目',value:(state.papers?.items || []).filter(paper => !!paperLinkedProject(paper)).length,color:'text-dopamine-mint'},
    {label:'推进中',value:activePapers().length,color:'text-dopamine-sky'},
    {label:`${statsModeText()}日志`,value:logs.length,color:'text-dopamine-orange'},
    {label:`${statsModeText()}投入`,value:formatMinutes(minutes),color:'text-dopamine-mint'},
    {label:`${statsModeText()}写作`,value:`${Math.round(words)} 字`,color:'text-dopamine-pink'},
    {label:`${statsModeText()}章节更新`,value:sectionUpdates,color:'text-dopamine-purple'},
    {label:`${statsModeText()}里程碑`,value:milestones,color:'text-dopamine-mint'}
  ];
  $('paperThemeStats').innerHTML = cards.map(item => `<div class="small-stat p-4"><div class="text-sm text-calm-mute">${item.label}</div><div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div></div>`).join('');
}
function addPaper() {
  const title = $('paperNewTitle').value.trim();
  if (!title) { alert('请填写论文名称。'); return; }
  const paper = normalizePaperItem({
    id:uid('paper'), title,
    type:$('paperNewType').value || 'conference', venue:$('paperNewVenue').value.trim(), deadline:$('paperNewDeadline').value || '',
    projectId:$('paperNewProjectId')?.value || '',
    status:'drafting', createdAt:nowDateTime(), updatedAt:nowDateTime()
  });
  state.papers.items.unshift(paper);
  selectedPaperId = paper.id;
  $('paperNewTitle').value=''; $('paperNewVenue').value=''; $('paperNewDeadline').value=''; if ($('paperNewProjectId')) $('paperNewProjectId').value='';
  saveState(); renderAll();
}
function renderPaperList() {
  const items = state.papers?.items || [];
  const container = $('paperList');
  function paperCard(paper) {
    const type = paperTypeMeta(paper.type); const status = paperStatusMeta(paper.status); const progress = paperOverallProgressValue(paper);
    const project = paperLinkedProject(paper);
    return `<button class="paper-list-item ${selectedPaperId===paper.id?'active':''}" data-paper-select="${paper.id}">
      <div class="flex items-start justify-between gap-3"><div class="min-w-0 text-left"><div class="font-black truncate">${type.icon} ${escapeHtml(paper.title)}</div><div class="text-xs text-calm-mute mt-1 truncate">${escapeHtml(type.label)}${paper.venue?` · ${escapeHtml(paper.venue)}`:''}</div></div><span class="pill ${status.color}">${escapeHtml(status.label)}</span></div>
      <div class="mt-2 text-xs ${project ? 'text-dopamine-mint' : 'text-calm-mute'} text-left truncate">${project ? `🔗 ${escapeHtml(project.title)}` : '◌ 独立论文 · 未关联项目'}</div>
      <div class="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full bg-gradient-to-r from-dopamine-purple to-dopamine-sky" style="width:${progress}%"></div></div>
      <div class="flex justify-between text-xs text-calm-mute mt-2"><span>${progress}%</span><span>${paper.deadline?`截止 ${escapeHtml(paper.deadline)}`:'未设截止'}</span></div>
    </button>`;
  }
  const linked = items.filter(paper => !!paperLinkedProject(paper));
  const independent = items.filter(paper => !paperLinkedProject(paper));
  const section = (title, desc, list, tone) => list.length ? `<div class="paper-list-group"><div class="flex items-center justify-between gap-3 px-1 mb-2"><div><div class="font-black ${tone}">${title}</div><div class="text-xs text-calm-mute mt-1">${desc}</div></div><span class="pill bg-white border border-calm-line text-calm-mute">${list.length}</span></div><div class="space-y-3">${list.map(paperCard).join('')}</div></div>` : '';
  container.innerHTML = [
    section('🔗 已关联项目', '只引用项目的任务与执行进度，不同步论文状态。', linked, 'text-dopamine-mint'),
    section('📄 独立论文', '完全独立于项目看板，可单独维护论文进度。', independent, 'text-dopamine-purple')
  ].filter(Boolean).join('<div class="h-5"></div>') || '<div class="text-sm text-calm-mute">还没有论文。可以先创建一篇 Conference、Journal 或其他论文。</div>';
  container.querySelectorAll('[data-paper-select]').forEach(btn => btn.onclick = () => { selectedPaperId=btn.dataset.paperSelect; renderPapers(); });
}
function renderPaperDetail() {
  const paper = selectedPaper();
  $('paperDetailEmpty').classList.toggle('hidden', !!paper);
  $('paperDetailContent').classList.toggle('hidden', !paper);
  if (!paper) return;
  setInputIfIdle('paperMetaTitle',paper.title); setInputIfIdle('paperMetaType',paper.type); setInputIfIdle('paperMetaVenue',paper.venue);
  setInputIfIdle('paperMetaDeadline',paper.deadline); setInputIfIdle('paperMetaStatus',paper.status); setInputIfIdle('paperMetaVersion',paper.version);
  setInputIfIdle('paperMetaSubmissionId',paper.submissionId); setInputIfIdle('paperMetaNote',paper.note);
  const projectSelect=$('paperMetaProjectId');
  if (projectSelect) {
    const projectCurrent = paper.projectId || '';
    projectSelect.innerHTML='<option value="">独立论文（不关联项目）</option>' + state.projects.map(project=>`<option value="${project.id}">${escapeHtml(project.title)}</option>`).join('');
    projectSelect.value=state.projects.some(project=>project.id===projectCurrent)?projectCurrent:'';
  }
  const subSelect=$('paperMetaSubmissionId');
  const current=paper.submissionId || '';
  subSelect.innerHTML='<option value="">不关联投稿项目</option>' + state.submissions.map(item=>`<option value="${item.id}">${escapeHtml(item.title)}${item.venue?` · ${escapeHtml(item.venue)}`:''}</option>`).join('');
  subSelect.value=state.submissions.some(item=>item.id===current)?current:'';
  const progress=paperOverallProgressValue(paper);
  $('paperOverallText').textContent=`${progress}%`; $('paperOverallBar').style.width=`${progress}%`;
  $('paperOverallHint').textContent=`里程碑 ${(paper.milestones||[]).filter(item=>item.done).length}/${paper.milestones?.length||0} · 内容部分 ${paper.sections?.length||0} 个 · 关联实验 ${experimentRunsForPaper(paper.id).length} 条`;
  $('paperSelectedName').textContent=paper.title;
  const execution = paperProjectExecutionMeta(paper);
  if ($('paperProjectLinkPanel')) {
    $('paperProjectLinkPanel').innerHTML = execution.project ? `<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><div class="text-sm text-calm-mute">弱关联执行项目</div><div class="font-black text-lg mt-1">🔗 ${escapeHtml(execution.project.title)}</div><div class="text-xs text-calm-mute mt-1">项目状态：${escapeHtml(projectStatusMeta(execution.project.status).label)} · 任务 ${execution.tasks.length} · 未完成 ${execution.open} · 已完成 ${execution.done} · 执行进度 ${execution.progress}%</div></div><button id="btnPaperOpenProject" class="px-4 py-2 rounded-2xl bg-dopamine-mint text-white font-black shrink-0">查看项目</button></div><div class="mt-3 text-xs text-calm-mute">论文名称、状态、截止日期、章节进度不会自动改写项目；项目任务完成也不会自动写入论文日志。</div>` : `<div><div class="font-black text-dopamine-purple">📄 当前为独立论文</div><div class="text-sm text-calm-mute mt-1">这篇论文与项目看板完全分离。若以后需要执行层联动，可在上方“关联执行项目”中手动选择一个已有项目。</div></div>`;
    const openButton=$('btnPaperOpenProject');
    if (openButton && execution.project) openButton.onclick=()=>{ workflowSelectedProjectId=execution.project.id; navTo('workflow-section'); renderWorkflow(); };
  }
  renderPaperMilestones(paper); renderPaperSections(paper); renderPaperLogs(paper);
}
function savePaperMeta() {
  const paper=selectedPaper(); if(!paper) return;
  paper.title=$('paperMetaTitle').value.trim() || paper.title; paper.type=$('paperMetaType').value; paper.venue=$('paperMetaVenue').value.trim();
  paper.deadline=$('paperMetaDeadline').value || ''; paper.status=$('paperMetaStatus').value; paper.version=$('paperMetaVersion').value.trim();
  paper.projectId=$('paperMetaProjectId')?.value || ''; paper.submissionId=$('paperMetaSubmissionId').value || ''; paper.note=$('paperMetaNote').value.trim(); paper.updatedAt=nowDateTime();
  saveState(); renderAll();
}
function deleteSelectedPaper() {
  const paper=selectedPaper(); if(!paper || !confirm(`确定删除论文“${paper.title}”吗？\n\n关联项目不会被删除。`)) return;
  state.papers.items=state.papers.items.filter(item=>item.id!==paper.id); selectedPaperId=''; saveState(); renderAll();
}
function addPaperMilestone() {
  const paper=selectedPaper(); const name=$('paperMilestoneName').value.trim(); if(!paper||!name) return;
  paper.milestones.unshift(normalizePaperMilestone({id:uid('pms'),name,due:$('paperMilestoneDue').value||''}));
  paper.updatedAt=nowDateTime(); $('paperMilestoneName').value=''; $('paperMilestoneDue').value=''; saveState(); renderAll();
}
function togglePaperMilestone(id) { const paper=selectedPaper(); const item=paper?.milestones.find(v=>v.id===id); if(!item)return; item.done=!item.done; item.doneAt=item.done?nowDateTime():''; paper.updatedAt=nowDateTime(); saveState(); renderAll(); }
function renderPaperMilestones(paper) {
  $('paperMilestoneList').innerHTML=(paper.milestones||[]).map(item=>`<div class="rounded-2xl border border-calm-line bg-white p-3 flex items-center justify-between gap-3"><div class="flex items-center gap-3 min-w-0"><button class="w-10 h-10 rounded-2xl ${item.done?'bg-green-100 text-green-700':'bg-gray-100 text-calm-mute'} font-black" data-paper-ms-toggle="${item.id}">${item.done?'✓':''}</button><div class="min-w-0"><div class="font-black ${item.done?'line-through text-calm-mute':''}">${escapeHtml(item.name)}</div><div class="text-xs text-calm-mute mt-1">${item.due?`截止 ${escapeHtml(item.due)}`:'未设截止'}${item.doneAt?` · 完成 ${escapeHtml(item.doneAt)}`:''}</div></div></div><button class="text-sm font-bold text-dopamine-orange" data-paper-ms-edit="${item.id}">修改</button></div>`).join('') || '<div class="text-sm text-calm-mute">暂无里程碑。</div>';
  $('paperMilestoneList').querySelectorAll('[data-paper-ms-toggle]').forEach(btn=>btn.onclick=()=>togglePaperMilestone(btn.dataset.paperMsToggle));
  $('paperMilestoneList').querySelectorAll('[data-paper-ms-edit]').forEach(btn=>btn.onclick=()=>openPaperMilestoneEditor(btn.dataset.paperMsEdit));
}
function openPaperMilestoneEditor(id) {
  const paper=selectedPaper(); const item=paper?.milestones.find(v=>v.id===id); if(!item)return;
  openEditDialog({title:'修改里程碑',desc:paper.title,fields:[{name:'name',label:'名称',value:item.name},{name:'due',label:'截止日期',type:'date',value:item.due||''},{name:'note',label:'备注',type:'textarea',value:item.note||''}],onSave:vals=>{item.name=vals.name.trim()||item.name;item.due=vals.due||'';item.note=vals.note||'';paper.updatedAt=nowDateTime();saveState();renderAll();},onDelete:()=>{paper.milestones=paper.milestones.filter(v=>v.id!==id);paper.updatedAt=nowDateTime();saveState();renderAll();}});
}
function addPaperSection() {
  const paper=selectedPaper(); const name=$('paperSectionName').value.trim(); if(!paper||!name)return;
  paper.sections.unshift(normalizePaperSection({id:uid('psec'),name,status:$('paperSectionStatus').value||'draft',updatedAt:nowDateTime()}));
  paper.updatedAt=nowDateTime(); $('paperSectionName').value=''; saveState(); renderAll();
}
function setPaperSectionProgress(id,value) { const paper=selectedPaper(); const item=paper?.sections.find(v=>v.id===id); if(!item)return; item.progress=clamp(value,0,100); if(item.progress>=100)item.status='done'; item.updatedAt=nowDateTime(); paper.updatedAt=nowDateTime(); saveState(); renderAll(); }
function renderPaperSections(paper) {
  const statusText={draft:'草稿',revise:'修改',done:'完成'}; const statusColor={draft:'bg-gray-100 text-calm-mute',revise:'bg-amber-100 text-amber-700',done:'bg-green-100 text-green-700'};
  $('paperSectionList').innerHTML=(paper.sections||[]).map(item=>`<div class="rounded-2xl border border-calm-line bg-white p-4"><div class="flex items-start justify-between gap-3"><div><div class="font-black">${escapeHtml(item.name)}</div><div class="text-xs text-calm-mute mt-1">${item.updatedAt?`更新 ${escapeHtml(item.updatedAt)}`:'未更新'}</div></div><div class="flex items-center gap-2"><span class="pill ${statusColor[item.status]||statusColor.draft}">${statusText[item.status]||'草稿'}</span><button class="text-sm font-bold text-dopamine-orange" data-paper-sec-edit="${item.id}">修改</button></div></div><div class="mt-3 flex items-center gap-3"><input data-paper-sec-range="${item.id}" type="range" min="0" max="100" value="${Number(item.progress)||0}" class="w-full"><span class="font-black mono w-12 text-right">${Math.round(Number(item.progress)||0)}%</span></div></div>`).join('') || '<div class="text-sm text-calm-mute">暂无内容部分。</div>';
  $('paperSectionList').querySelectorAll('[data-paper-sec-range]').forEach(el=>el.onchange=()=>setPaperSectionProgress(el.dataset.paperSecRange,el.value));
  $('paperSectionList').querySelectorAll('[data-paper-sec-edit]').forEach(btn=>btn.onclick=()=>openPaperSectionEditor(btn.dataset.paperSecEdit));
}
function openPaperSectionEditor(id) {
  const paper=selectedPaper(); const item=paper?.sections.find(v=>v.id===id); if(!item)return;
  openEditDialog({title:'修改论文部分',desc:paper.title,fields:[{name:'name',label:'名称',value:item.name},{name:'progress',label:'进度 0-100',type:'number',value:String(item.progress||0)},{name:'status',label:'状态',type:'select',value:item.status,options:PAPER_SECTION_STATUSES},{name:'note',label:'备注',type:'textarea',value:item.note||''}],onSave:vals=>{item.name=vals.name.trim()||item.name;item.progress=clamp(vals.progress,0,100);item.status=PAPER_SECTION_STATUSES.some(v=>v.value===vals.status)?vals.status:item.status;if(item.progress>=100)item.status='done';item.note=vals.note||'';item.updatedAt=nowDateTime();paper.updatedAt=nowDateTime();saveState();renderAll();},onDelete:()=>{paper.sections=paper.sections.filter(v=>v.id!==id);paper.updatedAt=nowDateTime();saveState();renderAll();}});
}
function addPaperLog() {
  const paper=selectedPaper(); if(!paper)return;
  paper.logs.unshift(normalizePaperLog({id:uid('plog'),date:$('paperLogDate').value||todayStr(),type:$('paperLogType').value,minutes:$('paperLogMinutes').value,words:$('paperLogWords').value,note:$('paperLogNote').value.trim(),at:nowDateTime()}));
  paper.updatedAt=nowDateTime(); $('paperLogMinutes').value=''; $('paperLogWords').value=''; $('paperLogNote').value=''; saveState(); renderAll();
}
function renderPaperLogs(paper) {
  $('paperLogList').innerHTML=(paper.logs||[]).slice(0,40).map(item=>{const type=PAPER_LOG_TYPES.find(v=>v.value===item.type)||PAPER_LOG_TYPES.at(-1);return `<div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-black">${type.icon} ${escapeHtml(item.date)} · ${escapeHtml(type.label)}</div><div class="text-xs text-calm-mute mt-1">${item.minutes?`${Math.round(item.minutes)} 分钟`:'—'}${item.words?` · ${Math.round(item.words)} 字`:''}${item.note?` · ${escapeHtml(item.note)}`:''}</div></div><button class="text-sm font-bold text-dopamine-orange" data-paper-log-edit="${item.id}">修改</button></div>`;}).join('') || '<div class="text-sm text-calm-mute">暂无推进日志。</div>';
  $('paperLogList').querySelectorAll('[data-paper-log-edit]').forEach(btn=>btn.onclick=()=>openPaperLogEditor(btn.dataset.paperLogEdit));
}
function openPaperLogEditor(id) {
  const paper=selectedPaper(); const item=paper?.logs.find(v=>v.id===id); if(!item)return;
  openEditDialog({title:'修改论文推进日志',desc:paper.title,fields:[{name:'date',label:'日期',type:'date',value:item.date},{name:'type',label:'类型',type:'select',value:item.type,options:PAPER_LOG_TYPES},{name:'minutes',label:'分钟',type:'number',value:String(item.minutes||0)},{name:'words',label:'字数',type:'number',value:String(item.words||0)},{name:'note',label:'备注',type:'textarea',value:item.note||''}],onSave:vals=>{item.date=vals.date||item.date;item.type=PAPER_LOG_TYPES.some(v=>v.value===vals.type)?vals.type:item.type;item.minutes=Math.max(0,Number(vals.minutes)||0);item.words=Math.max(0,Number(vals.words)||0);item.note=vals.note||'';paper.updatedAt=nowDateTime();saveState();renderAll();},onDelete:()=>{paper.logs=paper.logs.filter(v=>v.id!==id);paper.updatedAt=nowDateTime();saveState();renderAll();}});
}
function renderPapers() { selectedPaper(); renderPaperCreateProjectOptions(); renderPaperThemeStats(); renderPaperList(); renderPaperDetail(); }
function bindPaperEvents() {
  $('btnAddPaper').onclick=addPaper; $('btnSavePaperMeta').onclick=savePaperMeta; $('btnDeletePaper').onclick=deleteSelectedPaper;
  $('btnAddPaperMilestone').onclick=addPaperMilestone; $('btnAddPaperSection').onclick=addPaperSection; $('btnAddPaperLog').onclick=addPaperLog; $('paperLogDate').value=todayStr();
}
