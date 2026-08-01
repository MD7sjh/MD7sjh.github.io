/**
 * Daily review and generated summaries
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: reviewEnergyMeta, syncReviewTomorrowTasks, saveDailyReview, deleteDailyReview, downloadReviewMarkdown, renderReview, renderReviewThemeStats
 */
'use strict';

function reviewEnergyMeta(energy) {
      return REVIEW_ENERGY_OPTIONS.find(item => item.value === energy) || REVIEW_ENERGY_OPTIONS[1];
    }

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
