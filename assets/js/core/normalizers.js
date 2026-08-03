/* Backward-compatible data normalization and default schemas. */
'use strict';

function taskBucketMeta(bucket) {
  return GTD_BUCKETS.find(item => item.value === bucket) || GTD_BUCKETS[1];
}
function taskQuadrantMeta(quadrant) {
  return QUADRANT_OPTIONS.find(item => item.value === quadrant) || QUADRANT_OPTIONS[1];
}
function todayBucketMeta(bucket) {
  return TODAY_BUCKETS.find(item => item.value === bucket) || TODAY_BUCKETS[0];
}
function taskStatusMeta(status) {
  return TASK_STATUS_OPTIONS.find(item => item.value === status) || TASK_STATUS_OPTIONS[1];
}
function projectAreaMeta(area) {
  return PROJECT_AREAS.find(item => item.value === area) || PROJECT_AREAS[0];
}
function projectStatusMeta(status) {
  return PROJECT_STATUS_OPTIONS.find(item => item.value === status) || PROJECT_STATUS_OPTIONS[0];
}
function blockColorForTask(task) {
  const quadrant = taskQuadrantMeta(task?.quadrant);
  if (quadrant.value === 'q1') return '#FB7185';
  if (quadrant.value === 'q2') return '#9B5DE5';
  if (quadrant.value === 'q3') return '#4D9DE0';
  return '#9CA3AF';
}
function normalizeTaskItem(item) {
  if (!item || item.title == null) return null;
  const title = String(item.title || '').trim();
  if (!title) return null;
  const status = TASK_STATUS_OPTIONS.some(opt => opt.value === item.status) ? item.status : 'todo';
  const rawBucket = GTD_BUCKETS.some(opt => opt.value === item.gtdBucket) ? item.gtdBucket : (status === 'done' ? 'done' : 'next');
  const bucket = status === 'done' ? 'done' : rawBucket;
  const quadrant = QUADRANT_OPTIONS.some(opt => opt.value === item.quadrant) ? item.quadrant : 'q2';
  const todayBucket = TODAY_BUCKETS.some(opt => opt.value === item.todayBucket) ? item.todayBucket : '';
  return {
    id: String(item.id || uid('task')),
    title,
    status,
    projectId: String(item.projectId || ''),
    gtdBucket: bucket,
    quadrant,
    todayBucket: status === 'done' ? '' : todayBucket,
    dueDate: String(item.dueDate || ''),
    estimate: Math.max(0, Number(item.estimate) || 0),
    context: String(item.context || ''),
    note: String(item.note || item.notes || ''),
    createdAt: String(item.createdAt || nowDateTime()),
    startedAt: String(item.startedAt || ''),
    doneAt: String(item.doneAt || '')
  };
}
function normalizeTasksState(tasks) {
  return Array.isArray(tasks) ? tasks.map(normalizeTaskItem).filter(Boolean) : [];
}
function normalizeProgressLog(item) {
  if (!item || typeof item !== 'object') return null;
  const note = String(item.note || item.title || '').trim();
  if (!note) return null;
  return {
    id: String(item.id || uid('plog')),
    date: String(item.date || dateFromDateTime(item.at) || todayStr()),
    type: String(item.type || '推进'),
    minutes: Math.max(0, Number(item.minutes) || 0),
    note,
    sourceTaskId: String(item.sourceTaskId || item.taskId || ''),
    at: String(item.at || nowDateTime())
  };
}
function normalizeProjectItem(item) {
  if (!item || item.title == null) return null;
  const title = String(item.title || '').trim();
  if (!title) return null;
  const area = PROJECT_AREAS.some(opt => opt.value === item.area) ? item.area : 'research';
  const status = PROJECT_STATUS_OPTIONS.some(opt => opt.value === item.status) ? item.status : 'active';
  return {
    id: String(item.id || uid('proj')),
    title,
    outcome: String(item.outcome || ''),
    area,
    status,
    startDate: String(item.startDate || dateFromDateTime(item.createdAt || nowDateTime()) || ''),
    deadline: String(item.deadline || ''),
    note: String(item.note || ''),
    logs: Array.isArray(item.logs) ? item.logs.map(normalizeProgressLog).filter(Boolean) : [],
    createdAt: String(item.createdAt || nowDateTime()),
    updatedAt: String(item.updatedAt || item.createdAt || nowDateTime())
  };
}
function normalizeProjectsState(projects) {
  return Array.isArray(projects) ? projects.map(normalizeProjectItem).filter(Boolean) : [];
}
function normalizeAttendance(attendance) {
  const out = {};
  if (!attendance || typeof attendance !== 'object') return out;
  for (const [date, rawDay] of Object.entries(attendance)) {
    if (!rawDay || typeof rawDay !== 'object') continue;
    const day = { logs: [], leaves: [] };
    if (Array.isArray(rawDay.logs)) {
      day.logs = rawDay.logs.map(log => ({
        id: log.id || uid('work'),
        date: log.date || date,
        start: parseHM(log.start) || parseHM(log.in) || nowTime(),
        end: parseHM(log.end) || parseHM(log.out) || null,
        note: log.note || log.notes || ''
      }));
    }
    if (!day.logs.length && rawDay.periods && typeof rawDay.periods === 'object') {
      for (const [periodName, periodData] of Object.entries(rawDay.periods)) {
        if (Array.isArray(periodData?.segments)) {
          periodData.segments.forEach((seg, idx) => {
            day.logs.push({
              id: seg.id || `legacy_${date}_${periodName}_${idx}`,
              date,
              start: parseHM(seg.start) || parseHM(seg.in) || '09:00',
              end: parseHM(seg.end) || parseHM(seg.out) || null,
              note: periodName
            });
          });
        }
        if (periodData?.activeStart) {
          day.logs.push({ id:`legacy_open_${date}_${periodName}`, date, start: parseHM(periodData.activeStart) || '09:00', end:null, note:`${periodName}（未结束）`});
        }
      }
    }
    if (Array.isArray(rawDay.leaves)) {
      day.leaves = rawDay.leaves.map(item => ({ id:item.id||uid('leave'), date:item.date||date, type:item.type||'其他' }));
    } else if (rawDay.leave) {
      if (typeof rawDay.leave === 'string') day.leaves = [{ id:uid('leave'), date, type:rawDay.leave }];
      else if (typeof rawDay.leave === 'object') day.leaves = [{ id: rawDay.leave.id||uid('leave'), date, type: rawDay.leave.type||'其他' }];
    }
    out[date] = day;
  }
  return out;
}
function normalizeReflectionMap(source) {
  const out = {};
  if (!source || typeof source !== 'object') return out;
  for (const [date, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      out[date] = value.map(item => ({ id:item.id||uid('ref'), text:item.text||item.note||'', at:item.at||item.ts||nowDateTime() }));
    } else if (typeof value === 'string') {
      out[date] = [{ id:uid('ref'), text:value, at:nowDateTime() }];
    } else if (value && typeof value === 'object' && value.text) {
      out[date] = [{ id:value.id||uid('ref'), text:value.text, at:value.at||value.ts||nowDateTime() }];
    }
  }
  return out;
}
function normalizeSubmissionItem(item) {
  if (!item || typeof item !== 'object') return null;
  const stage = SUBMISSION_COLUMNS.includes(item.stage) ? item.stage : '选题中';
  const createdAt = String(item.createdAt || item.at || nowDateTime());
  return {
    id: String(item.id || uid('sub')),
    title: String(item.title || '').trim() || '未命名项目',
    venue: String(item.venue || ''),
    deadline: String(item.deadline || ''),
    stage,
    type: String(item.type || 'Other'),
    notes: String(item.notes || ''),
    logs: Array.isArray(item.logs) ? item.logs.map(log => ({
      id: String(log.id || uid('sublog')),
      date: String(log.date || dateFromDateTime(log.at) || todayStr()),
      type: String(log.type || '推进'),
      minutes: Math.max(0, Number(log.minutes) || 0),
      note: String(log.note || log.text || ''),
      stage: String(log.stage || stage),
      at: String(log.at || log.createdAt || nowDateTime())
    })) : [],
    createdAt,
    updatedAt: String(item.updatedAt || createdAt)
  };
}
function normalizeSubmissions(source) {
  return Array.isArray(source) ? source.map(normalizeSubmissionItem).filter(Boolean) : [];
}
function defaultDailyReviewEntry() {
  return {
    energy: 'medium',
    energyNote: '',
    accomplishments: '',
    unfinished: '',
    insights: '',
    obstacles: '',
    tomorrow: ['', '', ''],
    tomorrowTaskIds: ['', '', ''],
    updatedAt: ''
  };
}
function normalizeDailyReviewEntry(raw) {
  const base = defaultDailyReviewEntry();
  if (!raw || typeof raw !== 'object') return { ...base };
  const tomorrow = Array.isArray(raw.tomorrow)
    ? raw.tomorrow.slice(0, 3).map(item => String(item || ''))
    : [
        String(raw.tomorrow1 || raw.priority1 || raw.start || ''),
        String(raw.tomorrow2 || raw.priority2 || ''),
        String(raw.tomorrow3 || raw.priority3 || '')
      ];
  while (tomorrow.length < 3) tomorrow.push('');
  const tomorrowTaskIds = Array.isArray(raw.tomorrowTaskIds) ? raw.tomorrowTaskIds.slice(0, 3).map(item => String(item || '')) : [];
  while (tomorrowTaskIds.length < 3) tomorrowTaskIds.push('');
  const energy = REVIEW_ENERGY_OPTIONS.some(item => item.value === raw.energy) ? raw.energy : base.energy;
  return {
    energy,
    energyNote: String(raw.energyNote || raw.note || ''),
    accomplishments: String(raw.accomplishments || raw.output || raw.keep || ''),
    unfinished: String(raw.unfinished || raw.delayAnalysis || raw.improve || ''),
    insights: String(raw.insights || raw.knowledge || ''),
    obstacles: String(raw.obstacles || raw.action || raw.stop || ''),
    tomorrow,
    tomorrowTaskIds,
    updatedAt: String(raw.updatedAt || raw.at || '')
  };
}
function buildLegacyReviewEntries(legacyReflections) {
  const out = {};
  if (!legacyReflections || typeof legacyReflections !== 'object') return out;
  for (const [date, items] of Object.entries(legacyReflections)) {
    if (!Array.isArray(items) || !items.length) continue;
    const latest = items[0];
    out[date] = normalizeDailyReviewEntry({
      accomplishments: latest?.text || '',
      updatedAt: latest?.at || latest?.ts || ''
    });
  }
  return out;
}
function normalizeDailyReviewState(reviewDaily, legacyReflections) {
  const merged = buildLegacyReviewEntries(legacyReflections);
  const sourceEntries = reviewDaily?.entries && typeof reviewDaily.entries === 'object' ? reviewDaily.entries : {};
  Object.entries(sourceEntries).forEach(([date, entry]) => { merged[date] = normalizeDailyReviewEntry(entry); });
  return { entries: merged };
}
function defaultMentorEntry() {
  return {
    status: 'drafting',
    channel: '',
    pressure: 3,
    clarity: 3,
    topic: '',
    evidence: '',
    ask: '',
    risk: '',
    feedback: '',
    commitment: '',
    confirmation: '',
    followupDate: '',
    promiseStatus: 'open',
    promiseTaskId: '',
    boundary: '',
    nextAction: '',
    nextActionTaskId: '',
    updatedAt: ''
  };
}
function normalizeMentorEntry(raw) {
  const base = defaultMentorEntry();
  if (!raw || typeof raw !== 'object') return { ...base };
  const status = MENTOR_STATUS_OPTIONS.some(item => item.value === raw.status) ? raw.status : base.status;
  const channelRaw = String(raw.channel || '').trim().replace(/\s*\/\s*/g, ' / ');
  const channel = MENTOR_CHANNEL_OPTIONS.includes(channelRaw) ? channelRaw : '';
  const promiseStatus = MENTOR_PROMISE_STATUS_OPTIONS.some(item => item.value === raw.promiseStatus) ? raw.promiseStatus : base.promiseStatus;
  return {
    status,
    channel,
    pressure: clamp(raw.pressure ?? raw.stress ?? 3, 1, 5),
    clarity: clamp(raw.clarity ?? 3, 1, 5),
    topic: String(raw.topic || ''),
    evidence: String(raw.evidence || raw.progress || ''),
    ask: String(raw.ask || raw.support || ''),
    risk: String(raw.risk || raw.challenge || ''),
    feedback: String(raw.feedback || raw.decision || raw.response || ''),
    commitment: String(raw.commitment || raw.promise || raw.agreement || ''),
    confirmation: String(raw.confirmation || raw.memo || raw.minutes || ''),
    followupDate: String(raw.followupDate || raw.checkDate || raw.promiseDate || ''),
    promiseStatus,
    promiseTaskId: String(raw.promiseTaskId || ''),
    boundary: String(raw.boundary || ''),
    nextAction: String(raw.nextAction || raw.next || ''),
    nextActionTaskId: String(raw.nextActionTaskId || ''),
    updatedAt: String(raw.updatedAt || raw.at || '')
  };
}
function normalizeMentorState(mentor) {
  const entries = mentor?.entries && typeof mentor.entries === 'object' ? mentor.entries : {};
  const out = {};
  Object.entries(entries).forEach(([date, entry]) => { out[date] = normalizeMentorEntry(entry); });
  return { entries: out };
}
function defaultThesisState() {
  return {
    meta: { title:'', targetDate:'', version:'', note:'' },
    milestones: [
      { id:'ms_proposal', name:'开题 / Proposal', due:'', done:false, doneAt:'', note:'' },
      { id:'ms_midterm', name:'中期检查', due:'', done:false, doneAt:'', note:'' },
      { id:'ms_predefense', name:'预答辩', due:'', done:false, doneAt:'', note:'' },
      { id:'ms_submission', name:'论文提交', due:'', done:false, doneAt:'', note:'' },
      { id:'ms_defense', name:'正式答辩', due:'', done:false, doneAt:'', note:'' }
    ],
    chapters: [
      { id:'ch_intro', name:'引言 / Introduction', progress:0, status:'draft', updatedAt:'', note:'' },
      { id:'ch_related', name:'相关工作 / Related Work', progress:0, status:'draft', updatedAt:'', note:'' },
      { id:'ch_method', name:'方法 / Method', progress:0, status:'draft', updatedAt:'', note:'' },
      { id:'ch_exp', name:'实验 / Experiments', progress:0, status:'draft', updatedAt:'', note:'' },
      { id:'ch_conc', name:'结论 / Conclusion', progress:0, status:'draft', updatedAt:'', note:'' }
    ],
    logs: []
  };
}
function normalizeThesisState(thesis) {
  const def = defaultThesisState();
  if (!thesis || typeof thesis !== 'object') return def;
  const metaRaw = thesis.meta && typeof thesis.meta === 'object' ? thesis.meta : {};
  const meta = {
    title: String(metaRaw.title || ''),
    targetDate: String(metaRaw.targetDate || ''),
    version: String(metaRaw.version || ''),
    note: String(metaRaw.note || '')
  };
  const milestones = Array.isArray(thesis.milestones)
    ? thesis.milestones.map(item => ({
      id: String(item?.id || uid('ms')),
      name: String(item?.name || '未命名里程碑'),
      due: String(item?.due || ''),
      done: !!item?.done,
      doneAt: String(item?.doneAt || ''),
      note: String(item?.note || '')
    }))
    : def.milestones.map(v => ({ ...v }));
  const chapters = Array.isArray(thesis.chapters)
    ? thesis.chapters.map(item => ({
      id: String(item?.id || uid('ch')),
      name: String(item?.name || '未命名章节'),
      progress: Math.max(0, Math.min(100, Number(item?.progress) || 0)),
      status: ['draft','revise','done'].includes(item?.status) ? item.status : 'draft',
      updatedAt: String(item?.updatedAt || ''),
      note: String(item?.note || '')
    }))
    : def.chapters.map(v => ({ ...v }));
  const logs = Array.isArray(thesis.logs)
    ? thesis.logs.map(item => ({
      id: String(item?.id || uid('thlog')),
      date: String(item?.date || todayStr()),
      type: ['writing','revise','experiment','meeting','other'].includes(item?.type) ? item.type : 'other',
      minutes: Math.max(0, Number(item?.minutes) || 0),
      words: Math.max(0, Number(item?.words) || 0),
      note: String(item?.note || ''),
      at: String(item?.at || item?.ts || nowDateTime())
    }))
    : [];
  return { meta, milestones, chapters, logs };
}


/* Accounting data compatibility and cleanup. */
function accountingCategoriesForType(type='expense') {
  return type === 'income' ? ACCOUNTING_INCOME_CATEGORIES : ACCOUNTING_EXPENSE_CATEGORIES;
}
function normalizeAccountingTransaction(item) {
  if (!item || typeof item !== 'object') return null;
  const type = item.type === 'income' ? 'income' : 'expense';
  const amount = Math.abs(Number(item.amount) || 0);
  if (!amount) return null;
  const categories = accountingCategoriesForType(type);
  const category = categories.some(entry => entry.value === item.category)
    ? String(item.category)
    : categories[categories.length - 1].value;
  const account = ACCOUNTING_ACCOUNTS.some(entry => entry.value === item.account)
    ? String(item.account)
    : 'bank';
  return {
    id: String(item.id || uid('money')),
    type,
    amount: Math.round(amount * 100) / 100,
    category,
    account,
    date: String(item.date || dateFromDateTime(item.createdAt || item.at) || todayStr()),
    note: String(item.note || item.description || item.title || ''),
    createdAt: String(item.createdAt || item.at || nowDateTime()),
    updatedAt: String(item.updatedAt || item.createdAt || item.at || nowDateTime())
  };
}
function normalizeAccountingBudget(item) {
  const source = item && typeof item === 'object' ? item : {};
  const categories = {};
  if (source.categories && typeof source.categories === 'object') {
    Object.entries(source.categories).forEach(([key, value]) => {
      if (!ACCOUNTING_EXPENSE_CATEGORIES.some(entry => entry.value === key)) return;
      const amount = Math.max(0, Number(value) || 0);
      if (amount > 0) categories[key] = Math.round(amount * 100) / 100;
    });
  }
  return {
    total: Math.max(0, Math.round((Number(source.total) || 0) * 100) / 100),
    categories
  };
}
function normalizeAccountingState(accounting) {
  const source = accounting && typeof accounting === 'object' ? accounting : {};
  const budgets = {};
  if (source.budgets && typeof source.budgets === 'object') {
    Object.entries(source.budgets).forEach(([month, value]) => {
      if (!/^\d{4}-\d{2}$/.test(month)) return;
      budgets[month] = normalizeAccountingBudget(value);
    });
  }
  const currency = ACCOUNTING_CURRENCIES.some(item => item.value === source.settings?.currency)
    ? source.settings.currency
    : 'CNY';
  return {
    transactions: Array.isArray(source.transactions)
      ? source.transactions.map(normalizeAccountingTransaction).filter(Boolean)
      : [],
    budgets,
    settings: { currency }
  };
}


/* Savings planning data compatibility and cleanup. */
function normalizeSavingsGoal(item) {
  if (!item || typeof item !== 'object') return null;
  const title = String(item.title || item.name || '').trim();
  const targetAmount = Math.max(0, Number(item.targetAmount ?? item.target ?? 0) || 0);
  if (!title || targetAmount <= 0) return null;
  const category = SAVINGS_GOAL_CATEGORIES.some(entry => entry.value === item.category)
    ? String(item.category)
    : 'other';
  const priority = SAVINGS_GOAL_PRIORITIES.some(entry => entry.value === item.priority)
    ? String(item.priority)
    : 'medium';
  const status = SAVINGS_GOAL_STATUSES.some(entry => entry.value === item.status)
    ? String(item.status)
    : 'active';
  const defaultIcon = SAVINGS_GOAL_CATEGORIES.find(entry => entry.value === category)?.icon || '🌟';
  return {
    id: String(item.id || uid('savegoal')),
    title,
    icon: String(item.icon || item.emoji || defaultIcon).trim() || defaultIcon,
    category,
    targetAmount: Math.round(targetAmount * 100) / 100,
    initialAmount: Math.max(0, Math.round((Number(item.initialAmount ?? item.currentAmount ?? item.savedAmount ?? 0) || 0) * 100) / 100),
    startDate: String(item.startDate || dateFromDateTime(item.createdAt) || todayStr()),
    targetDate: String(item.targetDate || item.deadline || ''),
    priority,
    status,
    note: String(item.note || item.description || ''),
    createdAt: String(item.createdAt || nowDateTime()),
    updatedAt: String(item.updatedAt || item.createdAt || nowDateTime()),
    completedAt: String(item.completedAt || '')
  };
}
function normalizeSavingsEntry(item) {
  if (!item || typeof item !== 'object') return null;
  const goalId = String(item.goalId || '').trim();
  const amount = Math.max(0, Number(item.amount) || 0);
  if (!goalId || amount <= 0) return null;
  const type = item.type === 'withdrawal' ? 'withdrawal' : 'deposit';
  return {
    id: String(item.id || uid('saveentry')),
    goalId,
    type,
    amount: Math.round(amount * 100) / 100,
    date: String(item.date || dateFromDateTime(item.createdAt || item.at) || todayStr()),
    note: String(item.note || item.description || ''),
    createdAt: String(item.createdAt || item.at || nowDateTime()),
    updatedAt: String(item.updatedAt || item.createdAt || item.at || nowDateTime())
  };
}
function normalizeSavingsState(savings) {
  const source = savings && typeof savings === 'object' ? savings : {};
  const goals = Array.isArray(source.goals)
    ? source.goals.map(normalizeSavingsGoal).filter(Boolean)
    : [];
  const goalIds = new Set(goals.map(goal => goal.id));
  const entries = Array.isArray(source.entries)
    ? source.entries.map(normalizeSavingsEntry).filter(entry => entry && goalIds.has(entry.goalId))
    : [];
  return { goals, entries };
}


/* Research idea data compatibility and cleanup. */
function normalizeResearchIdeaSource(item) {
  if (!item || typeof item !== 'object') return null;
  const title = String(item.title || item.name || '').trim();
  const detail = String(item.detail || item.note || item.description || '').trim();
  const url = String(item.url || item.link || '').trim();
  if (!title && !detail && !url) return null;
  const type = RESEARCH_IDEA_SOURCE_TYPES.some(entry => entry.value === item.type)
    ? String(item.type)
    : 'other';
  return {
    id: String(item.id || uid('ideasrc')),
    type,
    title,
    detail,
    url,
    date: String(item.date || dateFromDateTime(item.createdAt || item.at) || todayStr()),
    createdAt: String(item.createdAt || item.at || nowDateTime()),
    updatedAt: String(item.updatedAt || item.createdAt || item.at || nowDateTime())
  };
}
function normalizeResearchIdeaReference(item) {
  if (!item || typeof item !== 'object') return null;
  const title = String(item.title || item.name || '').trim();
  if (!title) return null;
  const type = RESEARCH_IDEA_REFERENCE_TYPES.some(entry => entry.value === item.type)
    ? String(item.type)
    : 'paper';
  return {
    id: String(item.id || uid('idearef')),
    type,
    title,
    authors: String(item.authors || item.author || ''),
    year: String(item.year || ''),
    venue: String(item.venue || item.publisher || ''),
    doi: String(item.doi || ''),
    url: String(item.url || item.link || ''),
    note: String(item.note || item.relevance || ''),
    createdAt: String(item.createdAt || item.at || nowDateTime()),
    updatedAt: String(item.updatedAt || item.createdAt || item.at || nowDateTime())
  };
}
function normalizeResearchIdea(item) {
  if (!item || typeof item !== 'object') return null;
  const title = String(item.title || item.name || '').trim();
  if (!title) return null;
  const area = RESEARCH_IDEA_AREAS.some(entry => entry.value === item.area)
    ? String(item.area)
    : 'other';
  const status = RESEARCH_IDEA_STATUSES.some(entry => entry.value === item.status)
    ? String(item.status)
    : 'captured';
  const priority = RESEARCH_IDEA_PRIORITIES.some(entry => entry.value === item.priority)
    ? String(item.priority)
    : 'medium';
  const tags = Array.isArray(item.tags)
    ? item.tags.map(tag => String(tag || '').trim()).filter(Boolean)
    : String(item.tags || '').split(/[,，;；]/).map(tag => tag.trim()).filter(Boolean);
  let sources = Array.isArray(item.sources)
    ? item.sources.map(normalizeResearchIdeaSource).filter(Boolean)
    : [];
  if (!sources.length && (item.sourceTitle || item.sourceDetail || item.sourceUrl)) {
    const legacySource = normalizeResearchIdeaSource({
      type: item.sourceType,
      title: item.sourceTitle,
      detail: item.sourceDetail,
      url: item.sourceUrl,
      date: item.sourceDate,
      createdAt: item.createdAt
    });
    if (legacySource) sources.push(legacySource);
  }
  const references = Array.isArray(item.references)
    ? item.references.map(normalizeResearchIdeaReference).filter(Boolean)
    : [];
  return {
    id: String(item.id || uid('idea')),
    title,
    area,
    status,
    priority,
    tags: [...new Set(tags)].slice(0, 20),
    problem: String(item.problem || item.question || ''),
    insight: String(item.insight || item.idea || item.summary || ''),
    method: String(item.method || item.approach || ''),
    expectedValue: String(item.expectedValue || item.value || item.contribution || ''),
    nextStep: String(item.nextStep || item.action || ''),
    projectId: String(item.projectId || ''),
    validationTaskId: String(item.validationTaskId || item.taskId || ''),
    sources,
    references,
    createdAt: String(item.createdAt || nowDateTime()),
    updatedAt: String(item.updatedAt || item.createdAt || nowDateTime()),
    archivedAt: String(item.archivedAt || '')
  };
}
function normalizeResearchIdeasState(researchIdeas) {
  const source = Array.isArray(researchIdeas)
    ? { ideas: researchIdeas }
    : (researchIdeas && typeof researchIdeas === 'object' ? researchIdeas : {});
  return {
    ideas: Array.isArray(source.ideas)
      ? source.ideas.map(normalizeResearchIdea).filter(Boolean)
      : []
  };
}
