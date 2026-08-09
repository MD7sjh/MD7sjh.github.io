/* Travel planning: structured trips plus lightweight idea fragments. */
'use strict';

function travelCurrencyMeta(value='CNY'){return ACCOUNTING_CURRENCIES.find(item=>item.value===value)||ACCOUNTING_CURRENCIES[0];}
function formatTravelMoney(amount,currency='CNY'){const meta=travelCurrencyMeta(currency);return `${meta.symbol}${Number(amount||0).toLocaleString(undefined,{maximumFractionDigits:2})}`;}
function renderTravelSummary(){
  const plans=state.travel?.plans||[], notes=state.travel?.notes||[]; const upcoming=plans.filter(item=>item.startDate&&item.startDate>=todayStr()&&item.status!=='completed').length;
  const cards=[{label:'旅行计划',value:plans.length,color:'text-dopamine-sky'},{label:'正在规划',value:plans.filter(item=>['idea','planning','booked'].includes(item.status)).length,color:'text-dopamine-purple'},{label:'未来行程',value:upcoming,color:'text-dopamine-orange'},{label:'零碎记录',value:notes.length,color:'text-dopamine-pink'}];
  $('travelSummary').innerHTML=cards.map(item=>`<div class="small-stat p-4"><div class="text-sm text-calm-mute">${item.label}</div><div class="text-2xl font-black mt-1 ${item.color}">${item.value}</div></div>`).join('');
}
function addTravelPlan(){
  const title=$('travelPlanTitle').value.trim(); if(!title){alert('请填写旅行计划名称。');return;}
  const plan=normalizeTravelPlan({id:uid('trip'),title,destination:$('travelPlanDestination').value.trim(),status:$('travelPlanStatus').value,startDate:$('travelPlanStart').value,endDate:$('travelPlanEnd').value,budget:$('travelPlanBudget').value,currency:$('travelPlanCurrency').value,companions:$('travelPlanCompanions').value.trim(),tags:$('travelPlanTags').value,note:$('travelPlanNote').value.trim(),createdAt:nowDateTime(),updatedAt:nowDateTime()});
  state.travel.plans.unshift(plan); ['travelPlanTitle','travelPlanDestination','travelPlanStart','travelPlanEnd','travelPlanBudget','travelPlanCompanions','travelPlanTags','travelPlanNote'].forEach(id=>$(id).value=''); saveState();renderAll();
}
function addTravelNote(){
  const title=$('travelNoteTitle').value.trim(), content=$('travelNoteContent').value.trim(), url=$('travelNoteUrl').value.trim(); if(!title&&!content&&!url){alert('至少写一点旅行想法、内容或链接。');return;}
  state.travel.notes.unshift(normalizeTravelNote({id:uid('tripnote'),planId:$('travelNotePlan').value,type:$('travelNoteType').value,title,content,url,createdAt:nowDateTime(),updatedAt:nowDateTime()}));
  $('travelNoteTitle').value='';$('travelNoteContent').value='';$('travelNoteUrl').value='';saveState();renderAll();
}
function renderTravelPlans(){
  const query=$('travelFilterQuery').value.trim().toLowerCase(), status=$('travelFilterStatus').value; let plans=[...(state.travel?.plans||[])];
  plans=plans.filter(item=>(!status||item.status===status)&&(!query||`${item.title} ${item.destination} ${item.note} ${(item.tags||[]).join(' ')}`.toLowerCase().includes(query)));
  $('travelPlanList').innerHTML=plans.map(item=>{const meta=travelStatusMeta(item.status);return `<div class="travel-plan-card"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-black text-lg">✈️ ${escapeHtml(item.title)}</div><div class="text-sm text-calm-mute mt-1">${escapeHtml(item.destination||'目的地待定')}${item.startDate?` · ${escapeHtml(item.startDate)}${item.endDate?` → ${escapeHtml(item.endDate)}`:''}`:''}</div></div><span class="pill ${meta.color}">${escapeHtml(meta.label)}</span></div><div class="grid grid-cols-2 gap-2 mt-3 text-sm"><div class="rounded-xl bg-white border border-calm-line px-3 py-2"><span class="text-calm-mute">预算</span><div class="font-black">${item.budget?formatTravelMoney(item.budget,item.currency):'待定'}</div></div><div class="rounded-xl bg-white border border-calm-line px-3 py-2"><span class="text-calm-mute">同行</span><div class="font-black truncate">${escapeHtml(item.companions||'待定')}</div></div></div>${item.note?`<div class="text-sm leading-6 mt-3">${escapeHtml(item.note)}</div>`:''}${item.tags?.length?`<div class="flex flex-wrap gap-1 mt-3">${item.tags.map(tag=>`<span class="pill bg-pink-50 text-pink-700">#${escapeHtml(tag)}</span>`).join('')}</div>`:''}<div class="flex gap-2 mt-3"><button class="text-sm font-bold text-dopamine-orange" data-travel-plan-edit="${item.id}">修改</button><button class="text-sm font-bold text-dopamine-sky" data-travel-plan-notes="${item.id}">查看碎片</button></div></div>`;}).join('')||'<div class="text-sm text-calm-mute">暂无符合条件的旅行计划。</div>';
  $('travelPlanList').querySelectorAll('[data-travel-plan-edit]').forEach(btn=>btn.onclick=()=>openTravelPlanEditor(btn.dataset.travelPlanEdit));
  $('travelPlanList').querySelectorAll('[data-travel-plan-notes]').forEach(btn=>btn.onclick=()=>{$('travelFilterPlan').value=btn.dataset.travelPlanNotes;renderTravelNotes();});
}
function openTravelPlanEditor(id){
  const item=travelPlanById(id);if(!item)return;
  openEditDialog({title:'修改旅行计划',desc:item.destination||'',fields:[{name:'title',label:'计划名称',value:item.title},{name:'destination',label:'目的地',value:item.destination},{name:'status',label:'状态',type:'select',value:item.status,options:TRAVEL_PLAN_STATUSES},{name:'startDate',label:'开始日期',type:'date',value:item.startDate},{name:'endDate',label:'结束日期',type:'date',value:item.endDate},{name:'budget',label:'预算',type:'number',value:String(item.budget||'')},{name:'currency',label:'币种',type:'select',value:item.currency,options:ACCOUNTING_CURRENCIES},{name:'companions',label:'同行对象',value:item.companions},{name:'tags',label:'标签（逗号分隔）',value:(item.tags||[]).join(', ')},{name:'note',label:'规划说明',type:'textarea',value:item.note}],onSave:vals=>{Object.assign(item,normalizeTravelPlan({...item,...vals,tags:vals.tags,updatedAt:nowDateTime()}));saveState();renderAll();},onDelete:()=>{state.travel.plans=state.travel.plans.filter(v=>v.id!==id);state.travel.notes=state.travel.notes.map(note=>note.planId===id?{...note,planId:''}:note);saveState();renderAll();}});
}
function renderTravelNotes(){
  const planId=$('travelFilterPlan').value, type=$('travelFilterType').value, query=$('travelNoteQuery').value.trim().toLowerCase();
  let notes=[...(state.travel?.notes||[])]; notes=notes.filter(item=>(!planId||item.planId===planId)&&(!type||item.type===type)&&(!query||`${item.title} ${item.content} ${item.url}`.toLowerCase().includes(query)));
  $('travelNoteList').innerHTML=notes.map(item=>{const meta=travelNoteTypeMeta(item.type),plan=travelPlanById(item.planId);return `<div class="travel-note-card"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-black">${meta.icon} ${escapeHtml(item.title||meta.label)}</div><div class="text-xs text-calm-mute mt-1">${escapeHtml(meta.label)}${plan?` · ${escapeHtml(plan.title)}`:' · 未归属计划'}</div></div><button class="text-sm font-bold text-dopamine-orange" data-travel-note-edit="${item.id}">修改</button></div>${item.content?`<div class="text-sm leading-6 mt-3 whitespace-pre-wrap">${escapeHtml(item.content)}</div>`:''}${item.url?`<a class="inline-flex mt-3 text-sm font-bold text-dopamine-sky break-all" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">打开链接 ↗</a>`:''}</div>`;}).join('')||'<div class="text-sm text-calm-mute">还没有旅行碎片。看到地点、酒店、餐馆、攻略时随手记下来即可。</div>';
  $('travelNoteList').querySelectorAll('[data-travel-note-edit]').forEach(btn=>btn.onclick=()=>openTravelNoteEditor(btn.dataset.travelNoteEdit));
}
function openTravelNoteEditor(id){
  const item=(state.travel?.notes||[]).find(v=>v.id===id);if(!item)return;
  openEditDialog({title:'修改旅行碎片',desc:travelPlanById(item.planId)?.title||'未归属计划',fields:[{name:'planId',label:'关联计划',type:'select',value:item.planId,options:[{value:'',label:'未归属计划'},...(state.travel?.plans||[]).map(v=>({value:v.id,label:v.title}))]},{name:'type',label:'类型',type:'select',value:item.type,options:TRAVEL_NOTE_TYPES},{name:'title',label:'标题',value:item.title},{name:'content',label:'内容',type:'textarea',value:item.content},{name:'url',label:'链接',value:item.url}],onSave:vals=>{Object.assign(item,normalizeTravelNote({...item,...vals,updatedAt:nowDateTime()}));saveState();renderAll();},onDelete:()=>{state.travel.notes=state.travel.notes.filter(v=>v.id!==id);saveState();renderAll();}});
}
function renderTravelFilters(){
  const plans=state.travel?.plans||[]; const currentNote=$('travelNotePlan').value,currentFilter=$('travelFilterPlan').value;
  const opts=plans.map(item=>`<option value="${item.id}">${escapeHtml(item.title)}</option>`).join('');
  $('travelNotePlan').innerHTML='<option value="">不关联具体计划</option>'+opts; $('travelFilterPlan').innerHTML='<option value="">全部计划</option>'+opts;
  if(plans.some(v=>v.id===currentNote))$('travelNotePlan').value=currentNote;if(plans.some(v=>v.id===currentFilter))$('travelFilterPlan').value=currentFilter;
}
function renderTravel(){renderTravelSummary();renderTravelFilters();renderTravelPlans();renderTravelNotes();}
function bindTravelEvents(){
  $('btnAddTravelPlan').onclick=addTravelPlan;$('btnAddTravelNote').onclick=addTravelNote;
  ['travelFilterStatus','travelFilterPlan','travelFilterType'].forEach(id=>$(id).onchange=()=>{id==='travelFilterStatus'?renderTravelPlans():renderTravelNotes();});
  $('travelFilterQuery').oninput=renderTravelPlans;$('travelNoteQuery').oninput=renderTravelNotes;
}
