/* Cross-module analytics and charts. */
'use strict';

function renderDashboard() {
  const days = Number($('dashboardRange').value || 7);
  const dates = recentDates(days);
  const rangeLabel = days === 1 ? '今日' : days === 7 ? '本周' : days === 30 ? '本月' : `近 ${days} 天`;
  const start = dates[0];
  const end = dates[dates.length - 1];
  const focusTotal = dates.reduce((sum, d) => sum + focusMinutesOn(d), 0);
  const workTotal = dates.reduce((sum, d) => sum + totalAttendanceMinutes(d), 0);
  const avgHabit = Math.round(dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / Math.max(1, days));
  const exerciseDays = dates.filter(d => exerciseDoneOn(d)).length;
  const careDays = dates.reduce((sum, d) => sum + careCountOn(d), 0);
  const mentorDays = dates.reduce((sum, d) => sum + mentorCountOn(d), 0);
  const reviewDays = dates.reduce((sum, d) => sum + reviewCountOn(d), 0);
  const focusSessions = state.focus.sessions.filter(item => isDateInRange(item.date, start, end));
  const workLogs = Object.entries(state.attendance)
    .filter(([date]) => isDateInRange(date, start, end))
    .flatMap(([, day]) => day.logs || []);
  const leaveCount = Object.entries(state.attendance)
    .filter(([date]) => isDateInRange(date, start, end))
    .reduce((sum, [, day]) => sum + (day.leaves?.length || 0), 0);
  const scheduleCount = Object.entries(state.timeBlocks || {})
    .filter(([date]) => isDateInRange(date, start, end))
    .reduce((sum, [, items]) => sum + (Array.isArray(items) ? items.length : 0), 0);
  const scheduleMinutes = Object.entries(state.timeBlocks || {})
    .filter(([date]) => isDateInRange(date, start, end))
    .reduce((sum, [, items]) => sum + (Array.isArray(items) ? items.reduce((inner, item) => inner + minutesBetween(item.start, item.end), 0) : 0), 0);
  const tasksDone = state.tasks.filter(item => item.doneAt && isDateInRange(dateFromDateTime(item.doneAt), start, end)).length;
  const tasksStarted = state.tasks.filter(item => item.startedAt && isDateInRange(dateFromDateTime(item.startedAt), start, end)).length;
  const thesisLogs = (state.thesis?.logs || []).filter(item => isDateInRange(item.date, start, end));
  const thesisMinutes = thesisLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const thesisWords = thesisLogs.reduce((sum, item) => sum + (Number(item.words) || 0), 0);
  const chapterUpdates = (state.thesis?.chapters || []).filter(item => item.updatedAt && isDateInRange(dateFromDateTime(item.updatedAt), start, end)).length;
  const milestoneDone = (state.thesis?.milestones || []).filter(item => item.doneAt && isDateInRange(dateFromDateTime(item.doneAt), start, end)).length;
  const submissionCreated = state.submissions.filter(item => item.createdAt && isDateInRange(dateFromDateTime(item.createdAt), start, end)).length;
  const submissionUpdated = state.submissions.filter(item => item.updatedAt && isDateInRange(dateFromDateTime(item.updatedAt), start, end) && dateFromDateTime(item.createdAt) !== dateFromDateTime(item.updatedAt)).length;
  const submissionDue = state.submissions.filter(item => isDateInRange(item.deadline, start, end)).length;
  const submissionMoves = submissionCreated + submissionUpdated;
  const foodLogs = state.foods.filter(item => isDateInRange(item.date, start, end)).length;
  const accountingItems = (state.accounting?.transactions || []).filter(item => isDateInRange(item.date, start, end));
  const accountingIncome = accountingItems.filter(item => item.type === 'income').reduce((sum,item)=>sum+item.amount,0);
  const accountingExpense = accountingItems.filter(item => item.type === 'expense').reduce((sum,item)=>sum+item.amount,0);
  const accountingDays = new Set(accountingItems.map(item => item.date)).size;
  const avgCareStress = careDays ? (dates.filter(d => careCountOn(d)).reduce((sum, d) => sum + careEntryOn(d).stress, 0) / careDays).toFixed(1) : '0.0';
  const avgMentorPressure = mentorDays ? (dates.filter(d => mentorCountOn(d)).reduce((sum, d) => sum + mentorEntryOn(d).pressure, 0) / mentorDays).toFixed(1) : '0.0';
  const reviewTemplateTotal = dates.reduce((sum, d) => sum + reviewTemplateCount(dailyReviewEntryOn(d)), 0);
  const reviewPriorityTotal = dates.reduce((sum, d) => sum + reviewPriorityCount(dailyReviewEntryOn(d)), 0);

  const statCards = [
    { label:`${rangeLabel}专注`, value: formatMinutes(focusTotal), color:'text-dopamine-orange' },
    { label:`${rangeLabel}时间块`, value: `${scheduleCount} 个 / ${formatMinutes(scheduleMinutes)}`, color:'text-dopamine-sky' },
    { label:`${rangeLabel}打卡`, value: formatMinutes(workTotal), color:'text-dopamine-sky' },
    { label:`${rangeLabel}论文投入`, value: formatMinutes(thesisMinutes), color:'text-dopamine-purple' },
    { label:`${rangeLabel}论文字数`, value: Math.round(thesisWords), color:'text-dopamine-pink' },
    { label:`${rangeLabel}投稿动作`, value: submissionMoves, color:'text-dopamine-sky' },
    { label:`${rangeLabel}收入`, value: formatAccountingMoney(accountingIncome, { compact:true }), color:'text-emerald-600' },
    { label:`${rangeLabel}支出`, value: formatAccountingMoney(accountingExpense, { compact:true }), color:'text-rose-600' },
    { label:`${rangeLabel}习惯均值`, value: `${avgHabit}%`, color:'text-dopamine-mint' },
    { label:`${rangeLabel}心灵关怀`, value: careDays, color:'text-dopamine-yellow' },
    { label:`${rangeLabel}导师沟通`, value: mentorDays, color:'text-dopamine-purple' },
    { label:`${rangeLabel}每日复盘`, value: reviewDays, color:'text-dopamine-pink' },
    { label:'进行中投稿', value: runningSubmissionCount(), color:'text-dopamine-orange' }
  ];
  $('dashboardStats').innerHTML = statCards.map(item => `
    <div class="small-stat p-4">
      <div class="text-sm text-calm-mute">${item.label}</div>
      <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
    </div>
  `).join('');

  const highlightCards = [
    {
      title: '节奏推进',
      body: `${rangeLabel}累计 ${workLogs.length} 段工作、${focusSessions.length} 次专注，完成任务 ${tasksDone} 项。`,
      note: `请假 ${leaveCount} 条 · 时间块 ${scheduleCount} 个 / ${formatMinutes(scheduleMinutes)}`
    },
    {
      title: '论文与投稿',
      body: `论文日志 ${thesisLogs.length} 条，共 ${formatMinutes(thesisMinutes)}${thesisWords ? `，${Math.round(thesisWords)} 字` : ''}。`,
      note: `章节更新 ${chapterUpdates} 次 · 里程碑完成 ${milestoneDone} 个 · 投稿动作 ${submissionMoves} 次`
    },
    {
      title: '健康恢复',
      body: `习惯平均完成 ${avgHabit}% ，运动 ${exerciseDays} 天，饮食记录 ${foodLogs} 条。`,
      note: `更适合看“是否有恢复动作”，而不只是有没有硬撑。`
    },
    {
      title: '生活与财务',
      body: `${rangeLabel}记录收支 ${accountingItems.length} 笔，收入 ${formatAccountingMoney(accountingIncome)}，支出 ${formatAccountingMoney(accountingExpense)}。`,
      note: `区间结余 ${formatAccountingMoney(accountingIncome - accountingExpense)} · 有记录 ${accountingDays} 天`
    },
    {
      title: '心理与沟通',
      body: `心灵关怀 ${careDays} 天、导师沟通 ${mentorDays} 天、每日复盘 ${reviewDays} 天。`,
      note: `平均关怀压力 ${avgCareStress}/5 · 导师沟通压力 ${avgMentorPressure}/5 · 学术复盘项 ${reviewTemplateTotal} 条`
    }
  ];
  $('dashboardHighlights').innerHTML = highlightCards.map(item => `
    <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
      <div class="font-black">${escapeHtml(item.title)}</div>
      <div class="text-sm leading-6 mt-2">${escapeHtml(item.body)}</div>
      <div class="text-xs text-calm-mute mt-2">${escapeHtml(item.note)}</div>
    </div>
  `).join('');

  const coverageRows = [
    {
      label: '总览首页',
      ratio: dates.filter(d => totalAttendanceMinutes(d) > 0 || focusMinutesOn(d) > 0 || (state.timeBlocks?.[d]?.length || 0) > 0 || state.tasks.some(item => [item.createdAt, item.startedAt, item.doneAt].some(ts => dateFromDateTime(ts) === d))).length / Math.max(1, days),
      detail: `工作 ${workLogs.length} 段 · 专注 ${focusSessions.length} 次 · 完成任务 ${tasksDone}`
    },
    {
      label: '博士毕业论文进度',
      ratio: dates.filter(d => thesisLogs.some(item => item.date === d) || (state.thesis?.chapters || []).some(item => dateFromDateTime(item.updatedAt) === d) || (state.thesis?.milestones || []).some(item => dateFromDateTime(item.doneAt) === d)).length / Math.max(1, days),
      detail: `日志 ${thesisLogs.length} 条 · 章节更新 ${chapterUpdates} 次 · 里程碑 ${milestoneDone} 个`
    },
    {
      label: '投稿管理',
      ratio: Math.min(1, (submissionMoves + submissionDue) / Math.max(1, days)),
      detail: `新增 ${submissionCreated} · 更新 ${submissionUpdated} · 截止 ${submissionDue}`
    },
    {
      label: '记账管理',
      ratio: accountingDays / Math.max(1, days),
      detail: `记录 ${accountingItems.length} 笔 · 收入 ${formatAccountingMoney(accountingIncome, { compact:true })} · 支出 ${formatAccountingMoney(accountingExpense, { compact:true })}`
    },
    {
      label: '健康管理',
      ratio: dates.filter(d => todayHabitCompletion(d) > 0 || state.foods.some(item => item.date === d)).length / Math.max(1, days),
      detail: `习惯均值 ${avgHabit}% · 运动 ${exerciseDays} 天 · 饮食 ${foodLogs} 条`
    },
    {
      label: '心灵关怀',
      ratio: careDays / Math.max(1, days),
      detail: `记录 ${careDays} 天 · 平均压力 ${avgCareStress}/5`
    },
    {
      label: '向上管理导师',
      ratio: mentorDays / Math.max(1, days),
      detail: `记录 ${mentorDays} 天 · 等反馈 ${dates.filter(d => mentorEntryOn(d).status === 'waiting').length} 天`
    },
    {
      label: '每日复盘',
      ratio: reviewDays / Math.max(1, days),
      detail: `记录 ${reviewDays} 天 · 学术复盘项 ${reviewTemplateTotal} 条 · 明日优先 ${reviewPriorityTotal} 条`
    }
  ];
  $('dashboardCoverage').innerHTML = coverageRows.map(item => {
    const percent = Math.round(clamp(item.ratio * 100, 0, 100));
    return `
      <div class="rounded-2xl bg-white border border-calm-line px-3 py-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="font-bold">${escapeHtml(item.label)}</div>
            <div class="text-xs text-calm-mute mt-1">${escapeHtml(item.detail)}</div>
          </div>
          <span class="pill bg-dopamine-sky/10 text-dopamine-sky shrink-0">${percent}%</span>
        </div>
        <div class="mt-3 h-2 rounded-full bg-calm-bg overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-dopamine-orange via-dopamine-sky to-dopamine-mint" style="width:${percent}%"></div>
        </div>
      </div>`;
  }).join('');

  makeOrUpdateChart('focusChart','focus',{
    type:'line',
    data:{
      labels: dates.map(d => d.slice(5)),
      datasets:[{
        label:'专注分钟',
        data: dates.map(d => focusMinutesOn(d)),
        borderColor:'#FF8C42',
        backgroundColor:'rgba(255,140,66,0.18)',
        fill:true,
        tension:.35
      }]
    },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } }
  });
  makeOrUpdateChart('attendanceChart','attendance',{
    type:'bar',
    data:{
      labels: dates.map(d => d.slice(5)),
      datasets:[{
        label:'工作分钟',
        data: dates.map(d => totalAttendanceMinutes(d)),
        backgroundColor:'#4D9DE0',
        borderRadius:12
      }]
    },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } }
  });
  makeOrUpdateChart('habitChart','habit',{
    type:'line',
    data:{
      labels: dates.map(d => d.slice(5)),
      datasets:[{
        label:'完成度 %',
        data: dates.map(d => todayHabitCompletion(d)),
        borderColor:'#43AA8B',
        backgroundColor:'rgba(67,170,139,0.15)',
        fill:true,
        tension:.3
      }]
    },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, max:100 } } }
  });
  makeOrUpdateChart('thesisChart','thesis',{
    type:'bar',
    data:{
      labels: dates.map(d => d.slice(5)),
      datasets:[
        {
          type:'bar',
          label:'投入分钟',
          data: dates.map(d => (state.thesis?.logs || []).filter(item => item.date === d).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0)),
          backgroundColor:'#9B5DE5',
          borderRadius:12,
          yAxisID:'y'
        },
        {
          type:'line',
          label:'写作字数',
          data: dates.map(d => (state.thesis?.logs || []).filter(item => item.date === d).reduce((sum, item) => sum + (Number(item.words) || 0), 0)),
          borderColor:'#FF5A5F',
          backgroundColor:'rgba(255,90,95,0.15)',
          tension:.3,
          yAxisID:'y1'
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      scales:{
        y:{ beginAtZero:true, title:{ display:true, text:'分钟' } },
        y1:{ beginAtZero:true, position:'right', grid:{ drawOnChartArea:false }, title:{ display:true, text:'字数' } }
      }
    }
  });
  makeOrUpdateChart('wellbeingChart','wellbeing',{
    type:'bar',
    data:{
      labels: dates.map(d => d.slice(5)),
      datasets:[
        { label:'心灵关怀', data: dates.map(d => careCountOn(d)), backgroundColor:'#F6BD60', borderRadius:10 },
        { label:'导师沟通', data: dates.map(d => mentorCountOn(d)), backgroundColor:'#9B5DE5', borderRadius:10 },
        { label:'每日复盘', data: dates.map(d => reviewCountOn(d)), backgroundColor:'#FF5A5F', borderRadius:10 }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, max:1, ticks:{ stepSize:1 } } } }
  });
  const stageCounts = SUBMISSION_COLUMNS.map(stage => state.submissions.filter(item => item.stage===stage).length);
  makeOrUpdateChart('submissionChart','submission',{
    type:'doughnut',
    data:{ labels: SUBMISSION_COLUMNS, datasets:[{ data: stageCounts, backgroundColor: SUBMISSION_COLUMNS.map(stage => STAGE_COLORS[stage] || '#d1d5db') }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });
}
function makeOrUpdateChart(canvasId, key, config) {
  const canvas = $(canvasId);
  if (!canvas) return;
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart(canvas, config);
}
