/* Achievement tiers and progress series. */
'use strict';

function achievementCategoryMeta(category) {
  return ({
    system: { label:'执行系统', icon:'🗂️', desc:'项目、任务和时间安排让执行变得更稳。' },
    research: { label:'科研推进', icon:'🔬', desc:'论文、投稿和专注记录共同构成你的研究推进曲线。' },
    health: { label:'身心恢复', icon:'🌿', desc:'早睡、早起、运动这些基础盘，直接决定能否长期稳定输出。' },
    support: { label:'支持体系', icon:'🫶', desc:'心灵关怀、导师沟通和复盘，帮助你不靠硬扛完成博士。' }
  })[category] || { label:category, icon:'🏅', desc:'' };
}
function buildTierSeries({ category, seriesId, title, icon, color, value, goals, noun }) {
  const tierNames = ['初阶','进阶','高阶'];
  return goals.map((goal, index) => ({
    id:`${seriesId}_${index + 1}`,
    category,
    seriesId,
    title:`${title} · ${tierNames[index]}`,
    baseTitle:title,
    tier:index + 1,
    tierName:tierNames[index],
    desc:`累计 ${noun} ${goal}`,
    progress:Math.min(value, goal),
    rawValue:value,
    goal,
    unlocked:value >= goal,
    icon,
    color
  }));
}
function getAchievements() {
  const totalFocusSessions = state.focus.sessions.length;
  const totalFocusMinutes = state.focus.sessions.reduce((sum, s) => sum + (Number(s.minutes)||0), 0);
  const totalWorkLogs = Object.values(state.attendance).reduce((sum, day) => sum + (day.logs?.length||0), 0);
  const totalScheduleBlocks = Object.values(state.timeBlocks || {}).reduce((sum, blocks) => sum + (Array.isArray(blocks) ? blocks.length : 0), 0);
  const totalProjects = state.projects.length;
  const totalDoneTasks = state.tasks.filter(item => item.status === 'done').length;
  const earlyWakeCount = Object.values(state.attendance).filter(day => qualifiesWake(day.wake)).length;
  const earlySleepCount = Object.values(state.attendance).filter(day => qualifiesSleep(day.sleep)).length;
  const exerciseDays = Object.entries(state.habits.entries).filter(([_, map]) => normalizeDurationEntry(map?.['habit_exercise']).done).length;
  const habitStrongDays = Object.keys(state.habits.entries || {}).filter(date => todayHabitCompletion(date) >= 80).length;
  const careEntries = Object.keys(state.care?.entries || {}).filter(date => careCountOn(date)).length;
  const reviewEntries = Object.keys(state.reviewDaily?.entries || {}).filter(date => reviewCountOn(date)).length;
  const mentorEntries = Object.keys(state.mentor?.entries || {}).filter(date => mentorCountOn(date)).length;
  const supportEntries = careEntries + reviewEntries + mentorEntries;
  const thesisLogs = state.thesis?.logs?.length || 0;
  const submissionCount = state.submissions.length;
  const acceptedCount = state.submissions.filter(s => ['已接收','已见刊/已收录'].includes(s.stage)).length;

  return [
    ...buildTierSeries({ category:'system', seriesId:'projects', title:'项目系统搭建者', icon:'📁', color:'from-purple-400 to-indigo-500', value:totalProjects, goals:[1, 3, 8], noun:'创建项目' }),
    ...buildTierSeries({ category:'system', seriesId:'tasks_done', title:'下一步执行者', icon:'✅', color:'from-pink-400 to-rose-500', value:totalDoneTasks, goals:[5, 25, 100], noun:'完成任务' }),
    ...buildTierSeries({ category:'system', seriesId:'schedule_blocks', title:'时间块设计师', icon:'🗓️', color:'from-sky-400 to-cyan-500', value:totalScheduleBlocks, goals:[10, 40, 120], noun:'安排时间块' }),

    ...buildTierSeries({ category:'research', seriesId:'focus_sessions', title:'深度专注者', icon:'⏱️', color:'from-orange-400 to-pink-400', value:totalFocusSessions, goals:[1, 10, 50], noun:'次专注记录' }),
    ...buildTierSeries({ category:'research', seriesId:'focus_minutes', title:'研究引擎点火', icon:'🔥', color:'from-yellow-400 to-orange-500', value:totalFocusMinutes, goals:[300, 1000, 3000], noun:'分钟专注' }),
    ...buildTierSeries({ category:'research', seriesId:'thesis_logs', title:'论文推进工匠', icon:'📝', color:'from-violet-400 to-purple-600', value:thesisLogs, goals:[5, 20, 80], noun:'条论文日志' }),
    ...buildTierSeries({ category:'research', seriesId:'submission_created', title:'投稿管线启动者', icon:'📮', color:'from-sky-400 to-blue-500', value:submissionCount, goals:[1, 5, 12], noun:'个投稿项目' }),
    ...buildTierSeries({ category:'research', seriesId:'accepted', title:'成果归档者', icon:'🏆', color:'from-emerald-400 to-green-500', value:acceptedCount, goals:[1, 3, 5], noun:'个已接收 / 见刊项目' }),

    ...buildTierSeries({ category:'health', seriesId:'wake', title:'清晨掌控者', icon:'🌅', color:'from-yellow-300 to-orange-400', value:earlyWakeCount, goals:[7, 21, 60], noun:'天达标早起' }),
    ...buildTierSeries({ category:'health', seriesId:'sleep', title:'作息守恒者', icon:'🌙', color:'from-indigo-400 to-purple-500', value:earlySleepCount, goals:[7, 21, 60], noun:'天达标早睡' }),
    ...buildTierSeries({ category:'health', seriesId:'exercise', title:'身体底盘建设者', icon:'🏃', color:'from-green-400 to-emerald-500', value:exerciseDays, goals:[7, 21, 60], noun:'天运动记录' }),
    ...buildTierSeries({ category:'health', seriesId:'habit_strong', title:'可持续节奏维护者', icon:'🌿', color:'from-lime-400 to-green-500', value:habitStrongDays, goals:[5, 20, 60], noun:'天习惯完成度达到 80%' }),

    ...buildTierSeries({ category:'support', seriesId:'care', title:'自我关怀练习者', icon:'🌱', color:'from-teal-400 to-emerald-500', value:careEntries, goals:[5, 20, 60], noun:'天心灵关怀' }),
    ...buildTierSeries({ category:'support', seriesId:'review', title:'结构化复盘者', icon:'💗', color:'from-pink-400 to-fuchsia-500', value:reviewEntries, goals:[5, 20, 60], noun:'天每日复盘' }),
    ...buildTierSeries({ category:'support', seriesId:'mentor', title:'导师沟通设计师', icon:'🤝', color:'from-violet-400 to-fuchsia-500', value:mentorEntries, goals:[3, 15, 40], noun:'天导师沟通记录' }),
    ...buildTierSeries({ category:'support', seriesId:'support_all', title:'支持体系编织者', icon:'🫶', color:'from-rose-400 to-orange-500', value:supportEntries, goals:[10, 30, 90], noun:'条支持性记录' })
  ];
}
function renderAchievements() {
  const achievements = getAchievements();
  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  const bySeries = {};
  achievements.forEach(item => {
    if (!bySeries[item.seriesId]) bySeries[item.seriesId] = [];
    bySeries[item.seriesId].push(item);
  });
  const completedSeries = Object.values(bySeries).filter(items => items.every(item => item.unlocked)).length;
  const highTierUnlocked = achievements.filter(item => item.tier === 3 && item.unlocked).length;
  $('achievementSummary').innerHTML = `
    <div class="small-stat p-3"><div class="text-xs text-calm-mute">已解锁徽章</div><div class="text-2xl font-black">${unlocked}</div></div>
    <div class="small-stat p-3"><div class="text-xs text-calm-mute">总徽章</div><div class="text-2xl font-black">${total}</div></div>
    <div class="small-stat p-3"><div class="text-xs text-calm-mute">完整系列</div><div class="text-2xl font-black text-dopamine-mint">${completedSeries}</div></div>
    <div class="small-stat p-3"><div class="text-xs text-calm-mute">高阶成就</div><div class="text-2xl font-black text-dopamine-orange">${highTierUnlocked}</div></div>`;

  const categoryEntries = Object.entries(achievements.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {}));
  $('achievementSeriesOverview').innerHTML = categoryEntries.map(([category, items]) => {
    const meta = achievementCategoryMeta(category);
    const unlockedCount = items.filter(item => item.unlocked).length;
    return `
      <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
        <div class="font-black">${meta.icon} ${escapeHtml(meta.label)}</div>
        <div class="text-sm text-calm-mute mt-1">${escapeHtml(meta.desc)}</div>
        <div class="text-xl font-black mt-3">${unlockedCount} / ${items.length}</div>
      </div>`;
  }).join('');

  $('achievementGrid').innerHTML = categoryEntries.map(([category, items]) => {
    const meta = achievementCategoryMeta(category);
    const sectionItems = items.sort((a, b) => a.seriesId.localeCompare(b.seriesId) || a.tier - b.tier);
    return `
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xl font-black">${meta.icon} ${escapeHtml(meta.label)}</div>
            <div class="text-sm text-calm-mute mt-1">${escapeHtml(meta.desc)}</div>
          </div>
          <span class="pill bg-white border border-calm-line text-calm-mute">${sectionItems.filter(item => item.unlocked).length} / ${sectionItems.length}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          ${sectionItems.map(item => `
            <div class="achievement-card ${item.unlocked ? '' : 'locked'} rounded-[1.4rem] border border-calm-line bg-white p-4 shadow-soft">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-3xl mb-2">${item.icon}</div>
                  <div class="font-black text-lg">${escapeHtml(item.title)}</div>
                  <div class="text-sm text-calm-mute mt-1">${escapeHtml(item.desc)}</div>
                </div>
                <span class="pill ${item.unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}">${item.unlocked ? '已解锁' : item.tierName}</span>
              </div>
              <div class="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full bg-gradient-to-r ${item.color}" style="width:${Math.min(100, item.progress / item.goal * 100)}%"></div></div>
              <div class="flex items-center justify-between gap-3 text-xs text-calm-mute mt-2">
                <span>进度：${escapeHtml(String(item.progress))} / ${escapeHtml(String(item.goal))}</span>
                <span>系列 ${item.tier}/3</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}
function renderAchievementRangeStats() {
  const range = getStatsRange(todayStr());
  if ($('achievementStatsRangeLabel')) $('achievementStatsRangeLabel').textContent = range.label;
  const days = Math.max(1, range.dates.length);
  const focusSessions = state.focus.sessions.filter(s => isDateInRange(s.date, range.start, range.end)).length;
  const focusMinutes = state.focus.sessions.filter(s => isDateInRange(s.date, range.start, range.end)).reduce((sum, s) => sum + (Number(s.minutes)||0), 0);
  const tasksDone = state.tasks.filter(item => item.doneAt && isDateInRange(dateFromDateTime(item.doneAt), range.start, range.end)).length;
  const thesisLogs = (state.thesis?.logs || []).filter(item => isDateInRange(item.date, range.start, range.end)).length;
  const mentorDays = range.dates.reduce((sum, date) => sum + mentorCountOn(date), 0);
  const avgHabit = Math.round(range.dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / days);
  const cards = [
    { label:`${statsModeText()}专注次数`, value: focusSessions, color:'text-dopamine-orange' },
    { label:`${statsModeText()}专注时长`, value: formatMinutes(focusMinutes), color:'text-dopamine-orange' },
    { label:`${statsModeText()}完成任务`, value: tasksDone, color:'text-dopamine-pink' },
    { label:`${statsModeText()}论文日志`, value: thesisLogs, color:'text-dopamine-purple' },
    { label:`${statsModeText()}导师沟通`, value: mentorDays, color:'text-dopamine-sky' },
    { label:`${statsModeText()}习惯均值`, value: `${avgHabit}%`, color:'text-dopamine-mint' }
  ];
  $('achievementRangeStats').innerHTML = cards.map(item => `
    <div class="small-stat p-4">
      <div class="text-sm text-calm-mute">${item.label}</div>
      <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
    </div>
  `).join('');
}
