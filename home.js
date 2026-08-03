/* Local state loading, persistence, and shared selectors. */
'use strict';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      attendance: normalizeAttendance(parsed.attendance),
      timeBlocks: parsed.timeBlocks && typeof parsed.timeBlocks === 'object' ? parsed.timeBlocks : {},
      tasks: normalizeTasksState(parsed.tasks),
      projects: normalizeProjectsState(parsed.projects),
      focus: parsed.focus && typeof parsed.focus === 'object' ? { active: parsed.focus.active || null, sessions: Array.isArray(parsed.focus.sessions) ? parsed.focus.sessions : [] } : { active:null, sessions:[] },
      habits: normalizeHabitsState(parsed.habits),
      foods: Array.isArray(parsed.foods) ? parsed.foods : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights.map(item => ({
        id: String(item.id || uid('weight')),
        date: String(item.date || dateFromDateTime(item.at) || todayStr()),
        value: Math.max(0, Number(item.value) || 0),
        unit: ['kg','斤','lb'].includes(item.unit) ? item.unit : 'kg',
        at: String(item.at || nowDateTime())
      })).filter(item => item.value > 0) : [],
      mood: normalizeMoodMap(parsed.mood),
      reflections: normalizeReflectionMap(parsed.reflections),
      care: normalizeCareState(parsed.care, parsed.mood),
      mentor: normalizeMentorState(parsed.mentor),
      reviewDaily: normalizeDailyReviewState(parsed.reviewDaily, parsed.reflections),
      submissions: normalizeSubmissions(parsed.submissions),
      accounting: normalizeAccountingState(parsed.accounting),
      savings: normalizeSavingsState(parsed.savings),
      thesis: normalizeThesisState(parsed.thesis)
    };
  } catch (err) {
    console.error(err);
    return {
      attendance:{},
      timeBlocks:{},
      tasks:[],
      projects:[],
      focus:{active:null,sessions:[]},
      habits:normalizeHabitsState({}),
      foods:[],
      weights:[],
      mood:{},
      reflections:{},
      care:normalizeCareState({}, {}),
      mentor:normalizeMentorState({}),
      reviewDaily:normalizeDailyReviewState({}, {}),
      submissions:[],
      accounting: normalizeAccountingState({}),
      savings: normalizeSavingsState({}),
      thesis: defaultThesisState()
    };
  }
}

const state = loadState();
let workflowSelectedProjectId = '';
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getDayAttendance(date=todayStr()) {
  if (!state.attendance[date]) state.attendance[date] = { wake:null, sleep:null, logs:[], leaves:[] };
  return state.attendance[date];
}
function getDayTimeBlocks(date=todayStr()) {
  if (!state.timeBlocks[date]) state.timeBlocks[date] = [];
  return state.timeBlocks[date];
}
function getHabitEntryMap(date=todayStr()) {
  if (!state.habits.entries[date]) state.habits.entries[date] = {};
  return state.habits.entries[date];
}
function projectById(id='') { return state.projects.find(item => item.id === id) || null; }
function careEntryOn(date=todayStr()) { return normalizeCareEntry(state.care?.entries?.[date]); }
function mentorEntryOn(date=todayStr()) { return normalizeMentorEntry(state.mentor?.entries?.[date]); }
function dailyReviewEntryOn(date=todayStr()) { return normalizeDailyReviewEntry(state.reviewDaily?.entries?.[date]); }
function activeTask() { return state.tasks.find(t => t.status === 'active') || null; }
function taskOpen(task) { return task && task.status !== 'done' && task.gtdBucket !== 'done'; }
function openTasksList() { return state.tasks.filter(taskOpen); }
function tasksForProject(projectId='') { return state.tasks.filter(item => item.projectId === projectId); }
function nextActionTasks() { return state.tasks.filter(item => taskOpen(item) && item.gtdBucket === 'next'); }
function focusMinutesOn(date=todayStr()) { return state.focus.sessions.filter(s => s.date===date).reduce((sum,s)=>sum + (Number(s.minutes)||0), 0); }
function reviewPriorityCount(entry) {
  const clean = normalizeDailyReviewEntry(entry);
  return clean.tomorrow.filter(item => String(item || '').trim()).length;
}
function reviewTemplateCount(entry) {
  const clean = normalizeDailyReviewEntry(entry);
  return [
    clean.accomplishments,
    clean.unfinished,
    clean.insights,
    clean.obstacles,
    reviewPriorityCount(clean) ? 'tomorrow' : ''
  ].filter(item => String(item || '').trim()).length;
}
function reviewContentCount(entry) {
  const clean = normalizeDailyReviewEntry(entry);
  return reviewTemplateCount(clean) + (clean.energyNote.trim() ? 1 : 0);
}
function careCountOn(date=todayStr()) {
  const entry = careEntryOn(date);
  return entry.updatedAt || entry.challenge || entry.selfCare || entry.gratitude || entry.support || entry.note ? 1 : 0;
}
function mentorCountOn(date=todayStr()) {
  const entry = mentorEntryOn(date);
  return entry.updatedAt || entry.topic || entry.evidence || entry.ask || entry.risk || entry.feedback || entry.commitment || entry.confirmation || entry.followupDate || entry.boundary || entry.nextAction || entry.status !== 'drafting' || entry.channel || entry.pressure !== 3 || entry.clarity !== 3 || entry.promiseStatus !== 'open' ? 1 : 0;
}
function reviewCountOn(date=todayStr()) {
  const entry = dailyReviewEntryOn(date);
  return entry.updatedAt || reviewContentCount(entry) > 0 ? 1 : 0;
}
function supportPageCountOn(date=todayStr()) { return careCountOn(date) + mentorCountOn(date) + reviewCountOn(date); }
function moodCountOn(date=todayStr()) { return careCountOn(date) + reviewCountOn(date); }
function mentorPendingItems(baseDate=todayStr()) {
  return Object.entries(state.mentor?.entries || {})
    .map(([date]) => ({ date, entry: mentorEntryOn(date) }))
    .filter(item => item.entry.commitment.trim() && item.entry.promiseStatus !== 'resolved')
    .sort((a, b) => (a.entry.followupDate || '9999-99-99').localeCompare(b.entry.followupDate || '9999-99-99') || b.date.localeCompare(a.date));
}
function mentorOverdueCount(baseDate=todayStr()) {
  return mentorPendingItems(baseDate).filter(item => item.entry.followupDate && item.entry.followupDate < baseDate).length;
}
function runningSubmissionCount() { return state.submissions.filter(s => !['已接收','已见刊/已收录','搁置/拒稿'].includes(s.stage)).length; }
function accountingMonthKey(date=todayStr()) { return String(date || todayStr()).slice(0, 7); }
function accountingTransactionsInMonth(month=accountingMonthKey()) {
  return (state.accounting?.transactions || []).filter(item => String(item.date || '').startsWith(month));
}
function accountingMonthTotals(month=accountingMonthKey()) {
  const transactions = accountingTransactionsInMonth(month);
  const income = transactions.filter(item => item.type === 'income').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const expense = transactions.filter(item => item.type === 'expense').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return { income, expense, balance: income - expense, count: transactions.length };
}

function savingsGoalById(id='') { return state.savings?.goals?.find(item => item.id === id) || null; }
function savingsEntriesForGoal(goalId='') {
  return (state.savings?.entries || []).filter(item => item.goalId === goalId);
}
function savingsGoalSavedAmount(goalOrId) {
  const goal = typeof goalOrId === 'string' ? savingsGoalById(goalOrId) : goalOrId;
  if (!goal) return 0;
  const movement = savingsEntriesForGoal(goal.id).reduce((sum, item) => {
    return sum + (item.type === 'withdrawal' ? -Number(item.amount || 0) : Number(item.amount || 0));
  }, 0);
  return Math.max(0, Math.round((Number(goal.initialAmount || 0) + movement) * 100) / 100);
}
function savingsTotals() {
  const goals = state.savings?.goals || [];
  const target = goals.reduce((sum, goal) => sum + Number(goal.targetAmount || 0), 0);
  const saved = goals.reduce((sum, goal) => sum + savingsGoalSavedAmount(goal), 0);
  const remaining = goals.reduce((sum, goal) => sum + Math.max(0, Number(goal.targetAmount || 0) - savingsGoalSavedAmount(goal)), 0);
  return {
    target,
    saved,
    remaining,
    active: goals.filter(goal => goal.status === 'active').length,
    completed: goals.filter(goal => goal.status === 'completed').length,
    count: goals.length
  };
}
function savingsEntriesInRange(startDate, endDate) {
  return (state.savings?.entries || []).filter(item => isDateInRange(item.date, startDate, endDate));
}
function totalAttendanceMinutes(date=todayStr()) { return (state.attendance[date]?.logs || []).reduce((sum,log)=>sum + (log.end ? minutesBetween(log.start, log.end) : 0), 0); }
function todayOpenLogs(date=todayStr()) { return getDayAttendance(date).logs.filter(log => !log.end); }
function qualifiesWake(time) { return !!parseHM(time) && hmToMinutes(time) <= hmToMinutes('09:00'); }
function qualifiesSleep(time) { return !!parseHM(time) && hmToMinutes(time) <= hmToMinutes('23:30'); }
function todayHabitCompletion(date=todayStr()) {
  const habits = (state.habits?.list || []).filter(h => h && h.enabled !== false);
  const trackables = habits.filter(h => !LEGACY_REMOVED_HABITS.has(h.id));
  if (!trackables.length) return 0;
  const doneCount = trackables.filter(h => habitDoneOnDate(h, date)).length;
  return Math.round(doneCount / trackables.length * 100);
}
function ensureTaskCleanup() {
  state.tasks = normalizeTasksState(state.tasks);
  state.projects = normalizeProjectsState(state.projects);
}
ensureTaskCleanup();
function setInputIfIdle(id, value) {
  const el = $(id);
  if (!el) return;
  if (document.activeElement === el) return;
  const v = String(value ?? '');
  if (el.value !== v) el.value = v;
}
