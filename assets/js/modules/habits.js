/**
 * Health habits, food, exercise and weight
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: qualifiesWake, qualifiesSleep, todayHabitCompletion, habitModeLabel, getTimeHabitValue, setTimeHabitValue, clearTimeHabitValue, habitDoneOnDate, exerciseDoneOn, renderHabitSnapshot, addCustomHabit, renderHabitList, isDefaultHabitId, toggleHabitEnabled, deleteHabitDefinition, renderHabitManager, addFood, renderFoods, addWeight, renderWeights
 */
'use strict';

function qualifiesWake(time) { return !!parseHM(time) && hmToMinutes(time) <= hmToMinutes('09:00'); }

function qualifiesSleep(time) { return !!parseHM(time) && hmToMinutes(time) <= hmToMinutes('23:30'); }

function todayHabitCompletion(date=todayStr()) {
      const habits = (state.habits?.list || []).filter(h => h && h.enabled !== false);
      const trackables = habits.filter(h => !LEGACY_REMOVED_HABITS.has(h.id));
      if (!trackables.length) return 0;
      const doneCount = trackables.filter(h => habitDoneOnDate(h, date)).length;
      return Math.round(doneCount / trackables.length * 100);
    }

function habitModeLabel(mode) {
      return ({
        time: '时间',
        duration: '时长',
        checkbox: '打卡',
        count: '次数',
        text: '文字',
        food: '饮食'
      })[mode] || String(mode || '');
    }

function getTimeHabitValue(date, habitId) {
      if (habitId === 'habit_early_wake') return parseHM(state.attendance?.[date]?.wake) || '';
      if (habitId === 'habit_early_sleep') return parseHM(state.attendance?.[date]?.sleep) || '';
      return normalizeTimeEntry(state.habits?.entries?.[date]?.[habitId]).time || '';
    }

function setTimeHabitValue(date, habitId, time) {
      const t = parseHM(time);
      if (habitId === 'habit_early_wake') { getDayAttendance(date).wake = t; return; }
      if (habitId === 'habit_early_sleep') { getDayAttendance(date).sleep = t; return; }
      const map = getHabitEntryMap(date);
      map[habitId] = { ...normalizeTimeEntry(map[habitId]), time: t || '' };
    }

function clearTimeHabitValue(date, habitId) {
      if (habitId === 'habit_early_wake') { getDayAttendance(date).wake = null; return; }
      if (habitId === 'habit_early_sleep') { getDayAttendance(date).sleep = null; return; }
      const map = getHabitEntryMap(date);
      delete map[habitId];
    }

function habitDoneOnDate(habit, date) {
      if (!habit || habit.enabled === false) return false;
      const id = habit.id;
      const mode = habit.mode;
      if (id === 'habit_early_wake') return !!state.attendance?.[date]?.wake;
      if (id === 'habit_early_sleep') return !!state.attendance?.[date]?.sleep;
      if (id === 'habit_food_record' || mode === 'food') return state.foods.some(item => item.date === date);
      if (mode === 'time') return !!getTimeHabitValue(date, id);
      if (mode === 'duration') return getDurationEntry(date, id).done;
      if (mode === 'checkbox') return normalizeCheckboxEntry(state.habits?.entries?.[date]?.[id]).done;
      if (mode === 'count') return normalizeCountEntry(state.habits?.entries?.[date]?.[id]).count > 0;
      if (mode === 'text') return (normalizeTextEntry(state.habits?.entries?.[date]?.[id]).text || '').trim().length > 0;
      return false;
    }

function exerciseDoneOn(date=todayStr()) { return getDurationEntry(date, 'habit_exercise').done; }

function renderHabitSnapshot() {
      const date = $('habitDate').value || todayStr();
      const range = getStatsRange(date);
      if ($('habitStatsRangeLabel')) $('habitStatsRangeLabel').textContent = range.label;
      const enabledIds = new Set((state.habits?.list || []).filter(h => h && h.enabled !== false).map(h => h.id));
      const day = getDayAttendance(date);
      let cards = [];
      if (statsMode === 'day') {
        const ex = getDurationEntry(date, 'habit_exercise');
        const exMinutes = Math.round(ex.minutes) || 0;
        const exBase = exMinutes ? `${exMinutes} 分钟` : '已记录';
        const exText = ex.done
          ? `${exBase}${ex.type ? ` · ${escapeHtml(ex.type)}` : ''}${ex.intensity ? ` · ${escapeHtml(ex.intensity)}` : ''}`
          : '未记录';
        const weight = (state.weights || []).find(item => item.date === date);
        cards = [
          enabledIds.has('habit_early_sleep') ? { key:'sleep', name:'早睡', icon:'🌙', value: day.sleep ? `${day.sleep} ${qualifiesSleep(day.sleep) ? '✓' : '稍晚'}` : '未记录', accent:'text-dopamine-purple' } : null,
          enabledIds.has('habit_early_wake') ? { key:'wake', name:'早起', icon:'🌞', value: day.wake ? `${day.wake} ${qualifiesWake(day.wake) ? '✓' : '偏晚'}` : '未记录', accent:'text-dopamine-yellow' } : null,
          enabledIds.has('habit_exercise') ? { key:'exercise', name:'运动', icon:'🏃', value: exText, accent:'text-dopamine-mint' } : null,
          enabledIds.has('habit_food_record') ? { key:'food', name:'饮食记录', icon:'🍽️', value: `${state.foods.filter(item => item.date===date).length} 条`, accent:'text-dopamine-orange' } : null,
          { key:'weight', name:'体重', icon:'⚖️', value: weight ? `${weight.value} ${weight.unit}` : '未记录', accent:'text-dopamine-sky' }
        ].filter(Boolean);
        $('habitCompletionText').textContent = `${todayHabitCompletion(date)}%`;
      } else {
        const totalDays = Math.max(1, range.dates.length);
        const sleepGood = range.dates.filter(d => qualifiesSleep(state.attendance[d]?.sleep)).length;
        const wakeGood = range.dates.filter(d => qualifiesWake(state.attendance[d]?.wake)).length;
        const exerciseDays = range.dates.filter(d => exerciseDoneOn(d)).length;
        const foodEntries = state.foods.filter(item => isDateInRange(item.date, range.start, range.end)).length;
        const weightEntries = (state.weights || []).filter(item => isDateInRange(item.date, range.start, range.end)).length;
        const avgCompletion = Math.round(range.dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / totalDays);
        cards = [
          enabledIds.has('habit_early_sleep') ? { key:'sleep', name:'早睡', icon:'🌙', value: `达标 ${sleepGood}/${totalDays} 天`, accent:'text-dopamine-purple' } : null,
          enabledIds.has('habit_early_wake') ? { key:'wake', name:'早起', icon:'🌞', value: `达标 ${wakeGood}/${totalDays} 天`, accent:'text-dopamine-yellow' } : null,
          enabledIds.has('habit_exercise') ? { key:'exercise', name:'运动', icon:'🏃', value: `完成 ${exerciseDays}/${totalDays} 天`, accent:'text-dopamine-mint' } : null,
          enabledIds.has('habit_food_record') ? { key:'food', name:'饮食记录', icon:'🍽️', value: `${foodEntries} 条`, accent:'text-dopamine-orange' } : null,
          { key:'weight', name:'体重记录', icon:'⚖️', value: `${weightEntries} 条`, accent:'text-dopamine-sky' }
        ].filter(Boolean);
        $('habitCompletionText').textContent = `平均 ${avgCompletion}%`;
      }
      $('habitSnapshot').innerHTML = cards.map(card => `
        <div class="small-stat p-4">
          <div class="text-sm font-black ${card.accent}">${card.icon} ${card.name}</div>
          <div class="mt-2 text-lg font-black">${card.value}</div>
        </div>
      `).join('');
    }

function addCustomHabit() {
      const name = $('customHabitName').value.trim(); if (!name) return;
      const mode = $('customHabitMode').value; const icon = $('customHabitIcon').value.trim() || '✅';
      const id = uid('habit');
      state.habits.list.push(normalizeHabitItem({ id, name, icon, mode, enabled:true, locked:false }) || { id, name, icon, mode, enabled:true, locked:false });
      $('customHabitName').value = ''; $('customHabitIcon').value = '';
      saveState(); renderAll();
    }

function renderHabitList() {
      const date = $('habitDate').value || todayStr();
      const entryMap = getHabitEntryMap(date);
      const enabledHabits = (state.habits?.list || []).filter(h => h && h.enabled !== false);
      const recordHabits = enabledHabits.filter(h => ['time','duration','checkbox','count','text'].includes(h.mode));

      const timeHabits = recordHabits.filter(h => h.mode === 'time');
      const durationHabits = recordHabits.filter(h => h.mode === 'duration');
      const checkboxHabits = recordHabits.filter(h => h.mode === 'checkbox');
      const countHabits = recordHabits.filter(h => h.mode === 'count');
      const textHabits = recordHabits.filter(h => h.mode === 'text');

      function groupCard(title, desc, bodyHtml, count) {
        if (!count) return '';
        return `
          <div class="small-stat p-4">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <div class="font-black">${escapeHtml(title)}</div>
                <div class="text-xs text-calm-mute mt-1">${escapeHtml(desc || '')}</div>
              </div>
              <span class="pill bg-white border border-calm-line text-calm-mute">${count} 项</span>
            </div>
            <div class="space-y-3">${bodyHtml}</div>
          </div>`;
      }

      const timeHtml = timeHabits.map(habit => {
        const timeVal = getTimeHabitValue(date, habit.id);
        const status = timeVal
          ? (habit.id === 'habit_early_wake' ? (qualifiesWake(timeVal) ? '达标早起 ✓' : '已记录') : habit.id === 'habit_early_sleep' ? (qualifiesSleep(timeVal) ? '达标早睡 ✓' : '已记录') : '已记录')
          : '未记录';
        const nowBtn = habit.id === 'habit_early_wake'
          ? `<button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-yellow-100 text-yellow-800" data-habit-time-now="${habit.id}">现在</button>`
          : '';
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${escapeHtml(habit.icon)} ${escapeHtml(habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                ${nowBtn}
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-gray-100 text-calm-mute" data-habit-time-clear="${habit.id}">清空</button>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <div class="grid grid-cols-[minmax(0,1fr)_160px] gap-2 items-center">
              <div class="text-sm text-calm-mute">${escapeHtml(status)}</div>
              <input data-habit-time="${habit.id}" type="time" class="px-3 py-2 rounded-2xl border border-calm-line bg-calm-bg font-semibold" value="${escapeHtml(timeVal)}">
            </div>
          </div>`;
      }).join('');

      const durationHtml = durationHabits.map(habit => {
        const entry = getDurationEntry(date, habit.id);
        const minutes = entry.minutes ? String(Math.round(entry.minutes)) : '';
        const intensity = entry.intensity || '';
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${escapeHtml(habit.icon)} ${escapeHtml(habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                <span class="pill ${entry.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}">${entry.done ? '已记录' : '未记录'}</span>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-gray-100 text-calm-mute" data-habit-duration-clear="${habit.id}">清空</button>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input data-habit-duration-minutes="${habit.id}" type="number" min="0" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="${habit.id==='habit_exercise' ? '运动时长（分钟）' : '时长（分钟）'}" value="${escapeHtml(minutes)}">
              <input data-habit-duration-type="${habit.id}" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="${habit.id==='habit_exercise' ? '运动类型，如：跑步 / 力量 / 瑜伽' : '类型（可选）'}" value="${escapeHtml(entry.type || '')}">
              <select data-habit-duration-intensity="${habit.id}" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg">
                <option value="">运动强度</option>
                <option value="低" ${intensity==='低'?'selected':''}>低</option>
                <option value="中" ${intensity==='中'?'selected':''}>中</option>
                <option value="高" ${intensity==='高'?'selected':''}>高</option>
              </select>
            </div>
            <textarea data-habit-duration-note="${habit.id}" rows="2" class="w-full mt-2 px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="备注（可选）">${escapeHtml(entry.note || '')}</textarea>
          </div>`;
      }).join('');

      const checkboxHtml = checkboxHabits.map(habit => {
        const entry = normalizeCheckboxEntry(entryMap[habit.id]);
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${escapeHtml(habit.icon)} ${escapeHtml(habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold ${entry.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}" data-habit-toggle="${habit.id}">${entry.done ? '已完成' : '标记完成'}</button>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <textarea data-habit-note="${habit.id}" rows="2" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="备注（可选）">${escapeHtml(entry.note||'')}</textarea>
          </div>`;
      }).join('');

      const countHtml = countHabits.map(habit => {
        const entry = normalizeCountEntry(entryMap[habit.id]);
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${escapeHtml(habit.icon)} ${escapeHtml(habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                <span class="pill ${entry.count>0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}">${entry.count>0 ? '已记录' : '未记录'}</span>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <div class="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
              <input data-habit-count="${habit.id}" type="number" min="0" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" value="${escapeHtml(String(entry.count||0))}">
              <input data-habit-count-note="${habit.id}" class="px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="备注（可选）" value="${escapeHtml(entry.note||'')}">
            </div>
          </div>`;
      }).join('');

      const textHtml = textHabits.map(habit => {
        const entry = normalizeTextEntry(entryMap[habit.id]);
        return `
          <div class="rounded-2xl border border-calm-line bg-white p-4">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="font-black">${escapeHtml(habit.icon)} ${escapeHtml(habit.name)}</div>
              <div class="flex gap-2 shrink-0">
                <span class="pill ${(entry.text||'').trim() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}">${(entry.text||'').trim() ? '已记录' : '未记录'}</span>
                <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-def-edit="${habit.id}">管理</button>
              </div>
            </div>
            <textarea data-habit-text="${habit.id}" rows="3" class="w-full px-3 py-3 rounded-2xl border border-calm-line bg-calm-bg" placeholder="记录内容">${escapeHtml(entry.text||'')}</textarea>
          </div>`;
      }).join('');

      const html = [
        groupCard('时间记录', '如：早起 / 早睡（HH:MM）', timeHtml, timeHabits.length),
        groupCard('时长记录', '如：运动（分钟 + 类型 + 强度）', durationHtml, durationHabits.length),
        groupCard('打卡习惯', '勾选完成 + 备注', checkboxHtml, checkboxHabits.length),
        groupCard('次数记录', '次数 + 备注', countHtml, countHabits.length),
        groupCard('文字记录', '自由文本记录', textHtml, textHabits.length)
      ].filter(Boolean).join('');

      $('habitList').innerHTML = html || '<div class="text-sm text-calm-mute">还没有启用可记录的健康习惯。可以在页面底部添加或启用习惯。</div>';

      $('habitList').querySelectorAll('[data-habit-time]').forEach(input => input.onchange = () => { setTimeHabitValue(date, input.dataset.habitTime, input.value); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-time-now]').forEach(btn => btn.onclick = () => { setTimeHabitValue(date, btn.dataset.habitTimeNow, nowTime()); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-time-clear]').forEach(btn => btn.onclick = () => { clearTimeHabitValue(date, btn.dataset.habitTimeClear); saveState(); renderAll(); });

      $('habitList').querySelectorAll('[data-habit-duration-minutes]').forEach(input => input.onchange = () => {
        const id = input.dataset.habitDurationMinutes;
        const mins = Math.max(0, Number(input.value) || 0);
        setDurationEntry(date, id, { minutes: mins, done: mins > 0 });
        saveState(); renderAll();
      });
      $('habitList').querySelectorAll('[data-habit-duration-type]').forEach(input => input.onchange = () => { const id=input.dataset.habitDurationType; setDurationEntry(date, id, { type: input.value.trim() }); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-duration-intensity]').forEach(input => input.onchange = () => { const id=input.dataset.habitDurationIntensity; setDurationEntry(date, id, { intensity: input.value }); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-duration-note]').forEach(input => input.onchange = () => { const id=input.dataset.habitDurationNote; setDurationEntry(date, id, { note: input.value }); saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-duration-clear]').forEach(btn => btn.onclick = () => { const id=btn.dataset.habitDurationClear; delete entryMap[id]; saveState(); renderAll(); });

      $('habitList').querySelectorAll('[data-habit-toggle]').forEach(btn => btn.onclick = () => { const id=btn.dataset.habitToggle; const entry=normalizeCheckboxEntry(entryMap[id]); entryMap[id] = { ...entry, done: !entry.done }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-note]').forEach(input => input.onchange = () => { const id=input.dataset.habitNote; const entry=normalizeCheckboxEntry(entryMap[id]); entryMap[id] = { ...entry, note: input.value }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-text]').forEach(input => input.onchange = () => { const id=input.dataset.habitText; entryMap[id] = { ...normalizeTextEntry(entryMap[id]), text: input.value }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-count]').forEach(input => input.onchange = () => { const id=input.dataset.habitCount; const noteEl = $('habitList').querySelector(`[data-habit-count-note="${id}"]`); entryMap[id] = { ...normalizeCountEntry(entryMap[id]), count: Math.max(0, Number(input.value) || 0), note: noteEl?.value || '' }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-count-note]').forEach(input => input.onchange = () => { const id=input.dataset.habitCountNote; const countEl = $('habitList').querySelector(`[data-habit-count="${id}"]`); entryMap[id] = { ...normalizeCountEntry(entryMap[id]), count: Math.max(0, Number(countEl?.value) || 0), note: input.value }; saveState(); renderAll(); });
      $('habitList').querySelectorAll('[data-habit-def-edit]').forEach(btn => btn.onclick = () => openHabitDefinitionEditor(btn.dataset.habitDefEdit));

      const enabledIds = new Set(enabledHabits.map(h => h.id));
      if ($('habitFoodCard')) $('habitFoodCard').style.display = enabledIds.has('habit_food_record') ? '' : 'none';
    }

function isDefaultHabitId(id) { return DEFAULT_HABITS.some(h => h.id === id); }

function toggleHabitEnabled(id) {
      const item = state.habits.list.find(h => h.id === id);
      if (!item) return;
      item.enabled = item.enabled === false;
      saveState(); renderAll();
    }

function deleteHabitDefinition(id) {
      const item = state.habits.list.find(h => h.id === id);
      if (!item) return;
      if (isDefaultHabitId(id)) item.enabled = false;
      else state.habits.list = state.habits.list.filter(h => h.id !== id);
      for (const d of Object.keys(state.habits.entries || {})) delete state.habits.entries[d][id];
      saveState(); renderAll();
    }

function renderHabitManager() {
      const list = state.habits?.list || [];
      const ordered = [...list].sort((a,b) => (a.enabled===false)-(b.enabled===false));
      $('habitManagerList').innerHTML = ordered.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-black">${escapeHtml(item.icon)} ${escapeHtml(item.name)}</div>
            <div class="text-xs text-calm-mute mt-1">方式：${escapeHtml(habitModeLabel(item.mode))} · 状态：${item.enabled===false ? '停用' : '启用'}</div>
          </div>
          <div class="flex gap-2 shrink-0 flex-wrap justify-end">
            <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-white border border-calm-line" data-habit-manage-edit="${item.id}">编辑</button>
            <button class="px-3 py-1.5 rounded-xl text-sm font-bold ${item.enabled===false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-calm-mute'}" data-habit-manage-toggle="${item.id}">${item.enabled===false ? '启用' : '停用'}</button>
            <button class="px-3 py-1.5 rounded-xl text-sm font-bold bg-rose-100 text-rose-600" data-habit-manage-delete="${item.id}">删除</button>
          </div>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">暂无习惯。</div>';

      $('habitManagerList').querySelectorAll('[data-habit-manage-edit]').forEach(btn => btn.onclick = () => openHabitDefinitionEditor(btn.dataset.habitManageEdit));
      $('habitManagerList').querySelectorAll('[data-habit-manage-toggle]').forEach(btn => btn.onclick = () => toggleHabitEnabled(btn.dataset.habitManageToggle));
      $('habitManagerList').querySelectorAll('[data-habit-manage-delete]').forEach(btn => btn.onclick = () => { if (confirm('确定删除（或停用）这个习惯吗？')) deleteHabitDefinition(btn.dataset.habitManageDelete); });
    }

function addFood() {
      const date = $('habitDate').value || todayStr();
      const meal = $('foodMeal').value; const text = $('foodText').value.trim();
      if (!text) return;
      state.foods.unshift({ id:uid('food'), date, meal, text, at:nowDateTime() });
      $('foodText').value = '';
      saveState(); renderAll();
    }

function renderFoods() {
      const date = $('habitDate').value || todayStr();
      const foods = state.foods.filter(item => item.date === date);
      $('foodCountBadge').textContent = `${foods.length} 条`;
      $('foodList').innerHTML = foods.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div><div class="font-bold">${escapeHtml(item.meal)}</div><div class="text-sm text-calm-mute mt-1">${escapeHtml(item.text)}</div></div>
          <button class="text-sm font-bold text-dopamine-orange" data-food-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">今天还没有饮食记录。</div>';
      $('foodList').querySelectorAll('[data-food-edit]').forEach(btn => btn.onclick = () => openFoodEditor(btn.dataset.foodEdit));
    }

function addWeight() {
      const date = $('habitDate').value || todayStr();
      const value = Math.max(0, Number($('weightValue').value) || 0);
      if (!value) { alert('请填写体重数值。'); return; }
      state.weights.unshift({ id: uid('weight'), date, value, unit: $('weightUnit').value || 'kg', at: nowDateTime() });
      $('weightValue').value = '';
      saveState();
      renderAll();
    }

function renderWeights() {
      const date = $('habitDate').value || todayStr();
      const records = (state.weights || []).filter(item => item.date === date);
      const latest = (state.weights || [])[0];
      $('weightLatestBadge').textContent = latest ? `${latest.value} ${latest.unit}` : '未记录';
      $('weightList').innerHTML = records.map(item => `
        <div class="rounded-2xl border border-calm-line bg-white p-3 flex items-start justify-between gap-3">
          <div>
            <div class="font-bold">${escapeHtml(String(item.value))} ${escapeHtml(item.unit)}</div>
            <div class="text-xs text-calm-mute mt-1">${escapeHtml(item.date)} · ${escapeHtml(String(item.at || '').slice(11, 16))}</div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-weight-edit="${item.id}">修改</button>
        </div>
      `).join('') || '<div class="text-sm text-calm-mute">今天还没有体重记录。</div>';
      $('weightList').querySelectorAll('[data-weight-edit]').forEach(btn => btn.onclick = () => openWeightEditor(btn.dataset.weightEdit));
    }
