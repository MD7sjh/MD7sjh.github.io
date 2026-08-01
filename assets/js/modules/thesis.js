/**
 * PhD thesis milestones, chapters and logs
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: thesisOverallProgress, renderThesisThemeStats, renderThesisMeta, addThesisMilestone, toggleThesisMilestoneDone, renderThesisMilestones, addThesisChapter, setThesisChapterProgress, renderThesisChapters, addThesisLog, renderThesisLogs, saveThesisMeta, renderThesis, thesisLogTypeForTask
 */
'use strict';

function thesisOverallProgress() {
      const thesis = state.thesis || defaultThesisState();
      const milestones = Array.isArray(thesis.milestones) ? thesis.milestones : [];
      const chapters = Array.isArray(thesis.chapters) ? thesis.chapters : [];
      const msTotal = milestones.length;
      const msDone = milestones.filter(m => m.done).length;
      const msRatio = msTotal ? msDone / msTotal : 0;
      const chTotal = chapters.length;
      const chRatio = chTotal ? chapters.reduce((sum, c) => sum + (Number(c.progress) || 0), 0) / (100 * chTotal) : 0;
      const overall = Math.round((msRatio * 0.4 + chRatio * 0.6) * 100);
      return Math.max(0, Math.min(100, overall));
    }

function renderThesisThemeStats() {
      const range = getStatsRange(todayStr());
      if ($('thesisStatsRangeLabel')) $('thesisStatsRangeLabel').textContent = range.label;
      const logs = (state.thesis?.logs || []);
      const inRangeLogs = logs.filter(item => isDateInRange(item.date, range.start, range.end));
      const minutes = inRangeLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
      const words = inRangeLogs.reduce((sum, item) => sum + (Number(item.words) || 0), 0);
      const milestoneDone = (state.thesis?.milestones || []).filter(m => m.doneAt && isDateInRange(dateFromDateTime(m.doneAt), range.start, range.end)).length;
      const chapterUpdated = (state.thesis?.chapters || []).filter(c => c.updatedAt && isDateInRange(dateFromDateTime(c.updatedAt), range.start, range.end)).length;
      const cards = [
        { label:`${statsModeText()}日志条目`, value: inRangeLogs.length, color:'text-dopamine-sky' },
        { label:`${statsModeText()}投入分钟`, value: Math.round(minutes), color:'text-dopamine-orange' },
        { label:`${statsModeText()}写作字数`, value: Math.round(words), color:'text-dopamine-pink' },
        { label:`${statsModeText()}章节更新`, value: chapterUpdated, color:'text-dopamine-purple' },
        { label:`${statsModeText()}完成里程碑`, value: milestoneDone, color:'text-dopamine-mint' }
      ];
      $('thesisThemeStats').innerHTML = cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

function renderThesisMeta() {
      const thesis = state.thesis || defaultThesisState();
      setInputIfIdle('thesisMetaTitle', thesis.meta?.title || '');
      setInputIfIdle('thesisMetaTargetDate', thesis.meta?.targetDate || '');
      setInputIfIdle('thesisMetaVersion', thesis.meta?.version || '');
      setInputIfIdle('thesisMetaNote', thesis.meta?.note || '');
      const overall = thesisOverallProgress();
      if ($('thesisOverallText')) $('thesisOverallText').textContent = `${overall}%`;
      if ($('thesisOverallBar')) $('thesisOverallBar').style.width = `${overall}%`;
      if ($('thesisOverallHint')) {
        const msTotal = thesis.milestones?.length || 0;
        const msDone = (thesis.milestones || []).filter(m => m.done).length;
        const chTotal = thesis.chapters?.length || 0;
        $('thesisOverallHint').textContent = `里程碑 ${msDone}/${msTotal} · 章节 ${chTotal} 个`;
      }
    }

function addThesisMilestone() {
      const name = $('thesisMilestoneName').value.trim();
      if (!name) return;
      const due = $('thesisMilestoneDue').value || '';
      state.thesis.milestones.unshift({ id: uid('ms'), name, due, done:false, doneAt:'', note:'' });
      $('thesisMilestoneName').value = '';
      $('thesisMilestoneDue').value = '';
      saveState(); renderAll();
    }

function toggleThesisMilestoneDone(id) {
      const item = state.thesis.milestones.find(m => m.id === id);
      if (!item) return;
      item.done = !item.done;
      item.doneAt = item.done ? nowDateTime() : '';
      saveState(); renderAll();
    }

function renderThesisMilestones() {
      const list = (state.thesis?.milestones || []);
      $('thesisMilestoneList').innerHTML = list.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-3">
              <button class="w-10 h-10 rounded-2xl ${item.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'} font-black" data-ms-toggle="${item.id}" title="切换完成状态">${item.done ? '✓' : ''}</button>
              <div class="min-w-0">
                <div class="font-black ${item.done ? 'line-through text-calm-mute' : ''}">${escapeHtml(item.name)}</div>
                <div class="text-xs text-calm-mute mt-1">${item.due ? `截止：${escapeHtml(item.due)}` : '未设置截止'}${item.doneAt ? ` · 完成于 ${escapeHtml(item.doneAt)}` : ''}</div>
              </div>
            </div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-ms-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有里程碑，先添加一条吧。</div>';
      $('thesisMilestoneList').querySelectorAll('[data-ms-toggle]').forEach(btn => btn.onclick = () => toggleThesisMilestoneDone(btn.dataset.msToggle));
      $('thesisMilestoneList').querySelectorAll('[data-ms-edit]').forEach(btn => btn.onclick = () => openThesisMilestoneEditor(btn.dataset.msEdit));
    }

function addThesisChapter() {
      const name = $('thesisChapterName').value.trim();
      if (!name) return;
      const status = ['draft','revise','done'].includes($('thesisChapterStatus').value) ? $('thesisChapterStatus').value : 'draft';
      state.thesis.chapters.unshift({ id: uid('ch'), name, progress: 0, status, updatedAt: nowDateTime(), note:'' });
      $('thesisChapterName').value = '';
      saveState(); renderAll();
    }

function setThesisChapterProgress(id, value) {
      const item = state.thesis.chapters.find(c => c.id === id);
      if (!item) return;
      item.progress = Math.max(0, Math.min(100, Number(value) || 0));
      item.updatedAt = nowDateTime();
      if (item.progress >= 100) item.status = 'done';
      saveState(); renderAll();
    }

function renderThesisChapters() {
      const list = (state.thesis?.chapters || []);
      const statusText = { draft:'草稿', revise:'修改', done:'完成' };
      const statusColor = { draft:'bg-gray-100 text-calm-mute', revise:'bg-amber-100 text-amber-700', done:'bg-green-100 text-green-700' };
      $('thesisChapterList').innerHTML = list.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-black">${escapeHtml(item.name)}</div>
              <div class="text-xs text-calm-mute mt-1">${item.updatedAt ? `更新：${escapeHtml(item.updatedAt)}` : '未更新'}</div>
            </div>
            <div class="flex items-center gap-2">
              <span class="pill ${statusColor[item.status] || statusColor.draft}">${statusText[item.status] || '草稿'}</span>
              <button class="text-sm font-bold text-dopamine-orange" data-ch-edit="${item.id}">修改</button>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-3">
            <input data-ch-range="${item.id}" type="range" min="0" max="100" value="${Number(item.progress) || 0}" class="w-full">
            <div class="font-black mono w-12 text-right">${Math.round(Number(item.progress) || 0)}%</div>
          </div>
          <div class="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div class="h-full" style="width:${Math.max(0, Math.min(100, Number(item.progress) || 0))}%; background: linear-gradient(90deg, #43AA8B, #4D9DE0);"></div>
          </div>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有章节，先添加一条吧。</div>';
      $('thesisChapterList').querySelectorAll('[data-ch-range]').forEach(el => el.onchange = () => setThesisChapterProgress(el.dataset.chRange, el.value));
      $('thesisChapterList').querySelectorAll('[data-ch-edit]').forEach(btn => btn.onclick = () => openThesisChapterEditor(btn.dataset.chEdit));
    }

function addThesisLog() {
      const date = $('thesisLogDate').value || todayStr();
      const type = $('thesisLogType').value || 'other';
      const minutes = Math.max(0, Number($('thesisLogMinutes').value) || 0);
      const words = Math.max(0, Number($('thesisLogWords').value) || 0);
      const note = $('thesisLogNote').value.trim();
      state.thesis.logs.unshift({ id: uid('thlog'), date, type, minutes, words, note, at: nowDateTime() });
      $('thesisLogMinutes').value = '';
      $('thesisLogWords').value = '';
      $('thesisLogNote').value = '';
      saveState(); renderAll();
    }

function renderThesisLogs() {
      const icons = { writing:'📝', revise:'✍️', experiment:'🧪', meeting:'👥', other:'📌' };
      const typeText = { writing:'写作', revise:'修改', experiment:'实验', meeting:'讨论/组会', other:'其他' };
      const logs = (state.thesis?.logs || []).slice(0, 30);
      $('thesisLogList').innerHTML = logs.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <div class="text-2xl">${icons[item.type] || icons.other}</div>
              <div class="min-w-0">
                <div class="font-black">${escapeHtml(item.date)} · ${escapeHtml(typeText[item.type] || '其他')}</div>
                <div class="text-xs text-calm-mute mt-1">${item.minutes ? `${Math.round(item.minutes)} 分钟` : '—'}${item.words ? ` · ${Math.round(item.words)} 字` : ''}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</div>
              </div>
            </div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-thlog-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">还没有推进日志，先记录一条吧。</div>';
      $('thesisLogList').querySelectorAll('[data-thlog-edit]').forEach(btn => btn.onclick = () => openThesisLogEditor(btn.dataset.thlogEdit));
    }

function saveThesisMeta() {
      state.thesis.meta = {
        title: $('thesisMetaTitle').value.trim(),
        targetDate: $('thesisMetaTargetDate').value || '',
        version: $('thesisMetaVersion').value.trim(),
        note: $('thesisMetaNote').value.trim()
      };
      saveState(); renderAll();
      alert('已保存论文信息。');
    }

function renderThesis() {
      renderThesisThemeStats();
      renderThesisMeta();
      renderThesisMilestones();
      renderThesisChapters();
      renderThesisLogs();
    }

function thesisLogTypeForTask(task) {
      const text = `${task.title || ''} ${task.context || ''} ${task.note || ''}`;
      if (/实验|数据|样本|分析/.test(text)) return 'experiment';
      if (/改|修|润色|revision|返修/i.test(text)) return 'revise';
      if (/组会|讨论|meeting|导师/i.test(text)) return 'meeting';
      if (/写|章|论文|draft|chapter/i.test(text)) return 'writing';
      return 'other';
    }
