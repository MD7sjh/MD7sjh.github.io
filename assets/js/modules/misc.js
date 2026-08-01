/**
 * Shared compatibility functions not tied to a single page
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: closeAllOpenLogs, addUniqueProgressLog, getDurationEntry, setDurationEntry, buildDailyDigest, collectEditValues
 */
'use strict';

function closeAllOpenLogs() {
      const now = nowTime();
      todayOpenLogs().forEach(log => { log.end = now; });
      saveState(); renderAll();
    }

function addUniqueProgressLog(list, sourceTaskId, payload) {
      if (!Array.isArray(list) || !sourceTaskId) return false;
      if (list.some(item => item.sourceTaskId === sourceTaskId)) return false;
      list.unshift({ id: uid('plog'), sourceTaskId, at: nowDateTime(), ...payload });
      return true;
    }

function getDurationEntry(date, habitId) {
      return normalizeDurationEntry(state.habits?.entries?.[date]?.[habitId]);
    }

function setDurationEntry(date, habitId, patch) {
      const map = getHabitEntryMap(date);
      map[habitId] = { ...getDurationEntry(date, habitId), ...patch };
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

function collectEditValues() {
      const vals = {};
      $('editDialogBody').querySelectorAll('[data-edit-field]').forEach(el => vals[el.dataset.editField] = el.value);
      return vals;
    }
