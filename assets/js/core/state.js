/**
 * State normalization, localStorage and shared selectors
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: deepClone, normalizeTaskItem, normalizeTasksState, normalizeProgressLog, normalizeProjectItem, normalizeProjectsState, normalizeHabitItem, normalizeAttendance, normalizeMoodMap, normalizeReflectionMap, normalizeSubmissionItem, normalizeSubmissions, legacyMoodToCareMood, defaultCareEntry, normalizeCareEntry, buildLegacyCareEntries, normalizeCareState, defaultDailyReviewEntry, normalizeDailyReviewEntry, buildLegacyReviewEntries, normalizeDailyReviewState, defaultMentorEntry, normalizeMentorEntry, normalizeMentorState, normalizeHabitsState, defaultThesisState, normalizeThesisState, loadState, saveState, getDayAttendance, getDayTimeBlocks, getHabitEntryMap, projectById, careEntryOn, mentorEntryOn, dailyReviewEntryOn, activeTask, taskOpen, openTasksList, tasksForProject, nextActionTasks, focusMinutesOn, reviewPriorityCount, reviewTemplateCount, reviewContentCount, careCountOn, mentorCountOn, reviewCountOn, supportPageCountOn, moodCountOn, runningSubmissionCount, totalAttendanceMinutes, todayOpenLogs, ensureTaskCleanup, normalizeCheckboxEntry, normalizeTextEntry, normalizeCountEntry, normalizeTimeEntry, normalizeDurationEntry
 */
'use strict';

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

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

function normalizeHabitItem(item) {
      if (!item || !item.id) return null;
      const id = String(item.id);
      const name = item.name != null ? String(item.name).trim() : '';
      if (!name) return null;
      const icon = String(item.icon || '✅');
      const rawMode = String(item.mode || 'checkbox');
      let mode = rawMode;
      // Backward compatibility.
      if (mode === 'sleep' || mode === 'wake') mode = 'time';
      if (id === 'habit_early_sleep' || id === 'habit_early_wake') mode = 'time';
      if (id === 'habit_exercise') mode = 'duration';
      if (!['time','duration','checkbox','text','count','food'].includes(mode)) mode = 'checkbox';
      const enabled = item.enabled !== false;
      return { id, name, icon, mode, enabled, locked: !!item.locked };
    }

function normalizeAttendance(attendance) {
      const out = {};
      if (!attendance || typeof attendance !== 'object') return out;
      for (const [date, rawDay] of Object.entries(attendance)) {
        if (!rawDay || typeof rawDay !== 'object') continue;
        const day = { wake: rawDay.wake || null, sleep: rawDay.sleep || null, logs: [], leaves: [] };
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

function normalizeMoodMap(source) {
      const out = {};
      if (!source || typeof source !== 'object') return out;
      for (const [date, value] of Object.entries(source)) {
        if (Array.isArray(value)) {
          out[date] = value.map(item => ({ id:item.id||uid('mood'), mood:item.mood||item.emoji||'😊', note:item.note||'', at:item.at||item.ts||nowDateTime() }));
        } else if (value && typeof value === 'object') {
          out[date] = [{ id:value.id||uid('mood'), mood:value.mood||value.emoji||'😊', note:value.note||'', at:value.at||value.ts||nowDateTime() }];
        }
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

function legacyMoodToCareMood(rawMood) {
      const mood = String(rawMood || '');
      if (['😭','😣'].includes(mood)) return 'overloaded';
      if (['😕'].includes(mood)) return 'tense';
      if (['🙂'].includes(mood)) return 'lighter';
      if (['😊'].includes(mood)) return 'energized';
      return 'steady';
    }

function defaultCareEntry() {
      return {
        mood: 'steady',
        stress: 3,
        energy: 3,
        challenge: '',
        selfCare: '',
        gratitude: '',
        support: '',
        note: '',
        updatedAt: ''
      };
    }

function normalizeCareEntry(raw) {
      const base = defaultCareEntry();
      if (!raw || typeof raw !== 'object') return { ...base };
      const mood = CARE_MOOD_OPTIONS.some(item => item.value === raw.mood) ? raw.mood : base.mood;
      return {
        mood,
        stress: clamp(raw.stress ?? 3, 1, 5),
        energy: clamp(raw.energy ?? 3, 1, 5),
        challenge: String(raw.challenge || raw.trigger || ''),
        selfCare: String(raw.selfCare || raw.relief || ''),
        gratitude: String(raw.gratitude || ''),
        support: String(raw.support || ''),
        note: String(raw.note || raw.compassion || ''),
        updatedAt: String(raw.updatedAt || raw.at || '')
      };
    }

function buildLegacyCareEntries(legacyMood) {
      const out = {};
      if (!legacyMood || typeof legacyMood !== 'object') return out;
      for (const [date, items] of Object.entries(legacyMood)) {
        if (!Array.isArray(items) || !items.length) continue;
        const latest = items[0];
        out[date] = normalizeCareEntry({
          mood: legacyMoodToCareMood(latest?.mood || latest?.emoji),
          note: latest?.note || '',
          updatedAt: latest?.at || latest?.ts || ''
        });
      }
      return out;
    }

function normalizeCareState(care, legacyMood) {
      const merged = buildLegacyCareEntries(legacyMood);
      const sourceEntries = care?.entries && typeof care.entries === 'object' ? care.entries : {};
      Object.entries(sourceEntries).forEach(([date, entry]) => { merged[date] = normalizeCareEntry(entry); });
      return { entries: merged };
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

function normalizeHabitsState(habits) {
      const sourceList = Array.isArray(habits?.list) ? habits.list : [];
      const defaultIds = new Set(DEFAULT_HABITS.map(h => h.id));
      const defaultOverrides = new Map();
      const customs = [];
      const used = new Set();
      sourceList.forEach(item => {
        const clean = normalizeHabitItem(item);
        if (!clean) return;
        if (LEGACY_REMOVED_HABITS.has(clean.id)) return;
        if (defaultIds.has(clean.id)) { defaultOverrides.set(clean.id, clean); used.add(clean.id); return; }
        if (used.has(clean.id)) return;
        customs.push(clean);
        used.add(clean.id);
      });
      return {
        list: [
          ...DEFAULT_HABITS.map(def => {
            const ov = defaultOverrides.get(def.id);
            return ov ? { ...def, ...ov, locked:false } : { ...def };
          }),
          ...customs
        ],
        logs: habits?.logs && typeof habits.logs === 'object' ? habits.logs : {},
        entries: habits?.entries && typeof habits.entries === 'object' ? habits.entries : {}
      };
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
          thesis: defaultThesisState()
        };
      }
    }

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

function runningSubmissionCount() { return state.submissions.filter(s => !['已接收','已见刊/已收录','搁置/拒稿'].includes(s.stage)).length; }

function totalAttendanceMinutes(date=todayStr()) { return (state.attendance[date]?.logs || []).reduce((sum,log)=>sum + (log.end ? minutesBetween(log.start, log.end) : 0), 0); }

function todayOpenLogs(date=todayStr()) { return getDayAttendance(date).logs.filter(log => !log.end); }

function ensureTaskCleanup() {
      state.tasks = normalizeTasksState(state.tasks);
      state.projects = normalizeProjectsState(state.projects);
    }

function normalizeCheckboxEntry(raw) {
      if (!raw || typeof raw !== 'object') return { done:false, note:'' };
      return { done: !!raw.done, note: String(raw.note || '') };
    }

function normalizeTextEntry(raw) {
      if (!raw || typeof raw !== 'object') return { text:'' };
      return { text: String(raw.text || '') };
    }

function normalizeCountEntry(raw) {
      if (!raw || typeof raw !== 'object') return { count:0, note:'' };
      return { count: Math.max(0, Number(raw.count) || 0), note: String(raw.note || '') };
    }

function normalizeTimeEntry(raw) {
      if (!raw || typeof raw !== 'object') return { time:'', note:'' };
      return { time: parseHM(raw.time) || '', note: String(raw.note || '') };
    }

function normalizeDurationEntry(raw) {
      if (!raw || typeof raw !== 'object') return { minutes:0, type:'', intensity:'', note:'', done:false };
      const minutes = Math.max(0, Number(raw.minutes ?? raw.mins ?? raw.min ?? 0) || 0);
      const type = String(raw.type || raw.sport || '');
      const intensity = String(raw.intensity || '');
      const note = String(raw.note || raw.notes || '');
      const done = raw.done === true || minutes > 0;
      return { minutes, type, intensity, note, done };
    }
