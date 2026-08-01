/**
 * Submission pipeline and progress logs
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: submissionForCompletedTask, nearestSubmissionDeadline, submissionProjectNote, submissionProjectStatus, syncSubmissionProject, syncAllSubmissionProjects, submissionStatsData, renderSubmissionStats, addSubmission, renderSubmissionBoard, advanceSubmission, addSubmissionLog, renderSubmissionLogs, downloadSubmissionMarkdown
 */
'use strict';

function submissionForCompletedTask(task, project) {
      const note = String(project?.note || '');
      if (note.startsWith('submission:')) return state.submissions.find(item => submissionProjectNote(item.id) === note) || null;
      if (note === 'module:submission') {
        return state.submissions.find(item => task.title.includes(item.title)) || null;
      }
      return null;
    }

function nearestSubmissionDeadline() {
      return state.submissions
        .filter(item => !['已接收','已见刊/已收录','搁置/拒稿'].includes(item.stage) && item.deadline)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))[0]?.deadline || '';
    }

function submissionProjectNote(id) { return `submission:${id}`; }

function submissionProjectStatus(item) {
      if (['已接收','已见刊/已收录'].includes(item.stage)) return 'done';
      if (['搁置/拒稿'].includes(item.stage)) return 'paused';
      return 'active';
    }

function syncSubmissionProject(item) {
      if (!item) return null;
      const note = submissionProjectNote(item.id);
      let project = state.projects.find(project => project.note === note);
      const patch = {
        title: item.title,
        outcome: `${item.stage}${item.venue ? ` · ${item.venue}` : ''}${item.notes ? ` · ${item.notes}` : ''}`,
        area: 'submission',
        status: submissionProjectStatus(item),
        startDate: item.startDate || dateFromDateTime(item.createdAt) || todayStr(),
        deadline: item.deadline || '',
        note,
        updatedAt: item.updatedAt || nowDateTime()
      };
      if (project) {
        Object.assign(project, patch);
      } else {
        project = normalizeProjectItem({
          id: uid('proj'),
          ...patch,
          createdAt: item.createdAt || nowDateTime()
        });
        state.projects.unshift(project);
      }
      return project;
    }

function syncAllSubmissionProjects() {
      state.submissions.forEach(item => syncSubmissionProject(item));
    }

function submissionStatsData() {
      const range = getStatsRange(todayStr());
      const dueSoon = state.submissions.filter(item => item.deadline && diffDays(todayStr(), item.deadline) <= 14 && diffDays(todayStr(), item.deadline) >= 0).length;
      const createdInRange = state.submissions.filter(item => isDateInRange(dateFromDateTime(item.createdAt), range.start, range.end)).length;
      const dueInRange = state.submissions.filter(item => item.deadline && isDateInRange(item.deadline, range.start, range.end)).length;
      const archived = state.submissions.filter(s => ['已接收','已见刊/已收录'].includes(s.stage)).length;
      return [
        { label:`${statsModeText()}新增项目`, value: createdInRange, color:'text-dopamine-sky' },
        { label:`${statsModeText()}截止项目`, value: dueInRange, color:'text-dopamine-pink' },
        { label:'进行中', value: runningSubmissionCount(), color:'text-dopamine-orange' },
        { label:'成果归档', value: archived, color:'text-dopamine-mint' },
        { label:'14 天内截止', value: dueSoon, color:'text-dopamine-purple' }
      ];
    }

function renderSubmissionStats() {
      const range = getStatsRange(todayStr());
      if ($('submissionStatsRangeLabel')) $('submissionStatsRangeLabel').textContent = range.label;
      $('submissionStats').innerHTML = submissionStatsData().map(item => `
        <div class="small-stat p-4"><div class="text-sm text-calm-mute">${item.label}</div><div class="text-3xl font-black mt-1 ${item.color}">${item.value}</div></div>
      `).join('');
    }

function addSubmission() {
      const title = $('subTitle').value.trim(); if (!title) { alert('请填写题目 / 项目名。'); return; }
      const timestamp = nowDateTime();
      const item = {
        id: uid('sub'),
        title,
        venue: $('subVenue').value.trim(),
        deadline: $('subDeadline').value || '',
        stage: $('subStage').value || '选题中',
        type: $('subType').value,
        notes: $('subNotes').value.trim(),
        logs: [],
        createdAt: timestamp,
        updatedAt: timestamp
      };
      state.submissions.unshift(item);
      syncSubmissionProject(item);
      ['subTitle','subVenue','subDeadline','subNotes'].forEach(id => $(id).value='');
      saveState(); renderAll();
    }

function renderSubmissionBoard() {
      renderSubmissionStats();
      syncAllSubmissionProjects();
      const prevFilterStage = $('submissionFilterStage').value;
      const prevFormStage = $('subStage').value;
      const prevLogProject = $('submissionLogProject')?.value || '';
      $('submissionFilterStage').innerHTML = `<option value="">全部阶段</option>` + SUBMISSION_COLUMNS.map(s => `<option value="${s}">${s}</option>`).join('');
      $('submissionFilterStage').value = prevFilterStage;
      $('subStage').innerHTML = SUBMISSION_COLUMNS.map(s => `<option value="${s}">${s}</option>`).join('');
      $('subStage').value = prevFormStage || '选题中';
      if ($('submissionLogProject')) {
        $('submissionLogProject').innerHTML = state.submissions.map(item => `<option value="${item.id}">${escapeHtml(item.title)}</option>`).join('');
        $('submissionLogProject').value = state.submissions.some(item => item.id === prevLogProject) ? prevLogProject : (state.submissions[0]?.id || '');
      }
      const q = $('submissionFilterQuery').value.trim().toLowerCase();
      const month = $('submissionFilterMonth').value;
      const stageFilter = $('submissionFilterStage').value;
      const filtered = state.submissions.filter(item => {
        const matchesQ = !q || `${item.title} ${item.venue} ${item.notes}`.toLowerCase().includes(q);
        const matchesMonth = !month || (item.deadline || '').startsWith(month);
        const matchesStage = !stageFilter || item.stage === stageFilter;
        return matchesQ && matchesMonth && matchesStage;
      });
      const boardItems = SUBMISSION_COLUMNS.filter(stage => !['已接收','已见刊/已收录'].includes(stage)).map(stage => ({ stage, items: filtered.filter(item => item.stage === stage) }));
      $('submissionBoard').innerHTML = boardItems.map(col => `
        <div class="small-stat p-4 kanban-col">
          <div class="flex items-center justify-between mb-3"><div class="font-black">${col.stage}</div><span class="pill" style="background:${STAGE_COLORS[col.stage]}20;color:${STAGE_COLORS[col.stage]}">${col.items.length}</span></div>
          <div class="space-y-3">${col.items.map(item => `
            <div class="rounded-2xl bg-white border border-calm-line p-3">
              <div class="font-bold line-clamp-2">${escapeHtml(item.title)}</div>
              <div class="text-xs text-calm-mute mt-1">${escapeHtml(item.venue || '未填写 venue')}</div>
              <div class="text-xs text-calm-mute mt-1">${item.deadline ? `截止：${item.deadline}` : '无截止日期'}</div>
              <div class="flex gap-2 mt-3 flex-wrap">
                <button class="px-2 py-1 rounded-xl text-xs font-bold bg-gray-100 text-calm-mute" data-sub-edit="${item.id}">修改</button>
                <button class="px-2 py-1 rounded-xl text-xs font-bold bg-green-100 text-green-700" data-sub-next="${item.id}">推进</button>
              </div>
            </div>
          `).join('') || '<div class="text-sm text-calm-mute">暂无项目</div>'}</div>
        </div>
      `).join('');
      $('submissionBoard').querySelectorAll('[data-sub-edit]').forEach(btn => btn.onclick = () => openSubmissionEditor(btn.dataset.subEdit));
      $('submissionBoard').querySelectorAll('[data-sub-next]').forEach(btn => btn.onclick = () => advanceSubmission(btn.dataset.subNext));

      const archive = filtered.filter(item => ['已接收','已见刊/已收录'].includes(item.stage));
      $('submissionArchive').innerHTML = archive.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-4 flex items-start justify-between gap-4">
          <div>
            <div class="font-black">${escapeHtml(item.title)}</div>
            <div class="text-sm text-calm-mute mt-1">${escapeHtml(item.venue || '')}</div>
            <div class="text-xs text-calm-mute mt-1">${item.stage}${item.deadline ? ` · 截止 ${item.deadline}` : ''}</div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-sub-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有进入成果归档的项目。</div>';
      $('submissionArchive').querySelectorAll('[data-sub-edit]').forEach(btn => btn.onclick = () => openSubmissionEditor(btn.dataset.subEdit));
      renderSubmissionLogs();
    }

function advanceSubmission(id) {
      const idx = state.submissions.findIndex(item => item.id === id); if (idx < 0) return;
      const item = state.submissions[idx];
      const current = SUBMISSION_COLUMNS.indexOf(item.stage);
      const nextStage = SUBMISSION_COLUMNS[Math.min(SUBMISSION_COLUMNS.length - 1, current + 1)] || item.stage;
      state.submissions[idx] = { ...item, stage: nextStage, updatedAt: nowDateTime() };
      syncSubmissionProject(state.submissions[idx]);
      saveState(); renderAll();
    }

function addSubmissionLog() {
      const id = $('submissionLogProject').value;
      const item = state.submissions.find(sub => sub.id === id);
      if (!item) { alert('请先选择投稿项目。'); return; }
      const note = $('submissionLogNote').value.trim();
      if (!note) { alert('请填写推进日志内容。'); return; }
      item.logs = Array.isArray(item.logs) ? item.logs : [];
      item.logs.unshift({
        id: uid('sublog'),
        date: $('submissionLogDate').value || todayStr(),
        type: $('submissionLogType').value || '推进',
        minutes: Math.max(0, Number($('submissionLogMinutes').value) || 0),
        note,
        stage: item.stage,
        at: nowDateTime()
      });
      item.updatedAt = nowDateTime();
      $('submissionLogNote').value = '';
      $('submissionLogMinutes').value = '';
      syncSubmissionProject(item);
      saveState();
      renderAll();
    }

function renderSubmissionLogs() {
      if (!$('submissionLogList')) return;
      const selectedId = $('submissionLogProject')?.value || '';
      const selected = state.submissions.find(item => item.id === selectedId);
      const logs = selected
        ? (selected.logs || []).map(log => ({ item:selected, log }))
        : state.submissions.flatMap(item => (item.logs || []).map(log => ({ item, log })));
      $('submissionLogList').innerHTML = logs.slice(0, 20).map(({ item, log }) => `
        <div class="rounded-2xl border border-calm-line bg-white px-4 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold">${escapeHtml(item.title)}</div>
              <div class="text-xs text-calm-mute mt-1">${escapeHtml(log.date)} · ${escapeHtml(log.type)} · ${escapeHtml(log.stage || item.stage)}${log.minutes ? ` · ${formatMinutes(log.minutes)}` : ''}</div>
              <div class="text-sm leading-6 mt-2">${escapeHtml(log.note)}</div>
            </div>
          </div>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有投稿推进日志。</div>';
    }

function downloadSubmissionMarkdown() {
      const id = $('submissionLogProject').value;
      const item = state.submissions.find(sub => sub.id === id);
      if (!item) { alert('请先选择投稿项目。'); return; }
      const logs = [...(item.logs || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.at || '').localeCompare(a.at || ''));
      const md = [
        `# 投稿推进日志：${item.title}`,
        '',
        `- Venue：${item.venue || '未填写'}`,
        `- 类型：${item.type || 'Other'}`,
        `- 当前阶段：${item.stage}`,
        `- 截止日期：${item.deadline || '未设置'}`,
        `- 备注：${item.notes || '无'}`,
        '',
        '## 推进日志',
        '',
        ...(logs.length ? logs.flatMap(log => [
          `### ${log.date} · ${log.type}`,
          '',
          `- 阶段：${log.stage || item.stage}`,
          `- 投入：${log.minutes ? formatMinutes(log.minutes) : '未记录'}`,
          `- 记录：${log.note}`,
          ''
        ]) : ['暂无推进日志。'])
      ].join('\n');
      const blob = new Blob([md], { type:'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submission_${item.title.replace(/[\\/:*?"<>|]/g, '_')}_logs.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
