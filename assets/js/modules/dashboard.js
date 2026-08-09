/* Cross-module dashboard charts and range summaries. */
'use strict';
function renderDashboard(){
  const days=Number($('dashboardRange').value||7), dates=recentDates(days), start=dates[0], end=dates.at(-1), rangeLabel=days===1?'今日':days===7?'本周':days===30?'本月':`近 ${days} 天`;
  const focusTotal=dates.reduce((s,d)=>s+focusMinutesOn(d),0), workTotal=dates.reduce((s,d)=>s+totalAttendanceMinutes(d),0);
  const ideas=researchIdeasCreatedInRange(start,end), ideaRefs=researchIdeaReferencesInRange(start,end);
  const paperLogs=paperLogsInRange(start,end), paperMinutes=paperLogs.reduce((s,i)=>s+Number(i.log.minutes||0),0), paperWords=paperLogs.reduce((s,i)=>s+Number(i.log.words||0),0);
  const paperSectionUpdates=(state.papers?.items||[]).flatMap(p=>p.sections||[]).filter(item=>item.updatedAt&&isDateInRange(dateFromDateTime(item.updatedAt),start,end)).length;
  const paperMilestones=(state.papers?.items||[]).flatMap(p=>p.milestones||[]).filter(item=>item.doneAt&&isDateInRange(dateFromDateTime(item.doneAt),start,end)).length;
  const submissionCreated=state.submissions.filter(i=>i.createdAt&&isDateInRange(dateFromDateTime(i.createdAt),start,end)).length;
  const submissionUpdated=state.submissions.filter(i=>i.updatedAt&&isDateInRange(dateFromDateTime(i.updatedAt),start,end)&&dateFromDateTime(i.createdAt)!==dateFromDateTime(i.updatedAt)).length;
  const upwardDays=dates.reduce((s,d)=>s+upwardCountOn(d),0), reviewDays=dates.reduce((s,d)=>s+reviewCountOn(d),0);
  const money=(state.accounting?.transactions||[]).filter(i=>isDateInRange(i.date,start,end)), expenses=money.filter(i=>i.type==='expense').reduce((s,i)=>s+i.amount,0);
  const savingEntries=savingsEntriesInRange(start,end), savingNet=savingEntries.reduce((s,i)=>s+(i.type==='withdrawal'?-i.amount:i.amount),0);
  const travelPlans=travelPlansCreatedInRange(start,end), travelNotes=travelNotesInRange(start,end);
  const stats=[
    [`${rangeLabel}专注`,formatMinutes(focusTotal),'text-dopamine-orange'],[`${rangeLabel}打卡`,formatMinutes(workTotal),'text-dopamine-sky'],[`${rangeLabel}科研思路`,ideas.length,'text-dopamine-purple'],[`${rangeLabel}论文投入`,formatMinutes(paperMinutes),'text-dopamine-purple'],[`${rangeLabel}投稿动作`,submissionCreated+submissionUpdated,'text-dopamine-sky'],[`${rangeLabel}向上管理`,upwardDays,'text-dopamine-purple'],[`${rangeLabel}每日复盘`,reviewDays,'text-dopamine-pink'],[`${rangeLabel}旅行碎片`,travelNotes.length,'text-dopamine-sky'],[`${rangeLabel}支出`,formatAccountingMoney(expenses,{compact:true}),'text-rose-600'],[`${rangeLabel}净攒入`,formatSavingsMoney(savingNet,{compact:true}),savingNet>=0?'text-emerald-600':'text-rose-600']
  ];
  $('dashboardStats').innerHTML=stats.map(([label,value,color])=>`<div class="small-stat p-4"><div class="text-sm text-calm-mute">${label}</div><div class="text-2xl font-black mt-1 ${color}">${escapeHtml(String(value))}</div></div>`).join('');
  const highlights=[
    {title:'执行节奏',body:`累计专注 ${formatMinutes(focusTotal)}，工作记录 ${formatMinutes(workTotal)}。`,note:`完成任务 ${state.tasks.filter(i=>i.doneAt&&isDateInRange(dateFromDateTime(i.doneAt),start,end)).length} 项`},
    {title:'科研与论文',body:`新增科研思路 ${ideas.length} 个、参考资料 ${ideaRefs.length} 条；论文日志 ${paperLogs.length} 条。`,note:`论文投入 ${formatMinutes(paperMinutes)} · ${Math.round(paperWords)} 字 · 内容更新 ${paperSectionUpdates} 次 · 里程碑 ${paperMilestones} 个`},
    {title:'财务与未来',body:`支出 ${formatAccountingMoney(expenses)}，净攒入 ${formatSavingsMoney(savingNet)}。`,note:`旅行新增计划 ${travelPlans.length} 个 · 碎片 ${travelNotes.length} 条`},
    {title:'沟通与复盘',body:`向上管理 ${upwardDays} 天、每日复盘 ${reviewDays} 天。`,note:`进行中投稿 ${runningSubmissionCount()} 个 · 进行中旅行 ${activeTravelPlans().length} 个`}
  ];
  $('dashboardHighlights').innerHTML=highlights.map(i=>`<div class="rounded-2xl bg-white border border-calm-line px-4 py-4"><div class="font-black">${i.title}</div><div class="text-sm leading-6 mt-2">${escapeHtml(i.body)}</div><div class="text-xs text-calm-mute mt-2">${escapeHtml(i.note)}</div></div>`).join('');
  const coverage=[
    ['总览首页',dates.filter(d=>focusMinutesOn(d)>0||totalAttendanceMinutes(d)>0).length,`专注 ${formatMinutes(focusTotal)} · 工作 ${formatMinutes(workTotal)}`],
    ['科研思路',new Set([...ideas.map(i=>dateFromDateTime(i.createdAt)),...ideaRefs.map(i=>dateFromDateTime(i.reference.createdAt))]).size,`新增 ${ideas.length} · 参考 ${ideaRefs.length}`],
    ['论文进度',new Set(paperLogs.map(i=>i.log.date)).size,`论文 ${state.papers?.items?.length||0} 篇 · 日志 ${paperLogs.length}`],
    ['投稿管理',Math.min(days,submissionCreated+submissionUpdated),`新增 ${submissionCreated} · 更新 ${submissionUpdated}`],
    ['旅行规划',new Set([...travelPlans.map(i=>dateFromDateTime(i.createdAt)),...travelNotes.map(i=>dateFromDateTime(i.createdAt))]).size,`计划 ${travelPlans.length} · 碎片 ${travelNotes.length}`],
    ['向上管理',upwardDays,`记录 ${upwardDays} 天 · 待跟进 ${upwardPendingItems(end).length}`],
    ['每日复盘',reviewDays,`记录 ${reviewDays} 天`]
  ];
  $('dashboardCoverage').innerHTML=coverage.map(([label,count,detail])=>{const percent=Math.round(clamp(count/Math.max(1,days)*100,0,100));return `<div class="rounded-2xl bg-white border border-calm-line px-3 py-3"><div class="flex items-center justify-between gap-3"><div><div class="font-bold">${label}</div><div class="text-xs text-calm-mute mt-1">${escapeHtml(detail)}</div></div><span class="pill bg-dopamine-sky/10 text-dopamine-sky">${percent}%</span></div><div class="mt-3 h-2 rounded-full bg-calm-bg overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-dopamine-orange via-dopamine-sky to-dopamine-mint" style="width:${percent}%"></div></div></div>`;}).join('');
  makeOrUpdateChart('focusChart','focus',{type:'line',data:{labels:dates.map(d=>d.slice(5)),datasets:[{label:'专注分钟',data:dates.map(focusMinutesOn),borderColor:'#FF8C42',backgroundColor:'rgba(255,140,66,.18)',fill:true,tension:.35}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});
  makeOrUpdateChart('attendanceChart','attendance',{type:'bar',data:{labels:dates.map(d=>d.slice(5)),datasets:[{label:'工作分钟',data:dates.map(totalAttendanceMinutes),backgroundColor:'#4D9DE0',borderRadius:12}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});
  makeOrUpdateChart('researchIdeasChart','researchIdeaDashboard',{type:'bar',data:{labels:dates.map(d=>d.slice(5)),datasets:[{label:'新增思路',data:dates.map(d=>researchIdeasCreatedInRange(d,d).length),backgroundColor:'#9B5DE5',borderRadius:10},{label:'新增参考',data:dates.map(d=>researchIdeaReferencesInRange(d,d).length),backgroundColor:'#F49AB0',borderRadius:10}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
  makeOrUpdateChart('paperChart','papers',{type:'bar',data:{labels:dates.map(d=>d.slice(5)),datasets:[{type:'bar',label:'论文投入分钟',data:dates.map(d=>paperLogsInRange(d,d).reduce((s,i)=>s+Number(i.log.minutes||0),0)),backgroundColor:'#9B5DE5',borderRadius:12,yAxisID:'y'},{type:'line',label:'写作字数',data:dates.map(d=>paperLogsInRange(d,d).reduce((s,i)=>s+Number(i.log.words||0),0)),borderColor:'#FF5A5F',tension:.3,yAxisID:'y1'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true},y1:{beginAtZero:true,position:'right',grid:{drawOnChartArea:false}}}}});
  makeOrUpdateChart('supportChart','support',{type:'bar',data:{labels:dates.map(d=>d.slice(5)),datasets:[{label:'向上管理',data:dates.map(upwardCountOn),backgroundColor:'#9B5DE5',borderRadius:10},{label:'每日复盘',data:dates.map(reviewCountOn),backgroundColor:'#FF5A5F',borderRadius:10}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:1,ticks:{stepSize:1}}}}});
  const stageCounts=SUBMISSION_COLUMNS.map(stage=>state.submissions.filter(i=>i.stage===stage).length); makeOrUpdateChart('submissionChart','submission',{type:'doughnut',data:{labels:SUBMISSION_COLUMNS,datasets:[{data:stageCounts,backgroundColor:SUBMISSION_COLUMNS.map(s=>STAGE_COLORS[s]||'#d1d5db')}]},options:{responsive:true,maintainAspectRatio:false}});
}
function makeOrUpdateChart(canvasId,key,config){const canvas=$(canvasId);if(!canvas||typeof Chart==='undefined')return;if(charts[key])charts[key].destroy();charts[key]=new Chart(canvas,config);}
