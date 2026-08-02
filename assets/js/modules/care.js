/* Wellbeing and self-care records. */
'use strict';

function saveCareEntry() {
  const date = $('careDate').value || todayStr();
  state.care.entries[date] = normalizeCareEntry({
    mood: selectedCareMood,
    stress: $('careStress').value,
    energy: $('careEnergy').value,
    challenge: $('careChallenge').value.trim(),
    selfCare: $('careSelfCare').value.trim(),
    gratitude: $('careGratitude').value.trim(),
    support: $('careSupport').value.trim(),
    note: $('careNote').value.trim(),
    updatedAt: nowDateTime()
  });
  saveState();
  renderAll();
}
function deleteCareEntry(date = $('careDate').value || todayStr()) {
  delete state.care.entries[date];
  saveState();
  renderAll();
}
function renderCareThemeStats() {
  const baseDate = $('careDate').value || todayStr();
  const range = getStatsRange(baseDate);
  if ($('careStatsRangeLabel')) $('careStatsRangeLabel').textContent = range.label;
  const entries = range.dates.map(date => ({ date, entry: careEntryOn(date) })).filter(item => careCountOn(item.date));
  const count = entries.length;
  const avgStress = count ? (entries.reduce((sum, item) => sum + item.entry.stress, 0) / count).toFixed(1) : '0.0';
  const avgEnergy = count ? (entries.reduce((sum, item) => sum + item.entry.energy, 0) / count).toFixed(1) : '0.0';
  const gratitudeDays = entries.filter(item => item.entry.gratitude.trim()).length;
  const supportDays = entries.filter(item => item.entry.support.trim() || item.entry.stress >= 4).length;
  const cards = [
    { label:`${statsModeText(baseDate)}有记录天数`, value: `${count}/${Math.max(1, range.dates.length)}`, color:'text-dopamine-mint' },
    { label:`${statsModeText(baseDate)}平均压力`, value: `${avgStress}/5`, color:'text-dopamine-pink' },
    { label:`${statsModeText(baseDate)}平均能量`, value: `${avgEnergy}/5`, color:'text-dopamine-sky' },
    { label:`${statsModeText(baseDate)}写下感谢`, value: gratitudeDays, color:'text-dopamine-yellow' },
    { label:`${statsModeText(baseDate)}需要支持`, value: supportDays, color:'text-dopamine-purple' }
  ];
  $('careThemeStats').innerHTML = cards.map(item => `
    <div class="small-stat p-4">
      <div class="text-sm text-calm-mute">${item.label}</div>
      <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
    </div>
  `).join('');
}
function renderCare() {
  const date = $('careDate').value || todayStr();
  const entry = careEntryOn(date);
  selectedCareMood = entry.mood || 'steady';
  document.querySelectorAll('[data-care-mood]').forEach(btn => btn.classList.toggle('active', btn.dataset.careMood === selectedCareMood));
  setInputIfIdle('careStress', String(entry.stress || 3));
  setInputIfIdle('careEnergy', String(entry.energy || 3));
  setInputIfIdle('careChallenge', entry.challenge || '');
  setInputIfIdle('careSelfCare', entry.selfCare || '');
  setInputIfIdle('careGratitude', entry.gratitude || '');
  setInputIfIdle('careSupport', entry.support || '');
  setInputIfIdle('careNote', entry.note || '');

  const mood = careMoodMeta(entry.mood);
  const careHint = entry.stress >= 4
    ? '今天更适合先减压，再谈效率。'
    : entry.energy >= 4
      ? '你今天有一点回升，可以把能量留给最重要的一件事。'
      : '先把自己放回可持续状态，比硬撑更重要。';
  $('careSummary').innerHTML = careCountOn(date) ? `
    <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
      <div class="font-black">${mood.emoji} ${mood.label}</div>
      <div class="text-sm text-calm-mute mt-1">压力 ${entry.stress}/5 · 能量 ${entry.energy}/5</div>
    </div>
    <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
      <div class="font-black mb-1">给今天的提醒</div>
      <div class="text-sm leading-6">${escapeHtml(careHint)}</div>
    </div>
    <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
      <div class="text-sm text-calm-mute">自我关怀</div>
      <div class="font-bold mt-1">${escapeHtml(entry.selfCare || '今天还没有写下恢复动作。')}</div>
    </div>
    <div class="rounded-2xl bg-white border border-calm-line px-4 py-4">
      <div class="text-sm text-calm-mute">支持 / 边界</div>
      <div class="font-bold mt-1">${escapeHtml(entry.support || '今天还没有写下支持需求。')}</div>
    </div>
  ` : '<div class="text-sm text-calm-mute">今天还没有记录心灵关怀。先写下压力、能量和一个最小的恢复动作吧。</div>';

  $('careHistoryList').innerHTML = recentDates(7).map(d => {
    const item = careEntryOn(d);
    const hasRecord = careCountOn(d);
    const itemMood = careMoodMeta(item.mood);
    return `
      <div class="rounded-2xl border border-calm-line bg-white px-3 py-3 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="font-bold">${dayLabel(d)}</div>
          <div class="text-xs text-calm-mute mt-1">${hasRecord ? `${itemMood.emoji} ${itemMood.label} · 压力 ${item.stress}/5 · 能量 ${item.energy}/5` : '未记录'}</div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="text-sm font-bold text-dopamine-orange" data-care-jump="${d}">查看</button>
          ${hasRecord ? `<button class="text-sm font-bold text-rose-600" data-care-delete="${d}">删除</button>` : ''}
        </div>
      </div>`;
  }).join('');
  $('careHistoryList').querySelectorAll('[data-care-jump]').forEach(btn => btn.onclick = () => { $('careDate').value = btn.dataset.careJump; navTo('care-section'); renderAll(); });
  $('careHistoryList').querySelectorAll('[data-care-delete]').forEach(btn => btn.onclick = () => { if (confirm('确定删除这天的心灵关怀记录吗？')) deleteCareEntry(btn.dataset.careDelete); });
}
