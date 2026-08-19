/* Deep-learning CV experiment result management. */
'use strict';

let selectedExperimentRunId = '';

function selectedExperimentRun() {
  if (!selectedExperimentRunId || !experimentRunById(selectedExperimentRunId)) {
    selectedExperimentRunId = state.experiments?.runs?.[0]?.id || '';
  }
  return experimentRunById(selectedExperimentRunId);
}
function experimentMetricDisplay(metric) {
  if (!metric) return '—';
  const value = Number(metric.value);
  const text = Number.isFinite(value) ? (Math.abs(value) >= 1000 ? value.toLocaleString() : String(Math.round(value * 10000) / 10000)) : String(metric.value ?? '—');
  return `${text}${metric.unit ? ` ${metric.unit}` : ''}`;
}
function experimentLinkLabel(run) {
  const parts = [];
  const project = projectById(run.projectId); const idea = researchIdeaById(run.ideaId); const paper = paperById(run.paperId);
  if (project) parts.push(`项目：${project.title}`);
  if (idea) parts.push(`思路：${idea.title}`);
  if (paper) parts.push(`论文：${paper.title}`);
  return parts.join(' · ');
}
function experimentMetricOptionsHtml() {
  return EXPERIMENT_METRIC_PRESETS.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}${item.unit ? ` (${escapeHtml(item.unit)})` : ''}</option>`).join('');
}
function fillExperimentRelationOptions() {
  const setOptions = (id, firstLabel, items, labelFn) => {
    const el = $(id); if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>` + items.map(item => `<option value="${item.id}">${escapeHtml(labelFn(item))}</option>`).join('');
    el.value = items.some(item => item.id === current) ? current : '';
  };
  setOptions('experimentProject','不关联项目',state.projects, item => item.title);
  setOptions('experimentIdea','不关联科研思路',state.researchIdeas?.ideas || [], item => item.title);
  setOptions('experimentPaper','不关联论文',state.papers?.items || [], item => item.title);
}
function fillExperimentRunSelectors() {
  const runs = state.experiments?.runs || [];
  ['experimentMetricRun','experimentArtifactRun'].forEach(id => {
    const el = $(id); if (!el) return;
    const current = el.value || selectedExperimentRunId;
    el.innerHTML = '<option value="">选择实验</option>' + runs.map(run => `<option value="${run.id}">${escapeHtml(run.name)}</option>`).join('');
    el.value = runs.some(run => run.id === current) ? current : (runs[0]?.id || '');
  });
}
function initializeExperimentControls() {
  if ($('experimentDate') && !$('experimentDate').value) $('experimentDate').value = todayStr();
  if ($('experimentTaskType') && !$('experimentTaskType').options.length) $('experimentTaskType').innerHTML = EXPERIMENT_TASK_TYPES.map(item => `<option value="${item.value}">${item.icon} ${escapeHtml(item.label)}</option>`).join('');
  if ($('experimentStatus') && !$('experimentStatus').options.length) { $('experimentStatus').innerHTML = EXPERIMENT_STATUSES.map(item => `<option value="${item.value}">${escapeHtml(item.label)}</option>`).join(''); $('experimentStatus').value = 'completed'; }
  if ($('experimentFilterTask')) { const current=$('experimentFilterTask').value; $('experimentFilterTask').innerHTML = '<option value="">全部任务</option>' + EXPERIMENT_TASK_TYPES.map(item => `<option value="${item.value}">${item.icon} ${escapeHtml(item.label)}</option>`).join(''); $('experimentFilterTask').value=EXPERIMENT_TASK_TYPES.some(item=>item.value===current)?current:''; }
  if ($('experimentFilterStatus')) { const current=$('experimentFilterStatus').value; $('experimentFilterStatus').innerHTML = '<option value="">全部状态</option>' + EXPERIMENT_STATUSES.map(item => `<option value="${item.value}">${escapeHtml(item.label)}</option>`).join(''); $('experimentFilterStatus').value=EXPERIMENT_STATUSES.some(item=>item.value===current)?current:''; }
  if ($('experimentMetricName') && !$('experimentMetricName').options.length) $('experimentMetricName').innerHTML = '<option value="">选择 / 输入常见指标</option>' + experimentMetricOptionsHtml() + '<option value="custom">自定义指标…</option>';
  if ($('experimentArtifactType') && !$('experimentArtifactType').options.length) $('experimentArtifactType').innerHTML = EXPERIMENT_ARTIFACT_TYPES.map(item => `<option value="${item.value}">${item.icon} ${escapeHtml(item.label)}</option>`).join('');
  fillExperimentRelationOptions(); fillExperimentRunSelectors();
}
function addExperimentRun() {
  const name = $('experimentName').value.trim();
  if (!name) { alert('请填写实验名称。'); return; }
  const run = normalizeExperimentRun({
    id:uid('exprun'), name,
    taskType:$('experimentTaskType').value || 'other', status:$('experimentStatus').value || 'completed', date:$('experimentDate').value || todayStr(),
    projectId:$('experimentProject').value || '', ideaId:$('experimentIdea').value || '', paperId:$('experimentPaper').value || '',
    dataset:$('experimentDataset').value.trim(), model:$('experimentModel').value.trim(), variant:$('experimentVariant').value.trim(),
    seed:$('experimentSeed').value.trim(), hardware:$('experimentHardware').value.trim(), inputSize:$('experimentInputSize').value.trim(),
    epochs:$('experimentEpochs').value.trim(), batchSize:$('experimentBatchSize').value.trim(), learningRate:$('experimentLearningRate').value.trim(),
    codeRef:$('experimentCodeRef').value.trim(), checkpoint:$('experimentCheckpoint').value.trim(),
    conclusion:$('experimentConclusion').value.trim(), notes:$('experimentNotes').value.trim(), tags:$('experimentTags').value.trim(),
    metrics:[], artifacts:[], createdAt:nowDateTime(), updatedAt:nowDateTime()
  });
  if (!run) return;
  state.experiments.runs.unshift(run); selectedExperimentRunId = run.id;
  ['experimentName','experimentDataset','experimentModel','experimentVariant','experimentSeed','experimentHardware','experimentInputSize','experimentEpochs','experimentBatchSize','experimentLearningRate','experimentCodeRef','experimentCheckpoint','experimentConclusion','experimentNotes','experimentTags'].forEach(id => { if ($(id)) $(id).value=''; });
  saveState(); renderAll();
}
function deleteExperimentRun(id) {
  if (!confirm('确定删除这条实验结果吗？')) return;
  state.experiments.runs = (state.experiments?.runs || []).filter(item => item.id !== id);
  if (selectedExperimentRunId === id) selectedExperimentRunId = '';
  saveState(); renderAll();
}
function toggleExperimentStar(id) {
  const run = experimentRunById(id); if (!run) return;
  run.starred = !run.starred; run.updatedAt = nowDateTime(); saveState(); renderAll();
}
function openExperimentRunEditor(id) {
  const run = experimentRunById(id); if (!run) return;
  openEditDialog({
    title:'修改实验结果', desc:run.name,
    fields:[
      {name:'name',label:'实验名称',value:run.name},
      {name:'taskType',label:'CV 任务',type:'select',value:run.taskType,options:EXPERIMENT_TASK_TYPES},
      {name:'status',label:'状态',type:'select',value:run.status,options:EXPERIMENT_STATUSES},
      {name:'date',label:'实验日期',type:'date',value:run.date},
      {name:'dataset',label:'数据集',value:run.dataset},
      {name:'model',label:'模型 / Backbone',value:run.model},
      {name:'variant',label:'实验变体 / Ablation',value:run.variant},
      {name:'hardware',label:'硬件',value:run.hardware},
      {name:'conclusion',label:'主要结论',type:'textarea',value:run.conclusion},
      {name:'notes',label:'备注',type:'textarea',value:run.notes}
    ],
    onSave:vals => {
      run.name=vals.name.trim()||run.name; run.taskType=EXPERIMENT_TASK_TYPES.some(v=>v.value===vals.taskType)?vals.taskType:run.taskType;
      run.status=EXPERIMENT_STATUSES.some(v=>v.value===vals.status)?vals.status:run.status; run.date=vals.date||run.date;
      run.dataset=vals.dataset.trim(); run.model=vals.model.trim(); run.variant=vals.variant.trim(); run.hardware=vals.hardware.trim();
      run.conclusion=vals.conclusion||''; run.notes=vals.notes||''; run.updatedAt=nowDateTime(); saveState(); renderAll();
    },
    onDelete:()=>{ state.experiments.runs=state.experiments.runs.filter(item=>item.id!==id); if(selectedExperimentRunId===id)selectedExperimentRunId=''; saveState(); renderAll(); }
  });
}
function addExperimentMetric() {
  const run = experimentRunById($('experimentMetricRun').value); if (!run) { alert('请先选择实验。'); return; }
  let name = $('experimentMetricName').value;
  if (name === 'custom') name = $('experimentMetricCustomName').value.trim();
  if (!name) { alert('请选择或填写指标名称。'); return; }
  const value = Number($('experimentMetricValue').value); if (!Number.isFinite(value)) { alert('请填写数值。'); return; }
  const preset = experimentMetricPreset(name);
  const metric = normalizeExperimentMetric({id:uid('metric'),name,value,unit:$('experimentMetricUnit').value.trim() || preset?.unit || '',direction:$('experimentMetricDirection').value || preset?.direction || 'neutral',createdAt:nowDateTime()});
  run.metrics = run.metrics || []; run.metrics.unshift(metric); run.updatedAt=nowDateTime(); selectedExperimentRunId=run.id;
  $('experimentMetricValue').value=''; $('experimentMetricCustomName').value=''; saveState(); renderAll();
}
function removeExperimentMetric(runId, metricId) {
  const run=experimentRunById(runId); if(!run)return; run.metrics=(run.metrics||[]).filter(item=>item.id!==metricId); run.updatedAt=nowDateTime(); saveState(); renderAll();
}
function addExperimentArtifact() {
  const run=experimentRunById($('experimentArtifactRun').value); if(!run){alert('请先选择实验。');return;}
  const artifact=normalizeExperimentArtifact({id:uid('artifact'),type:$('experimentArtifactType').value,label:$('experimentArtifactLabel').value.trim(),url:$('experimentArtifactUrl').value.trim(),note:$('experimentArtifactNote').value.trim(),createdAt:nowDateTime()});
  if(!artifact){alert('至少填写结果资料名称或路径 / URL。');return;}
  run.artifacts=run.artifacts||[];run.artifacts.unshift(artifact);run.updatedAt=nowDateTime();selectedExperimentRunId=run.id;
  $('experimentArtifactLabel').value='';$('experimentArtifactUrl').value='';$('experimentArtifactNote').value='';saveState();renderAll();
}
function removeExperimentArtifact(runId, artifactId) {
  const run=experimentRunById(runId);if(!run)return;run.artifacts=(run.artifacts||[]).filter(item=>item.id!==artifactId);run.updatedAt=nowDateTime();saveState();renderAll();
}
function filteredExperimentRuns() {
  const status=$('experimentFilterStatus')?.value||'', task=$('experimentFilterTask')?.value||'', q=($('experimentFilterQuery')?.value||'').trim().toLowerCase();
  return [...(state.experiments?.runs||[])].filter(run=>{
    if(status && run.status!==status)return false; if(task && run.taskType!==task)return false;
    if(q && !`${run.name} ${run.dataset} ${run.model} ${run.variant} ${(run.tags||[]).join(' ')} ${run.conclusion}`.toLowerCase().includes(q))return false;
    return true;
  }).sort((a,b)=>Number(b.starred)-Number(a.starred)||(b.date||'').localeCompare(a.date||'')||(b.updatedAt||'').localeCompare(a.updatedAt||''));
}
function renderExperimentSummary() {
  const runs=state.experiments?.runs||[], completed=runs.filter(r=>r.status==='completed').length, running=runs.filter(r=>r.status==='running').length;
  const datasets=new Set(runs.map(r=>r.dataset.trim()).filter(Boolean)).size, starred=runs.filter(r=>r.starred).length;
  const cards=[['实验总数',runs.length,'text-dopamine-purple'],['已完成',completed,'text-emerald-600'],['运行中',running,'text-dopamine-sky'],['指标记录',experimentMetricCount(),'text-dopamine-orange'],['重点结果',starred,'text-dopamine-pink'],['数据集',datasets,'text-dopamine-purple']];
  $('experimentSummary').innerHTML=cards.map(([label,value,color])=>`<div class="small-stat p-4"><div class="text-sm text-calm-mute">${label}</div><div class="text-2xl font-black mt-1 ${color}">${escapeHtml(String(value))}</div></div>`).join('');
}
function renderExperimentRuns() {
  const runs=filteredExperimentRuns(); $('experimentRunCount').textContent=`${runs.length} 条`;
  $('experimentRunList').innerHTML=runs.map(run=>{
    const task=experimentTaskMeta(run.taskType), status=experimentStatusMeta(run.status), links=experimentLinkLabel(run);
    return `<article class="experiment-run-card p-4 ${run.starred?'starred':''}">
      <div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="text-xs font-black text-dopamine-purple">${task.icon} ${escapeHtml(task.label)} · ${escapeHtml(run.date)}</div><h3 class="font-black text-lg mt-1">${escapeHtml(run.name)}</h3><div class="text-xs text-calm-mute mt-1">${escapeHtml([run.model,run.variant,run.dataset].filter(Boolean).join(' · ') || '尚未填写模型 / 数据集')}</div></div><div class="flex gap-1 flex-wrap justify-end"><span class="pill ${status.color}">${escapeHtml(status.label)}</span>${run.starred?'<span class="pill bg-yellow-100 text-yellow-700">⭐ 重点</span>':''}</div></div>
      ${links?`<div class="experiment-link-note mt-3">${escapeHtml(links)}</div>`:''}
      <div class="flex flex-wrap gap-2 mt-3">${(run.metrics||[]).slice(0,10).map(metric=>`<span class="experiment-metric-chip"><b>${escapeHtml(metric.name)}</b> ${escapeHtml(experimentMetricDisplay(metric))}<button data-metric-remove="${run.id}|${metric.id}" title="删除指标">×</button></span>`).join('') || '<span class="text-xs text-calm-mute">还没有指标，完成实验后补充结果。</span>'}</div>
      ${run.conclusion?`<div class="experiment-conclusion p-3 mt-3"><b>结论：</b>${escapeHtml(run.conclusion)}</div>`:''}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-calm-mute"><div>Seed <b class="text-calm-ink">${escapeHtml(run.seed||'—')}</b></div><div>LR <b class="text-calm-ink">${escapeHtml(run.learningRate||'—')}</b></div><div>Batch <b class="text-calm-ink">${escapeHtml(run.batchSize||'—')}</b></div><div>硬件 <b class="text-calm-ink">${escapeHtml(run.hardware||'—')}</b></div></div>
      ${(run.artifacts||[]).length?`<div class="flex flex-wrap gap-2 mt-3">${run.artifacts.slice(0,8).map(a=>{const meta=experimentArtifactTypeMeta(a.type);const isWeb=/^https?:\/\//i.test(a.url||'');const content=isWeb?`<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener" class="hover:underline">${meta.icon} ${escapeHtml(a.label)}</a>`:`<span title="${escapeHtml(a.url||'')}">${meta.icon} ${escapeHtml(a.label)}</span>`;return `<span class="experiment-artifact-chip">${content}<button data-artifact-remove="${run.id}|${a.id}" title="删除资料">×</button></span>`;}).join('')}</div>`:''}
      <div class="flex flex-wrap gap-2 mt-4"><button class="px-3 py-2 rounded-xl bg-yellow-50 text-yellow-700 text-xs font-bold" data-experiment-star="${run.id}">${run.starred?'取消重点':'⭐ 标记重点'}</button><button class="px-3 py-2 rounded-xl bg-white border border-calm-line text-xs font-bold" data-experiment-edit="${run.id}">修改</button><button class="px-3 py-2 rounded-xl bg-sky-50 text-dopamine-sky text-xs font-bold" data-experiment-select="${run.id}">补充指标 / 资料</button><button class="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold" data-experiment-delete="${run.id}">删除</button></div>
    </article>`;
  }).join('') || '<div class="text-sm text-calm-mute p-5">还没有符合筛选条件的实验结果。</div>';
  $('experimentRunList').querySelectorAll('[data-experiment-star]').forEach(btn=>btn.onclick=()=>toggleExperimentStar(btn.dataset.experimentStar));
  $('experimentRunList').querySelectorAll('[data-experiment-edit]').forEach(btn=>btn.onclick=()=>openExperimentRunEditor(btn.dataset.experimentEdit));
  $('experimentRunList').querySelectorAll('[data-experiment-delete]').forEach(btn=>btn.onclick=()=>deleteExperimentRun(btn.dataset.experimentDelete));
  $('experimentRunList').querySelectorAll('[data-experiment-select]').forEach(btn=>btn.onclick=()=>{selectedExperimentRunId=btn.dataset.experimentSelect;fillExperimentRunSelectors();$('experimentMetricRun').value=selectedExperimentRunId;$('experimentArtifactRun').value=selectedExperimentRunId;document.getElementById('experimentResultManager')?.scrollIntoView({behavior:'smooth',block:'start'});});
  $('experimentRunList').querySelectorAll('[data-metric-remove]').forEach(btn=>btn.onclick=()=>{const [runId,metricId]=btn.dataset.metricRemove.split('|');removeExperimentMetric(runId,metricId);});
  $('experimentRunList').querySelectorAll('[data-artifact-remove]').forEach(btn=>btn.onclick=()=>{const [runId,artifactId]=btn.dataset.artifactRemove.split('|');removeExperimentArtifact(runId,artifactId);});
}
function renderExperimentComparison() {
  const runs=filteredExperimentRuns().filter(run=>(run.metrics||[]).length).slice(0,20);
  if(!runs.length){$('experimentComparison').innerHTML='<div class="text-sm text-calm-mute">补充至少一条实验指标后，这里会自动生成对比表。</div>';return;}
  const counts={}; runs.forEach(run=>(run.metrics||[]).forEach(m=>{counts[m.name]=(counts[m.name]||0)+1;}));
  const metricNames=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([name])=>name);
  const headers=['实验','模型 / 变体','数据集',...metricNames];
  $('experimentComparison').innerHTML=`<div class="overflow-auto scroll-thin"><table class="experiment-compare-table min-w-[900px]"><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${runs.map(run=>`<tr><td><b>${run.starred?'⭐ ':''}${escapeHtml(run.name)}</b><div class="text-xs text-calm-mute">${escapeHtml(run.date)}</div></td><td>${escapeHtml([run.model,run.variant].filter(Boolean).join(' / ')||'—')}</td><td>${escapeHtml(run.dataset||'—')}</td>${metricNames.map(name=>{const m=(run.metrics||[]).find(item=>item.name===name);return `<td class="font-black">${m?escapeHtml(experimentMetricDisplay(m)):'—'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderExperimentCharts() {
  if(currentSection!=='experiment-section')return;
  const runs=state.experiments?.runs||[];
  makeOrUpdateChart('experimentStatusChart','experimentStatus',{type:'doughnut',data:{labels:EXPERIMENT_STATUSES.map(i=>i.label),datasets:[{data:EXPERIMENT_STATUSES.map(i=>runs.filter(r=>r.status===i.value).length),backgroundColor:['#CBD5E1','#4D9DE0','#43AA8B','#FB7185','#9CA3AF']}]},options:{responsive:true,maintainAspectRatio:false}});
  makeOrUpdateChart('experimentTaskChart','experimentTask',{type:'bar',data:{labels:EXPERIMENT_TASK_TYPES.map(i=>i.label),datasets:[{label:'实验数',data:EXPERIMENT_TASK_TYPES.map(i=>runs.filter(r=>r.taskType===i.value).length),backgroundColor:'#9B5DE5',borderRadius:10}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',scales:{x:{beginAtZero:true,ticks:{precision:0}}}}});
}
function renderExperiments() { initializeExperimentControls(); renderExperimentSummary(); renderExperimentRuns(); renderExperimentComparison(); renderExperimentCharts(); }
function exportExperimentsCsv() {
  const rows=[['date','name','task','status','dataset','model','variant','metric','value','unit','conclusion']];
  filteredExperimentRuns().forEach(run=>{const metrics=(run.metrics||[]).length?run.metrics:[null];metrics.forEach(m=>rows.push([run.date,run.name,experimentTaskMeta(run.taskType).label,experimentStatusMeta(run.status).label,run.dataset,run.model,run.variant,m?.name||'',m?.value??'',m?.unit||'',run.conclusion]));});
  const csv='\uFEFF'+rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`cv_experiments_${todayStr()}.csv`;a.click();URL.revokeObjectURL(url);
}
function syncExperimentMetricPreset() {
  const name=$('experimentMetricName').value;
  const custom=$('experimentMetricCustomName'); custom.classList.toggle('hidden',name!=='custom');
  const preset=experimentMetricPreset(name); if(preset){$('experimentMetricUnit').value=preset.unit||'';$('experimentMetricDirection').value=preset.direction||'neutral';}
}
function bindExperimentEvents() {
  initializeExperimentControls();
  $('btnAddExperiment').onclick=addExperimentRun; $('btnAddExperimentMetric').onclick=addExperimentMetric; $('btnAddExperimentArtifact').onclick=addExperimentArtifact; $('btnExportExperimentsCsv').onclick=exportExperimentsCsv;
  $('experimentMetricName').onchange=syncExperimentMetricPreset;
  $('experimentFilterStatus').onchange=renderExperiments; $('experimentFilterTask').onchange=renderExperiments; $('experimentFilterQuery').oninput=()=>{renderExperimentRuns();renderExperimentComparison();};
}
