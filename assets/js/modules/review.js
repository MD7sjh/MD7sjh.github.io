/* Daily review, digest, and Markdown export. */
'use strict';

function syncReviewTomorrowTasks(date, entry) {
  const targetDate = shiftDate(date, 1);
  entry.tomorrowTaskIds = Array.isArray(entry.tomorrowTaskIds) ? entry.tomorrowTaskIds.slice(0, 3) : ['', '', ''];
  while (entry.tomorrowTaskIds.length < 3) entry.tomorrowTaskIds.push('');
  entry.tomorrow.forEach((rawTitle, index) => {
    const title = String(rawTitle || '').trim();
    if (!title) return;
    let task = state.tasks.find(item => item.id === entry.tomorrowTaskIds[index]);
    const todayBucket = targetDate === todayStr() ? (index === 0 ? 'must' : 'should') : '';
    const patch = {
      title: `明日优先 ${index + 1}：${title}`,
      projectId: '',
      gtdBucket: 'next',
      quadrant: index === 0 ? 'q1' : 'q2',
      todayBucket,
      dueDate: targetDate,
      estimate: index === 0 ? 45 : 30,
      context: '复盘',
      note: `review:${date}:tomorrow:${index + 1}`
    };
    if (task && task.status !== 'done') {
      Object.assign(task, patch);
    } else if (!task) {
      task = createTask({ ...patch, status:'planned' });
      entry.tomorrowTaskIds[index] = task?.id || '';
    }
  });
}
function saveDailyReview() {
  const date = $('reviewDate').value || todayStr();
  const existing = dailyReviewEntryOn(date);
  const nextEntry = normalizeDailyReviewEntry({
    energy: $('reviewEnergy').value,
    energyNote: $('reviewEnergyNote').value.trim(),
    accomplishments: $('reviewAccomplishments').value.trim(),
    unfinished: $('reviewUnfinished').value.trim(),
    insights: $('reviewInsights').value.trim(),
    obstacles: $('reviewObstacles').value.trim(),
    tomorrow: [
      $('reviewTomorrow1').value.trim(),
      $('reviewTomorrow2').value.trim(),
      $('reviewTomorrow3').value.trim()
    ],
    tomorrowTaskIds: existing.tomorrowTaskIds || ['', '', ''],
    updatedAt: nowDateTime()
  });
  if (!reviewContentCount(nextEntry)) {
    alert('至少写下一条核心成果、未竟分析、学术洞见、障碍对策或明日优先任务，再保存复盘。');
    return;
  }
  syncReviewTomorrowTasks(date, nextEntry);
  state.reviewDaily.entries[date] = nextEntry;
  saveState();
  renderAll();
}
function deleteDailyReview(date = $('reviewDate').value || todayStr()) {
  delete state.reviewDaily.entries[date];
  saveState();
  renderAll();
}
function buildDailyDigest(date=todayStr()) {
  const workLogs = state.attendance?.[date]?.logs || [];
  const workMinutes = totalAttendanceMinutes(date);
  const leaveCount = (state.attendance?.[date]?.leaves || []).length;
  const focusSessions = state.focus.sessions.filter(item => item.date === date);
  const focusMinutes = focusMinutesOn(date);
  const taskCreated = state.tasks.filter(item => dateFromDateTime(item.createdAt) === date).length;
  const taskStarted = state.tasks.filter(item => dateFromDateTime(item.startedAt) === date).length;
  const taskDone = state.tasks.filter(item => dateFromDateTime(item.doneAt) === date).length;
  const scheduleBlocks = state.timeBlocks?.[date] || [];
  const scheduleCount = scheduleBlocks.length;
  const scheduleMinutes = scheduleBlocks.reduce((sum, item) => sum + minutesBetween(item.start, item.end), 0);

  const thesisLogs = (state.thesis?.logs || []).filter(item => item.date === date);
  const thesisMinutes = thesisLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const thesisWords = thesisLogs.reduce((sum, item) => sum + (Number(item.words) || 0), 0);
  const milestoneDone = (state.thesis?.milestones || []).filter(item => dateFromDateTime(item.doneAt) === date).length;
  const chapterUpdated = (state.thesis?.chapters || []).filter(item => dateFromDateTime(item.updatedAt) === date).length;

  const submissionCreated = state.submissions.filter(item => dateFromDateTime(item.createdAt) === date).length;
  const submissionUpdated = state.submissions.filter(item => dateFromDateTime(item.updatedAt) === date && dateFromDateTime(item.createdAt) !== date).length;
  const submissionDue = state.submissions.filter(item => item.deadline === date).length;
  const submissionMoves = submissionCreated + submissionUpdated;
  const submissionLogsToday = state.submissions.flatMap(item => (item.logs || []).filter(log => log.date === date).map(log => ({ item, log })));
  const accountingToday = (state.accounting?.transactions || []).filter(item => item.date === date);
  const accountingIncome = accountingToday.filter(item => item.type === 'income').reduce((sum,item)=>sum+item.amount,0);
  const accountingExpense = accountingToday.filter(item => item.type === 'expense').reduce((sum,item)=>sum+item.amount,0);

  const enabledHabits = (state.habits?.list || []).filter(item => item && item.enabled !== false && !LEGACY_REMOVED_HABITS.has(item.id));
  const doneHabits = enabledHabits.filter(item => habitDoneOnDate(item, date)).length;
  const exercise = getDurationEntry(date, 'habit_exercise');
  const foods = state.foods.filter(item => item.date === date);
  const weights = (state.weights || []).filter(item => item.date === date);
  const care = careEntryOn(date);
  const mentor = mentorEntryOn(date);
  const review = dailyReviewEntryOn(date);
  const careMood = careMoodMeta(care.mood);
  const mentorStatus = mentorStatusMeta(mentor.status);
  const reviewEnergy = reviewEnergyMeta(review.energy);
  const exMinutes = Math.round(exercise.minutes) || 0;
  const exInfo = exercise.done ? `${exMinutes ? `${exMinutes} 分钟` : '已记录'}${exercise.type ? ` · ${exercise.type}` : ''}${exercise.intensity ? ` · ${exercise.intensity}` : ''}` : '未记录';

  const cards = [
    { label:'总览首页', value:`${workLogs.length} 段 / ${focusSessions.length} 次`, color:'text-dopamine-orange' },
    { label:'时间块', value:`${scheduleCount} 个 / ${formatMinutes(scheduleMinutes)}`, color:'text-dopamine-sky' },
    { label:'论文进度', value:`${thesisLogs.length} 条`, color:'text-dopamine-purple' },
    { label:'投稿管理', value:`${submissionMoves} 动`, color:'text-dopamine-sky' },
    { label:'记账管理', value:accountingToday.length ? `${accountingToday.length} 笔` : '未记录', color:'text-dopamine-pink' },
    { label:'健康管理', value:`${todayHabitCompletion(date)}%`, color:'text-dopamine-mint' },
    { label:'心灵关怀', value: careCountOn(date) ? `${careMood.emoji} 压力${care.stress}` : '未记录', color:'text-dopamine-pink' },
    { label:'导师沟通', value: mentorCountOn(date) ? `${mentorStatus.emoji} ${mentorStatus.label}` : '未记录', color:'text-dopamine-purple' },
    { label:'每日复盘', value: reviewCountOn(date) ? `${reviewEnergy.emoji} ${reviewTemplateCount(review)}/5` : '未写', color:'text-dopamine-yellow' }
  ];

  const sections = [
    {
      title: '总览首页',
      lines: [
        `工作打卡：${workLogs.length} 段，共 ${formatMinutes(workMinutes)}`,
        `请假记录：${leaveCount} 条`,
        `专注记录：${focusSessions.length} 次，共 ${formatMinutes(focusMinutes)}`,
        `任务推进：新增 ${taskCreated}，启动 ${taskStarted}，完成 ${taskDone}`,
        `日程时间块：${scheduleCount} 个，共 ${formatMinutes(scheduleMinutes)}`
      ]
    },
    {
      title: '博士毕业论文进度',
      lines: [
        `推进日志：${thesisLogs.length} 条，共 ${formatMinutes(thesisMinutes)}${thesisWords ? `，${thesisWords} 字` : ''}`,
        `完成里程碑：${milestoneDone} 个`,
        `更新章节：${chapterUpdated} 个`
      ]
    },
    {
      title: '投稿管理',
      lines: [
        `新增项目：${submissionCreated} 个`,
        `今日更新：${submissionUpdated} 个`,
        `推进日志：${submissionLogsToday.length} 条`,
        `今日截止：${submissionDue} 个`,
        `进行中项目：${runningSubmissionCount()} 个`
      ]
    },
    {
      title: '记账管理',
      lines: accountingToday.length
        ? [
            `今日记录：${accountingToday.length} 笔`,
            `收入：${formatAccountingMoney(accountingIncome)}`,
            `支出：${formatAccountingMoney(accountingExpense)}`,
            `当日结余：${formatAccountingMoney(accountingIncome - accountingExpense)}`
          ]
        : ['今天还没有收支记录。']
    },
    {
      title: '健康管理',
      lines: [
        `习惯完成度：${todayHabitCompletion(date)}%（${doneHabits}/${enabledHabits.length || 0}）`,
        `早起：${state.attendance?.[date]?.wake ? `${state.attendance[date].wake}${qualifiesWake(state.attendance[date].wake) ? ' · 达标' : ''}` : '未记录'}`,
        `早睡：${state.attendance?.[date]?.sleep ? `${state.attendance[date].sleep}${qualifiesSleep(state.attendance[date].sleep) ? ' · 达标' : ''}` : '未记录'}`,
        `运动：${exInfo}`,
        `饮食记录：${foods.length} 条`,
        `体重记录：${weights.length ? weights.map(item => `${item.value} ${item.unit}`).join('；') : '未记录'}`
      ]
    },
    {
      title: '心灵关怀',
      lines: careCountOn(date)
        ? [
            `情绪状态：${careMood.emoji} ${careMood.label}`,
            `压力 / 能量：${care.stress}/5 · ${care.energy}/5`,
            `自我关怀：${care.selfCare ? '已记录' : '未记录'}`,
            `支持 / 边界：${care.support ? '已记录' : '未记录'}`
          ]
        : ['今天还没有心灵关怀记录。']
    },
    {
      title: '向上管理导师',
      lines: mentorCountOn(date)
        ? [
            `沟通状态：${mentorStatus.emoji} ${mentorStatus.label}`,
            `压力 / 清晰度：${mentor.pressure}/5 · ${mentor.clarity}/5`,
            `明确请求：${mentor.ask ? '已写' : '未写'}`,
            `导师反馈 / 决策：${mentor.feedback ? '已写' : '未写'}`,
            `导师承诺留痕：${mentor.commitment ? '已写' : '未写'}`,
            `下一步动作：${mentor.nextAction ? '已写' : '未写'}${mentor.nextActionTaskId ? ' · 已加入任务总表' : ''}`
          ]
        : ['今天还没有整理导师沟通。']
    },
    {
      title: '每日复盘',
      lines: reviewCountOn(date)
        ? [
            `状态 / 能量：${reviewEnergy.emoji} ${reviewEnergy.label}${review.energyNote ? `｜${review.energyNote}` : ''}`,
            `今日核心成果：${review.accomplishments || '未写'}`,
            `未完成与拖延分析：${review.unfinished || '未写'}`,
            `学术洞见与新发现：${review.insights || '未写'}`,
            `障碍与对策：${review.obstacles || '未写'}`,
            `明日优先任务：${review.tomorrow.filter(item => item.trim()).join('；') || '未写'}`,
            `任务联动：${(review.tomorrowTaskIds || []).filter(Boolean).length} 条已加入任务总表`
          ]
        : ['今天还没有保存结构化复盘。']
    }
  ];

  const markdown = [
    `# ${date} PhD 每日复盘与记录统计`,
    '',
    ...sections.flatMap(section => [`## ${section.title}`, ...section.lines.map(line => `- ${line}`), ''])
  ].join('\n').trim();

  return { cards, sections, markdown };
}
function downloadReviewMarkdown() {
  const date = $('reviewDate').value || todayStr();
  const digest = buildDailyDigest(date);
  const blob = new Blob([digest.markdown], { type:'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `phd_daily_review_${date}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
function renderReview() {
  const date = $('reviewDate').value || todayStr();
  const review = dailyReviewEntryOn(date);
  setInputIfIdle('reviewEnergy', review.energy || 'medium');
  setInputIfIdle('reviewEnergyNote', review.energyNote || '');
  setInputIfIdle('reviewAccomplishments', review.accomplishments || '');
  setInputIfIdle('reviewUnfinished', review.unfinished || '');
  setInputIfIdle('reviewInsights', review.insights || '');
  setInputIfIdle('reviewObstacles', review.obstacles || '');
  setInputIfIdle('reviewTomorrow1', review.tomorrow[0] || '');
  setInputIfIdle('reviewTomorrow2', review.tomorrow[1] || '');
  setInputIfIdle('reviewTomorrow3', review.tomorrow[2] || '');

  const digest = buildDailyDigest(date);
  $('reviewGeneratedStats').innerHTML = digest.cards.map(item => `
    <div class="small-stat p-4">
      <div class="text-sm text-calm-mute">${item.label}</div>
      <div class="text-xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
    </div>
  `).join('');
  $('reviewGeneratedSections').innerHTML = digest.sections.map(section => `
    <div class="small-stat p-4">
      <div class="font-black mb-2">${escapeHtml(section.title)}</div>
      <div class="space-y-1 text-sm">
        ${section.lines.map(line => `<div>${escapeHtml(line)}</div>`).join('')}
      </div>
    </div>
  `).join('');
  $('reviewGeneratedMd').textContent = digest.markdown;

  $('reviewHistory').innerHTML = recentDates(7).map(d => {
    const item = dailyReviewEntryOn(d);
    const energy = reviewEnergyMeta(item.energy);
    return `
      <div class="rounded-2xl border border-calm-line bg-white px-3 py-3 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="font-bold">${dayLabel(d)}</div>
          <div class="text-xs text-calm-mute mt-1">${reviewCountOn(d) ? `${energy.emoji} 能量${energy.short} · 学术项 ${reviewTemplateCount(item)}/5 · 明日 ${reviewPriorityCount(item)}/3` : '未写复盘'}</div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="text-sm font-bold text-dopamine-orange" data-jump-review="${d}">查看</button>
          ${reviewCountOn(d) ? `<button class="text-sm font-bold text-rose-600" data-delete-review="${d}">删除</button>` : ''}
        </div>
      </div>`;
  }).join('');
  $('reviewHistory').querySelectorAll('[data-jump-review]').forEach(btn => btn.onclick = () => { $('reviewDate').value = btn.dataset.jumpReview; navTo('review-section'); renderAll(); });
  $('reviewHistory').querySelectorAll('[data-delete-review]').forEach(btn => btn.onclick = () => { if (confirm('确定删除这天的复盘吗？')) deleteDailyReview(btn.dataset.deleteReview); });
}
function renderReviewThemeStats() {
  const baseDate = $('reviewDate').value || todayStr();
  const range = getStatsRange(baseDate);
  if ($('reviewStatsRangeLabel')) $('reviewStatsRangeLabel').textContent = range.label;
  const entries = range.dates.map(date => ({ date, entry: dailyReviewEntryOn(date) })).filter(item => reviewCountOn(item.date));
  const count = entries.length;
  const accomplishmentDays = entries.filter(item => item.entry.accomplishments.trim()).length;
  const insightDays = entries.filter(item => item.entry.insights.trim()).length;
  const obstacleDays = entries.filter(item => item.entry.obstacles.trim()).length;
  const priorityTotal = entries.reduce((sum, item) => sum + reviewPriorityCount(item.entry), 0);
  const syncDays = entries.filter(item => careCountOn(item.date)).length;
  const cards = [
    { label:`${statsModeText(baseDate)}复盘完成`, value: `${count}/${Math.max(1, range.dates.length)}`, color:'text-dopamine-pink' },
    { label:`${statsModeText(baseDate)}记录成果`, value: accomplishmentDays, color:'text-dopamine-yellow' },
    { label:`${statsModeText(baseDate)}学术洞见`, value: insightDays, color:'text-dopamine-sky' },
    { label:`${statsModeText(baseDate)}障碍对策`, value: obstacleDays, color:'text-dopamine-mint' },
    { label:`${statsModeText(baseDate)}明日优先`, value: priorityTotal, color:'text-dopamine-orange' },
    { label:`${statsModeText(baseDate)}同步心灵关怀`, value: syncDays, color:'text-dopamine-purple' }
  ];
  $('reviewThemeStats').innerHTML = cards.map(item => `
    <div class="small-stat p-4">
      <div class="text-sm text-calm-mute">${item.label}</div>
      <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
    </div>
  `).join('');
}
