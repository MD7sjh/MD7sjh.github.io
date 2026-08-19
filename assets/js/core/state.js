/* Local state loading, persistence, and shared selectors. */
'use strict';

function loadState() {
  try {
    let sourceKey = STORAGE_KEY;
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of (typeof LEGACY_STORAGE_KEYS !== 'undefined' ? LEGACY_STORAGE_KEYS : [])) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) { raw = legacyRaw; sourceKey = legacyKey; break; }
      }
    }
    const parsed = raw ? JSON.parse(raw) : {};
    const normalized = {
      attendance: normalizeAttendance(parsed.attendance),
      timeBlocks: parsed.timeBlocks && typeof parsed.timeBlocks === 'object' ? parsed.timeBlocks : {},
      tasks: normalizeTasksState(parsed.tasks),
      projects: normalizeProjectsState(parsed.projects),
      focus: parsed.focus && typeof parsed.focus === 'object' ? { active: parsed.focus.active || null, sessions: Array.isArray(parsed.focus.sessions) ? parsed.focus.sessions : [] } : { active:null, sessions:[] },
      reflections: normalizeReflectionMap(parsed.reflections),
      upward: normalizeUpwardState(parsed.upward, parsed.mentor),
      reviewDaily: normalizeDailyReviewState(parsed.reviewDaily, parsed.reflections),
      submissions: normalizeSubmissions(parsed.submissions),
      researchIdeas: normalizeResearchIdeasState(parsed.researchIdeas || parsed.ideas),
      experiments: normalizeExperimentsState(parsed.experiments || parsed.experimentResults),
      travel: normalizeTravelState(parsed.travel),
      papers: normalizePapersState(parsed.papers, parsed.thesis)
    };
    if (raw && sourceKey !== STORAGE_KEY) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (err) {
    console.error(err);
    return {
      attendance:{}, timeBlocks:{}, tasks:[], projects:[], focus:{active:null,sessions:[]}, reflections:{},
      upward:normalizeUpwardState({}, {}), reviewDaily:normalizeDailyReviewState({}, {}), submissions:[],
      researchIdeas:normalizeResearchIdeasState({}), experiments:normalizeExperimentsState({}),
      travel:normalizeTravelState({}), papers:normalizePapersState({}, {})
    };
  }
}

const state = loadState();
let workflowSelectedProjectId = '';
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getDayAttendance(date=todayStr()) {
  if (!state.attendance[date]) state.attendance[date] = { logs:[], leaves:[] };
  return state.attendance[date];
}
function getDayTimeBlocks(date=todayStr()) {
  if (!state.timeBlocks[date]) state.timeBlocks[date] = [];
  return state.timeBlocks[date];
}
function projectById(id='') { return state.projects.find(item => item.id === id) || null; }
function upwardEntryOn(date=todayStr()) { return normalizeUpwardEntry(state.upward?.entries?.[date]); }
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
  return [clean.accomplishments, clean.unfinished, clean.insights, clean.obstacles, reviewPriorityCount(clean) ? 'tomorrow' : ''].filter(item => String(item || '').trim()).length;
}
function reviewContentCount(entry) { const clean = normalizeDailyReviewEntry(entry); return reviewTemplateCount(clean) + (clean.energyNote.trim() ? 1 : 0); }
function upwardCountOn(date=todayStr()) {
  const entry = upwardEntryOn(date);
  return entry.updatedAt || entry.personName || entry.organization || entry.topic || entry.evidence || entry.ask || entry.risk || entry.feedback || entry.commitment || entry.confirmation || entry.followupDate || entry.boundary || entry.nextAction || entry.status !== 'drafting' || entry.channel || entry.pressure !== 3 || entry.clarity !== 3 || entry.promiseStatus !== 'open' ? 1 : 0;
}
function reviewCountOn(date=todayStr()) {
  const entry = dailyReviewEntryOn(date);
  return entry.updatedAt || reviewContentCount(entry) > 0 ? 1 : 0;
}
function supportPageCountOn(date=todayStr()) { return upwardCountOn(date) + reviewCountOn(date); }
function upwardPendingItems(baseDate=todayStr()) {
  return Object.entries(state.upward?.entries || {})
    .map(([date]) => ({ date, entry: upwardEntryOn(date) }))
    .filter(item => item.entry.commitment.trim() && item.entry.promiseStatus !== 'resolved')
    .sort((a, b) => (a.entry.followupDate || '9999-99-99').localeCompare(b.entry.followupDate || '9999-99-99') || b.date.localeCompare(a.date));
}
function upwardOverdueCount(baseDate=todayStr()) { return upwardPendingItems(baseDate).filter(item => item.entry.followupDate && item.entry.followupDate < baseDate).length; }
function runningSubmissionCount() { return state.submissions.filter(s => !['已接收','已见刊/已收录','搁置/拒稿'].includes(s.stage)).length; }

function researchIdeaById(id='') { return state.researchIdeas?.ideas?.find(item => item.id === id) || null; }
function researchIdeasCreatedInRange(startDate, endDate) { return (state.researchIdeas?.ideas || []).filter(item => isDateInRange(dateFromDateTime(item.createdAt), startDate, endDate)); }
function researchIdeasUpdatedInRange(startDate, endDate) { return (state.researchIdeas?.ideas || []).filter(item => isDateInRange(dateFromDateTime(item.updatedAt), startDate, endDate)); }
function researchIdeaSourcesCount() { return (state.researchIdeas?.ideas || []).reduce((sum, item) => sum + (item.sources?.length || 0), 0); }
function researchIdeaReferencesCount() { return (state.researchIdeas?.ideas || []).reduce((sum, item) => sum + (item.references?.length || 0), 0); }
function activeResearchIdeaCount() { return (state.researchIdeas?.ideas || []).filter(item => !['adopted','archived'].includes(item.status)).length; }
function researchIdeaSourcesInRange(startDate, endDate) { return (state.researchIdeas?.ideas || []).flatMap(item => (item.sources || []).filter(source => isDateInRange(dateFromDateTime(source.createdAt), startDate, endDate)).map(source => ({ idea:item, source }))); }
function researchIdeaReferencesInRange(startDate, endDate) { return (state.researchIdeas?.ideas || []).flatMap(item => (item.references || []).filter(reference => isDateInRange(dateFromDateTime(reference.createdAt), startDate, endDate)).map(reference => ({ idea:item, reference }))); }

function paperById(id='') { return state.papers?.items?.find(item => item.id === id) || null; }
function activePapers() { return (state.papers?.items || []).filter(item => !['accepted','archived'].includes(item.status)); }
function paperAllLogs() { return (state.papers?.items || []).flatMap(paper => (paper.logs || []).map(log => ({ paper, log }))); }
function paperLogsInRange(startDate,endDate) { return paperAllLogs().filter(item => isDateInRange(item.log.date,startDate,endDate)); }
function paperOverallProgressValue(paper) {
  if (!paper) return 0;
  const milestones = paper.milestones || [];
  const sections = paper.sections || [];
  const m = milestones.length ? milestones.filter(item => item.done).length / milestones.length : 0;
  const s = sections.length ? sections.reduce((sum,item) => sum + Number(item.progress || 0),0) / (100 * sections.length) : 0;
  return Math.round((m * .35 + s * .65) * 100);
}
function papersAverageProgress() {
  const items = state.papers?.items || [];
  return items.length ? Math.round(items.reduce((sum,item) => sum + paperOverallProgressValue(item),0) / items.length) : 0;
}

function travelPlanById(id='') { return state.travel?.plans?.find(item => item.id === id) || null; }
function activeTravelPlans() { return (state.travel?.plans || []).filter(item => !['completed','paused'].includes(item.status)); }
function travelNotesInRange(startDate,endDate) { return (state.travel?.notes || []).filter(item => isDateInRange(dateFromDateTime(item.createdAt),startDate,endDate)); }
function travelPlansCreatedInRange(startDate,endDate) { return (state.travel?.plans || []).filter(item => isDateInRange(dateFromDateTime(item.createdAt),startDate,endDate)); }



function experimentRunById(id='') { return state.experiments?.runs?.find(item => item.id === id) || null; }
function experimentRunsInRange(startDate,endDate) { return (state.experiments?.runs || []).filter(item => isDateInRange(item.date,startDate,endDate)); }
function experimentRunsCreatedInRange(startDate,endDate) { return (state.experiments?.runs || []).filter(item => isDateInRange(dateFromDateTime(item.createdAt),startDate,endDate)); }
function experimentRunsUpdatedInRange(startDate,endDate) { return (state.experiments?.runs || []).filter(item => isDateInRange(dateFromDateTime(item.updatedAt),startDate,endDate)); }
function completedExperimentRuns() { return (state.experiments?.runs || []).filter(item => item.status === 'completed'); }
function runningExperimentRuns() { return (state.experiments?.runs || []).filter(item => item.status === 'running'); }
function experimentMetricCount() { return (state.experiments?.runs || []).reduce((sum,item) => sum + (item.metrics?.length || 0),0); }
function experimentArtifactCount() { return (state.experiments?.runs || []).reduce((sum,item) => sum + (item.artifacts?.length || 0),0); }
function experimentRunsForPaper(paperId='') { return (state.experiments?.runs || []).filter(item => item.paperId === paperId); }
function experimentRunsForIdea(ideaId='') { return (state.experiments?.runs || []).filter(item => item.ideaId === ideaId); }

function totalAttendanceMinutes(date=todayStr()) { return (state.attendance[date]?.logs || []).reduce((sum,log)=>sum + (log.end ? minutesBetween(log.start, log.end) : 0), 0); }
function todayOpenLogs(date=todayStr()) { return getDayAttendance(date).logs.filter(log => !log.end); }
function ensureTaskCleanup() { state.tasks = normalizeTasksState(state.tasks); state.projects = normalizeProjectsState(state.projects); }
ensureTaskCleanup();
function setInputIfIdle(id, value) {
  const el = $(id); if (!el || document.activeElement === el) return;
  const v = String(value ?? ''); if (el.value !== v) el.value = v;
}
