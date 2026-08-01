/**
 * Supervisor communication and follow-up
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: mentorStatusMeta, mentorPromiseStatusMeta, mentorPendingItems, mentorOverdueCount, ensureMentorEntryTask, ensureMentorPromiseTaskForDate, updateMentorPromiseStatus, saveMentorEntry, deleteMentorEntry, renderMentorThemeStats, renderMentor
 */
'use strict';

function mentorStatusMeta(status) {
      return MENTOR_STATUS_OPTIONS.find(item => item.value === status) || MENTOR_STATUS_OPTIONS[0];
    }

function mentorPromiseStatusMeta(status) {
      return MENTOR_PROMISE_STATUS_OPTIONS.find(item => item.value === status) || MENTOR_PROMISE_STATUS_OPTIONS[0];
    }

function mentorPendingItems(baseDate=todayStr()) {
      return Object.entries(state.mentor?.entries || {})
        .map(([date]) => ({ date, entry: mentorEntryOn(date) }))
        .filter(item => item.entry.commitment.trim() && item.entry.promiseStatus !== 'resolved')
        .sort((a, b) => (a.entry.followupDate || '9999-99-99').localeCompare(b.entry.followupDate || '9999-99-99') || b.date.localeCompare(a.date));
    }

function mentorOverdueCount(baseDate=todayStr()) {
      return mentorPendingItems(baseDate).filter(item => item.entry.followupDate && item.entry.followupDate < baseDate).length;
    }

function ensureMentorEntryTask(date, entry, kind='nextAction') {
      const text = kind === 'promise' ? entry.commitment : entry.nextAction;
      if (!String(text || '').trim()) return null;
      const project = ensureWorkflowModuleProject('mentor', false);
      const taskKey = kind === 'promise' ? 'promiseTaskId' : 'nextActionTaskId';
      const dueDate = entry.followupDate || shiftDate(date, 1);
      let task = state.tasks.find(item => item.id === entry[taskKey]);
      if (task?.status === 'done') return task;
      const titlePrefix = kind === 'promise' ? '跟进导师承诺' : '导师跟进';
      const title = `${titlePrefix}：${String(text).slice(0, 48)}`;
      const patch = {
        title,
        projectId: project.id,
        gtdBucket: 'next',
        quadrant: dueDate && dueDate <= todayStr() ? 'q1' : 'q2',
        todayBucket: dueDate === todayStr() ? 'should' : '',
        dueDate,
        estimate: 25,
        context: '沟通',
        note: `mentor:${date}:${kind}`
      };
      if (task) {
        Object.assign(task, patch);
      } else {
        task = createTask({ ...patch, status:'planned' });
        entry[taskKey] = task?.id || '';
      }
      return task;
    }

function ensureMentorPromiseTaskForDate(date) {
      const entry = mentorEntryOn(date);
      const task = ensureMentorEntryTask(date, entry, 'promise');
      state.mentor.entries[date] = normalizeMentorEntry(entry);
      saveState();
      renderAll();
      return task;
    }

function updateMentorPromiseStatus(date, status) {
      const entry = mentorEntryOn(date);
      entry.promiseStatus = mentorPromiseStatusMeta(status).value;
      entry.updatedAt = nowDateTime();
      if (entry.promiseStatus === 'resolved' && entry.promiseTaskId) {
        const task = state.tasks.find(item => item.id === entry.promiseTaskId);
        if (task && task.status !== 'done') finishTask(task.id);
      }
      state.mentor.entries[date] = normalizeMentorEntry(entry);
      saveState();
      renderAll();
    }

function saveMentorEntry() {
      const date = $('mentorDate').value || todayStr();
      const existing = mentorEntryOn(date);
      const nextEntry = normalizeMentorEntry({
        status: $('mentorStatus').value,
        channel: $('mentorChannel').value,
        pressure: Number($('mentorPressure').value || 3),
        clarity: Number($('mentorClarity').value || 3),
        topic: $('mentorTopic').value.trim(),
        evidence: $('mentorEvidence').value.trim(),
        ask: $('mentorAsk').value.trim(),
        risk: $('mentorRisk').value.trim(),
        feedback: $('mentorFeedback').value.trim(),
        commitment: $('mentorCommitment').value.trim(),
        confirmation: $('mentorConfirmation').value.trim(),
        followupDate: $('mentorFollowupDate').value || '',
        promiseStatus: $('mentorPromiseStatus').value || 'open',
        promiseTaskId: existing.promiseTaskId || '',
        boundary: $('mentorBoundary').value.trim(),
        nextAction: $('mentorNextAction').value.trim(),
        nextActionTaskId: existing.nextActionTaskId || '',
        updatedAt: nowDateTime()
      });
      if (nextEntry.nextAction.trim()) ensureMentorEntryTask(date, nextEntry, 'nextAction');
      state.mentor.entries[date] = nextEntry;
      saveState();
      renderAll();
    }

function deleteMentorEntry(date = $('mentorDate').value || todayStr()) {
      delete state.mentor.entries[date];
      saveState();
      renderAll();
    }

function renderMentorThemeStats() {
      const baseDate = $('mentorDate').value || todayStr();
      const range = getStatsRange(baseDate);
      if ($('mentorStatsRangeLabel')) $('mentorStatsRangeLabel').textContent = range.label;
      const entries = range.dates.map(date => ({ date, entry: mentorEntryOn(date) })).filter(item => mentorCountOn(item.date));
      const count = entries.length;
      const avgPressure = count ? (entries.reduce((sum, item) => sum + item.entry.pressure, 0) / count).toFixed(1) : '0.0';
      const avgClarity = count ? (entries.reduce((sum, item) => sum + item.entry.clarity, 0) / count).toFixed(1) : '0.0';
      const waitingCount = entries.filter(item => item.entry.status === 'waiting').length;
      const clearAskCount = entries.filter(item => item.entry.ask.trim()).length;
      const blockedCount = entries.filter(item => item.entry.status === 'blocked' || item.entry.pressure >= 4).length;
      const promiseCount = entries.filter(item => item.entry.commitment.trim()).length;
      const remindCount = entries.filter(item => item.entry.promiseStatus === 'remind').length;
      const overdueCount = entries.filter(item => item.entry.commitment.trim() && item.entry.promiseStatus !== 'resolved' && item.entry.followupDate && item.entry.followupDate < baseDate).length;
      const cards = [
        { label:`${statsModeText(baseDate)}有记录天数`, value: `${count}/${Math.max(1, range.dates.length)}`, color:'text-dopamine-purple' },
        { label:`${statsModeText(baseDate)}平均压力`, value: `${avgPressure}/5`, color:'text-dopamine-pink' },
        { label:`${statsModeText(baseDate)}预期清晰度`, value: `${avgClarity}/5`, color:'text-dopamine-sky' },
        { label:`${statsModeText(baseDate)}等待反馈`, value: waitingCount, color:'text-dopamine-yellow' },
        { label:`${statsModeText(baseDate)}明确请求`, value: clearAskCount, color:'text-dopamine-mint' },
        { label:`${statsModeText(baseDate)}高压 / 需推进`, value: blockedCount, color:'text-dopamine-orange' },
        { label:`${statsModeText(baseDate)}承诺留痕`, value: promiseCount, color:'text-dopamine-purple' },
        { label:`${statsModeText(baseDate)}待提醒 / 已超期`, value: `${remindCount} / ${overdueCount}`, color:'text-rose-600' }
      ];
      $('mentorThemeStats').innerHTML = cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

function renderMentor() {
      const date = $('mentorDate').value || todayStr();
      const entry = mentorEntryOn(date);
      setInputIfIdle('mentorStatus', entry.status || 'drafting');
      setInputIfIdle('mentorChannel', entry.channel || '');
      setInputIfIdle('mentorPressure', String(entry.pressure || 3));
      setInputIfIdle('mentorClarity', String(entry.clarity || 3));
      setInputIfIdle('mentorTopic', entry.topic || '');
      setInputIfIdle('mentorEvidence', entry.evidence || '');
      setInputIfIdle('mentorAsk', entry.ask || '');
      setInputIfIdle('mentorRisk', entry.risk || '');
      setInputIfIdle('mentorFeedback', entry.feedback || '');
      setInputIfIdle('mentorCommitment', entry.commitment || '');
      setInputIfIdle('mentorConfirmation', entry.confirmation || '');
      setInputIfIdle('mentorFollowupDate', entry.followupDate || '');
      setInputIfIdle('mentorPromiseStatus', entry.promiseStatus || 'open');
      setInputIfIdle('mentorBoundary', entry.boundary || '');
      setInputIfIdle('mentorNextAction', entry.nextAction || '');

      const status = mentorStatusMeta(entry.status);
      const promiseStatus = mentorPromiseStatusMeta(entry.promiseStatus);
      const pendingPromises = mentorPendingItems(date);
      const pressureHint = entry.pressure >= 4
        ? '先把问题收束成 1-2 个明确请求，再决定要不要立刻沟通。'
        : entry.clarity >= 4
          ? '今天适合把准备好的材料和问题一起发出去，减少来回试探。'
          : '先整理你的证据和问题，比反复猜导师在想什么更有帮助。';
      $('mentorSummary').innerHTML = mentorCountOn(date) ? `
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="font-black">${status.emoji} ${status.label}</div>
          <div class="text-sm text-calm-mute mt-1">压力 ${entry.pressure}/5 · 清晰度 ${entry.clarity}/5${entry.channel ? ` · ${escapeHtml(entry.channel)}` : ''}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="font-black mb-1">今天最值得守住的一点</div>
          <div class="text-sm leading-6">${escapeHtml(pressureHint)}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">我要问导师什么</div>
          <div class="font-bold mt-1">${escapeHtml(entry.ask || '还没有写下明确请求。')}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">导师反馈 / 决策</div>
          <div class="font-bold mt-1">${escapeHtml(entry.feedback || '还没有记录导师这次的反馈。')}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">导师承诺 / 计划追踪</div>
          <div class="font-bold mt-1">${escapeHtml(entry.commitment || '今天还没有记录导师说过的话。')}</div>
          <div class="text-xs text-calm-mute mt-2">${escapeHtml(promiseStatus.label)}${entry.followupDate ? ` · 下次核对 ${entry.followupDate}` : ''}</div>
        </div>
        <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
          <div class="text-sm text-calm-mute">下一步动作</div>
          <div class="font-bold mt-1">${escapeHtml(entry.nextAction || '还没有写下下一步。')}</div>
          <div class="text-xs text-calm-mute mt-2">${entry.nextActionTaskId ? '已加入任务总表' : '保存下一步动作后会自动加入任务总表'}</div>
        </div>
      ` : '<div class="text-sm text-calm-mute">今天还没有记录导师沟通。先写下你准备了什么、想问什么，以及下一步跟进动作吧。</div>';

      $('mentorPromiseList').innerHTML = pendingPromises.slice(0, 8).map(item => {
        const meta = mentorPromiseStatusMeta(item.entry.promiseStatus);
        const overdue = item.entry.followupDate && item.entry.followupDate < date;
        return `
          <div class="rounded-2xl border border-calm-line bg-white px-3 py-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold">${dayLabel(item.date)}</div>
              <div class="text-sm mt-1 leading-6">${escapeHtml(item.entry.commitment)}</div>
              <div class="text-xs text-calm-mute mt-2">${escapeHtml(meta.label)}${item.entry.followupDate ? ` · 核对 ${item.entry.followupDate}` : ''}${overdue ? ' · 已超期' : ''}${item.entry.promiseTaskId ? ' · 已加入任务' : ''}</div>
              <div class="flex flex-wrap gap-2 mt-3">
                <button class="px-2 py-1 rounded-xl bg-sky-50 text-dopamine-sky text-xs font-bold" data-mentor-promise-task="${item.date}">${item.entry.promiseTaskId ? '更新任务' : '加入任务'}</button>
                <button class="px-2 py-1 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold" data-mentor-promise-status="${item.date}" data-status="remind">需提醒</button>
                <button class="px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold" data-mentor-promise-status="${item.date}" data-status="resolved">已落实</button>
              </div>
            </div>
            <button class="text-sm font-bold text-dopamine-orange shrink-0" data-mentor-promise-jump="${item.date}">查看</button>
          </div>`;
      }).join('') || '<div class="text-sm text-calm-mute">目前没有待追踪承诺。把导师的口头计划和你的复述确认记下来，会轻松很多。</div>';

      $('mentorHistoryList').innerHTML = recentDates(7).map(d => {
        const item = mentorEntryOn(d);
        const hasRecord = mentorCountOn(d);
        const itemStatus = mentorStatusMeta(item.status);
        return `
          <div class="rounded-2xl border border-calm-line bg-white px-3 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold">${dayLabel(d)}</div>
              <div class="text-xs text-calm-mute mt-1">${hasRecord ? `${itemStatus.emoji} ${itemStatus.label} · 压力 ${item.pressure}/5 · 清晰度 ${item.clarity}/5${item.commitment ? ' · 有承诺留痕' : ''}` : '未记录'}</div>
            </div>
            <div class="flex gap-2 shrink-0">
              <button class="text-sm font-bold text-dopamine-orange" data-mentor-jump="${d}">查看</button>
              ${hasRecord ? `<button class="text-sm font-bold text-rose-600" data-mentor-delete="${d}">删除</button>` : ''}
            </div>
          </div>`;
      }).join('');
      $('mentorPromiseList').querySelectorAll('[data-mentor-promise-jump]').forEach(btn => btn.onclick = () => { $('mentorDate').value = btn.dataset.mentorPromiseJump; navTo('mentor-section'); renderAll(); });
      $('mentorPromiseList').querySelectorAll('[data-mentor-promise-task]').forEach(btn => btn.onclick = () => ensureMentorPromiseTaskForDate(btn.dataset.mentorPromiseTask));
      $('mentorPromiseList').querySelectorAll('[data-mentor-promise-status]').forEach(btn => btn.onclick = () => updateMentorPromiseStatus(btn.dataset.mentorPromiseStatus, btn.dataset.status));
      $('mentorHistoryList').querySelectorAll('[data-mentor-jump]').forEach(btn => btn.onclick = () => { $('mentorDate').value = btn.dataset.mentorJump; navTo('mentor-section'); renderAll(); });
      $('mentorHistoryList').querySelectorAll('[data-mentor-delete]').forEach(btn => btn.onclick = () => { if (confirm('确定删除这天的导师沟通记录吗？')) deleteMentorEntry(btn.dataset.mentorDelete); });
    }
