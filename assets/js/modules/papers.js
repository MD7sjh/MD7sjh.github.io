/* Multi-paper progress: conference, journal, thesis, workshop, and reports. */
'use strict';

let selectedPaperId = '';

function selectedPaper() {
  if (!selectedPaperId || !paperById(selectedPaperId)) selectedPaperId = state.papers?.items?.[0]?.id || '';
  return paperById(selectedPaperId);
}
function paperProjectNote(id) { return `paper:${id}`; }
function syncPaperProject(paper) {
  if (!paper) return { project:null, changed:false };
  const note = paperProjectNote(paper.id);
  let project = state.projects.find(item => item.note === note);
  const meta = paperTypeMeta(paper.type);
  const status = ['accepted'].includes(paper.status) ? 'done' : paper.status === 'archived' ? 'paused' : 'active';
  const patch = {
    title: paper.title,
    outcome: `${meta.label}${paper.venue ? ` · ${paper.venue}` : ''} · ${paperStatusMeta(paper.status).label}`,
    area:'writing', status, deadline:paper.deadline || '', note, updatedAt:paper.updatedAt || nowDateTime()
  };
  let changed = false;
  if (project) {
    changed = Object.entries(patch).some(([key,value]) => String(project[key] ?? '') !== String(value ?? ''));
    if (changed) Object.assign(project, patch);
  } else {
    project = normalizeProjectItem({ id:uid('proj'), ...patch, startDate:todayStr(), createdAt:nowDateTime() });
    state.projects.unshift(project);
    changed = true;
  }
  return { project, changed };
}
function syncAllPaperProjects() {
  let changed = false;
  (state.papers?.items || []).forEach(paper => { if (syncPaperProject(paper).changed) changed = true; });
  return changed;
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
    status:'drafting', createdAt:nowDateTime(), updatedAt:nowDateTime()
  });
  state.papers.items.unshift(paper);
  selectedPaperId = paper.id;
  syncPaperProject(paper);
  $('paperNewTitle').value=''; $('paperNewVenue').value=''; $('paperNewDeadline').value='';
  saveState(); renderAll();
}
function renderPaperList() {
  const items = state.papers?.items || [];
  const container = $('paperList');
  container.innerHTML = items.map(paper => {
    const type = paperTypeMeta(paper.type); const status = paperStatusMeta(paper.status); const progress = paperOverallProgressValue(paper);
    return `<button class="paper-list-item ${selectedPaperId===paper.id?'active':''}" data-paper-select="${paper.id}">
      <div class="flex items-start justify-between gap-3"><div class="min-w-0 text-left"><div class="font-black truncate">${type.icon} ${escapeHtml(paper.title)}</div><div class="text-xs text-calm-mute mt-1 truncate">${escapeHtml(type.label)}${paper.venue?` · ${escapeHtml(paper.venue)}`:''}</div></div><span class="pill ${status.color}">${escapeHtml(status.label)}</span></div>
      <div class="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full bg-gradient-to-r from-dopamine-purple to-dopamine-sky" style="width:${progress}%"></div></div>
      <div class="flex justify-between text-xs text-calm-mute mt-2"><span>${progress}%</span><span>${paper.deadline?`截止 ${escapeHtml(paper.deadline)}`:'未设截止'}</span></div>
    </button>`;
  }).join('') || '<div class="text-sm text-calm-mute">还没有论文。可以先创建一篇 Conference、Journal 或其他论文。</div>';
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
  const subSelect=$('paperMetaSubmissionId');
  const current=paper.submissionId || '';
  subSelect.innerHTML='<option value="">不关联投稿项目</option>' + state.submissions.map(item=>`<option value="${item.id}">${escapeHtml(item.title)}${item.venue?` · ${escapeHtml(item.venue)}`:''}</option>`).join('');
  subSelect.value=state.submissions.some(item=>item.id===current)?current:'';
  const progress=paperOverallProgressValue(paper);
  $('paperOverallText').textContent=`${progress}%`; $('paperOverallBar').style.width=`${progress}%`;
  $('paperOverallHint').textContent=`里程碑 ${(paper.milestones||[]).filter(item=>item.done).length}/${paper.milestones?.length||0} · 内容部分 ${paper.sections?.length||0} 个 · 关联实验 ${experimentRunsForPaper(paper.id).length} 条`;
  $('paperSelectedName').textContent=paper.title;
  renderPaperMilestones(paper); renderPaperSections(paper); renderPaperLogs(paper);
}
function savePaperMeta() {
  const paper=selectedPaper(); if(!paper) return;
  paper.title=$('paperMetaTitle').value.trim() || paper.title; paper.type=$('paperMetaType').value; paper.venue=$('paperMetaVenue').value.trim();
  paper.deadline=$('paperMetaDeadline').value || ''; paper.status=$('paperMetaStatus').value; paper.version=$('paperMetaVersion').value.trim();
  paper.submissionId=$('paperMetaSubmissionId').value || ''; paper.note=$('paperMetaNote').value.trim(); paper.updatedAt=nowDateTime();
  syncPaperProject(paper); saveState(); renderAll();
}
function deleteSelectedPaper() {
  const paper=selectedPaper(); if(!paper || !confirm(`确定删除论文“${paper.title}”吗？`)) return;
  const project=state.projects.find(item=>item.note===paperProjectNote(paper.id));
  if(project) state.tasks=state.tasks.map(task=>task.projectId===project.id?{...task,projectId:''}:task);
  state.projects=state.projects.filter(item=>item.note!==paperProjectNote(paper.id));
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
function renderPapers() { if (syncAllPaperProjects()) saveState(); selectedPaper(); renderPaperThemeStats(); renderPaperList(); renderPaperDetail(); }
function bindPaperEvents() {
  $('btnAddPaper').onclick=addPaper; $('btnSavePaperMeta').onclick=savePaperMeta; $('btnDeletePaper').onclick=deleteSelectedPaper;
  $('btnAddPaperMilestone').onclick=addPaperMilestone; $('btnAddPaperSection').onclick=addPaperSection; $('btnAddPaperLog').onclick=addPaperLog; $('paperLogDate').value=todayStr();
}
