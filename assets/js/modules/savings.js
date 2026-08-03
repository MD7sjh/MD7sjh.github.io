/* Savings planning: wish goals, contribution records, progress and forecasts. */
'use strict';

function savingsCategoryMeta(category) {
  return SAVINGS_GOAL_CATEGORIES.find(item => item.value === category) || SAVINGS_GOAL_CATEGORIES[SAVINGS_GOAL_CATEGORIES.length - 1];
}
function savingsPriorityMeta(priority) {
  return SAVINGS_GOAL_PRIORITIES.find(item => item.value === priority) || SAVINGS_GOAL_PRIORITIES[1];
}
function savingsStatusMeta(status) {
  return SAVINGS_GOAL_STATUSES.find(item => item.value === status) || SAVINGS_GOAL_STATUSES[0];
}
function savingsEntryTypeMeta(type) {
  return SAVINGS_ENTRY_TYPES.find(item => item.value === type) || SAVINGS_ENTRY_TYPES[0];
}
function formatSavingsMoney(amount, options={}) { return formatAccountingMoney(amount, options); }
function savingsGoalProgress(goal) {
  return goal?.targetAmount ? Math.max(0, Math.round(savingsGoalSavedAmount(goal) / goal.targetAmount * 100)) : 0;
}
function savingsGoalMonthlyNeed(goal) {
  const remaining = Math.max(0, Number(goal.targetAmount || 0) - savingsGoalSavedAmount(goal));
  if (!remaining || !goal.targetDate) return 0;
  const days = diffDays(todayStr(), goal.targetDate);
  if (!Number.isFinite(days) || days <= 0) return remaining;
  return Math.round((remaining / Math.max(1, days / 30.44)) * 100) / 100;
}
function syncSavingsGoalStatus(goal) {
  if (!goal) return;
  const saved = savingsGoalSavedAmount(goal);
  if (saved >= Number(goal.targetAmount || 0)) {
    goal.status = 'completed';
    goal.completedAt = goal.completedAt || nowDateTime();
  } else if (goal.status === 'completed') {
    goal.status = 'active';
    goal.completedAt = '';
  }
  goal.updatedAt = nowDateTime();
}
function initializeSavingsControls() {
  const categoryOptions = SAVINGS_GOAL_CATEGORIES.map(item => `<option value="${item.value}">${item.icon} ${escapeHtml(item.label)}</option>`).join('');
  if ($('savingsGoalCategory')) {
    const current = $('savingsGoalCategory').value;
    $('savingsGoalCategory').innerHTML = categoryOptions;
    $('savingsGoalCategory').value = SAVINGS_GOAL_CATEGORIES.some(item => item.value === current) ? current : 'travel';
  }
  if ($('savingsFilterCategory')) {
    const current = $('savingsFilterCategory').value;
    $('savingsFilterCategory').innerHTML = `<option value="">全部类别</option>${categoryOptions}`;
    $('savingsFilterCategory').value = current;
  }
  if ($('savingsEntryDate') && !$('savingsEntryDate').value) $('savingsEntryDate').value = todayStr();
  if ($('savingsGoalStartDate') && !$('savingsGoalStartDate').value) $('savingsGoalStartDate').value = todayStr();
  syncSavingsGoalSelect();
}
function syncSavingsGoalSelect() {
  const select = $('savingsEntryGoal');
  if (!select) return;
  const current = select.value;
  const goals = [...(state.savings?.goals || [])].sort((a, b) => {
    const order = { active:0, paused:1, completed:2 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.targetDate || '9999-99-99').localeCompare(b.targetDate || '9999-99-99');
  });
  select.innerHTML = goals.length
    ? goals.map(goal => `<option value="${goal.id}">${escapeHtml(goal.icon)} ${escapeHtml(goal.title)} · ${formatSavingsMoney(savingsGoalSavedAmount(goal), { compact:true })}/${formatSavingsMoney(goal.targetAmount, { compact:true })}</option>`).join('')
    : '<option value="">请先创建一个攒钱目标</option>';
  if (goals.some(goal => goal.id === current)) select.value = current;
}
function addSavingsGoal() {
  const title = $('savingsGoalTitle').value.trim();
  const targetAmount = Math.max(0, Number($('savingsGoalTargetAmount').value) || 0);
  if (!title) { alert('请填写未来想完成的事情。'); return; }
  if (!targetAmount) { alert('请填写大于 0 的目标金额。'); return; }
  const category = $('savingsGoalCategory').value || 'other';
  const meta = savingsCategoryMeta(category);
  const goal = normalizeSavingsGoal({
    id:uid('savegoal'),
    title,
    icon:$('savingsGoalIcon').value.trim() || meta.icon,
    category,
    targetAmount,
    initialAmount:Math.max(0, Number($('savingsGoalInitialAmount').value) || 0),
    startDate:$('savingsGoalStartDate').value || todayStr(),
    targetDate:$('savingsGoalTargetDate').value || '',
    priority:$('savingsGoalPriority').value || 'medium',
    status:'active',
    note:$('savingsGoalNote').value.trim(),
    createdAt:nowDateTime(),
    updatedAt:nowDateTime()
  });
  if (!goal) return;
  state.savings.goals.unshift(goal);
  syncSavingsGoalStatus(goal);
  $('savingsGoalTitle').value = '';
  $('savingsGoalIcon').value = '';
  $('savingsGoalTargetAmount').value = '';
  $('savingsGoalInitialAmount').value = '';
  $('savingsGoalTargetDate').value = '';
  $('savingsGoalNote').value = '';
  saveState(); renderAll();
}
function addSavingsEntry() {
  const goal = savingsGoalById($('savingsEntryGoal').value);
  if (!goal) { alert('请先选择攒钱目标。'); return; }
  const type = $('savingsEntryType').value === 'withdrawal' ? 'withdrawal' : 'deposit';
  const amount = Math.max(0, Number($('savingsEntryAmount').value) || 0);
  if (!amount) { alert('请填写大于 0 的金额。'); return; }
  if (type === 'withdrawal' && amount > savingsGoalSavedAmount(goal)) {
    alert('取出金额不能大于这个目标当前已攒金额。');
    return;
  }
  const entry = normalizeSavingsEntry({
    id:uid('saveentry'), goalId:goal.id, type, amount,
    date:$('savingsEntryDate').value || todayStr(),
    note:$('savingsEntryNote').value.trim(),
    createdAt:nowDateTime(), updatedAt:nowDateTime()
  });
  if (!entry) return;
  state.savings.entries.unshift(entry);
  syncSavingsGoalStatus(goal);
  $('savingsEntryAmount').value = '';
  $('savingsEntryNote').value = '';
  saveState(); renderAll();
}
function openSavingsGoalEditor(id) {
  const goal = savingsGoalById(id);
  if (!goal) return;
  openEditDialog({
    title:'修改攒钱目标', desc:`${goal.icon} ${goal.title}`,
    fields:[
      { name:'title', label:'未来想做的事情', value:goal.title },
      { name:'icon', label:'图标 / Emoji', value:goal.icon },
      { name:'category', label:'类别', type:'select', value:goal.category, options:SAVINGS_GOAL_CATEGORIES.map(item => ({value:item.value,label:`${item.icon} ${item.label}`})) },
      { name:'targetAmount', label:'目标金额', type:'number', value:String(goal.targetAmount) },
      { name:'initialAmount', label:'起始已有金额', type:'number', value:String(goal.initialAmount || 0) },
      { name:'startDate', label:'开始日期', type:'date', value:goal.startDate || '' },
      { name:'targetDate', label:'希望完成日期', type:'date', value:goal.targetDate || '' },
      { name:'priority', label:'优先级', type:'select', value:goal.priority, options:SAVINGS_GOAL_PRIORITIES.map(item => ({value:item.value,label:item.label})) },
      { name:'status', label:'状态', type:'select', value:goal.status, options:SAVINGS_GOAL_STATUSES.map(item => ({value:item.value,label:item.label})) },
      { name:'note', label:'为什么想做 / 备注', type:'textarea', value:goal.note || '' }
    ],
    onSave:(values) => {
      goal.title = values.title.trim() || goal.title;
      goal.icon = values.icon.trim() || savingsCategoryMeta(values.category).icon;
      goal.category = savingsCategoryMeta(values.category).value;
      goal.targetAmount = Math.max(0.01, Number(values.targetAmount) || goal.targetAmount);
      goal.initialAmount = Math.max(0, Number(values.initialAmount) || 0);
      goal.startDate = values.startDate || goal.startDate || todayStr();
      goal.targetDate = values.targetDate || '';
      goal.priority = savingsPriorityMeta(values.priority).value;
      goal.status = savingsStatusMeta(values.status).value;
      goal.note = values.note.trim();
      goal.updatedAt = nowDateTime();
      syncSavingsGoalStatus(goal);
      saveState(); renderAll();
    },
    onDelete:() => {
      state.savings.goals = state.savings.goals.filter(item => item.id !== id);
      state.savings.entries = state.savings.entries.filter(item => item.goalId !== id);
      saveState(); renderAll();
    }
  });
}
function openSavingsEntryEditor(id) {
  const entry = state.savings.entries.find(item => item.id === id);
  if (!entry) return;
  const goal = savingsGoalById(entry.goalId);
  openEditDialog({
    title:'修改攒钱记录', desc:goal ? `${goal.icon} ${goal.title}` : entry.date,
    fields:[
      { name:'goalId', label:'目标', type:'select', value:entry.goalId, options:state.savings.goals.map(item => ({value:item.id,label:`${item.icon} ${item.title}`})) },
      { name:'type', label:'类型', type:'select', value:entry.type, options:SAVINGS_ENTRY_TYPES.map(item => ({value:item.value,label:`${item.icon} ${item.label}`})) },
      { name:'amount', label:'金额', type:'number', value:String(entry.amount) },
      { name:'date', label:'日期', type:'date', value:entry.date },
      { name:'note', label:'备注', type:'textarea', value:entry.note || '' }
    ],
    onSave:(values) => {
      const oldGoal = savingsGoalById(entry.goalId);
      const nextGoal = savingsGoalById(values.goalId) || oldGoal;
      const nextType = values.type === 'withdrawal' ? 'withdrawal' : 'deposit';
      const nextAmount = Math.max(0.01, Number(values.amount) || entry.amount);
      if (nextType === 'withdrawal' && nextGoal) {
        const availableWithoutThis = savingsGoalSavedAmount(nextGoal) - (entry.goalId === nextGoal.id ? (entry.type === 'withdrawal' ? -entry.amount : entry.amount) : 0);
        if (nextAmount > Math.max(0, availableWithoutThis)) {
          alert('取出金额不能大于该目标可用的已攒金额。');
          return;
        }
      }
      entry.goalId = nextGoal?.id || entry.goalId;
      entry.type = nextType;
      entry.amount = nextAmount;
      entry.date = values.date || entry.date;
      entry.note = values.note.trim();
      entry.updatedAt = nowDateTime();
      if (oldGoal) syncSavingsGoalStatus(oldGoal);
      if (nextGoal) syncSavingsGoalStatus(nextGoal);
      saveState(); renderAll();
    },
    onDelete:() => {
      const linkedGoal = savingsGoalById(entry.goalId);
      state.savings.entries = state.savings.entries.filter(item => item.id !== id);
      if (linkedGoal) syncSavingsGoalStatus(linkedGoal);
      saveState(); renderAll();
    }
  });
}
function savingsFilteredGoals() {
  const status = $('savingsFilterStatus')?.value || '';
  const category = $('savingsFilterCategory')?.value || '';
  const query = ($('savingsFilterQuery')?.value || '').trim().toLowerCase();
  const priorityOrder = { high:0, medium:1, low:2 };
  const statusOrder = { active:0, paused:1, completed:2 };
  return [...(state.savings?.goals || [])]
    .filter(goal => !status || goal.status === status)
    .filter(goal => !category || goal.category === category)
    .filter(goal => !query || `${goal.title} ${goal.note} ${savingsCategoryMeta(goal.category).label}`.toLowerCase().includes(query))
    .sort((a,b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      || (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
      || (a.targetDate || '9999-99-99').localeCompare(b.targetDate || '9999-99-99'));
}
function renderSavingsSummary() {
  const totals = savingsTotals();
  const overall = totals.target > 0 ? Math.round(totals.saved / totals.target * 100) : 0;
  const currentBalance = accountingMonthTotals().balance;
  const cards = [
    { label:'全部目标金额', value:formatSavingsMoney(totals.target), note:`共 ${totals.count} 个愿望`, color:'text-dopamine-purple', icon:'fa-bullseye' },
    { label:'目前已经攒下', value:formatSavingsMoney(totals.saved), note:`总体完成 ${overall}%`, color:'text-emerald-600', icon:'fa-piggy-bank' },
    { label:'距离愿望还差', value:formatSavingsMoney(totals.remaining), note:`进行中 ${totals.active} 个`, color:'text-dopamine-pink', icon:'fa-route' },
    { label:'已经实现', value:`${totals.completed} 个`, note:'每一步都算数', color:'text-dopamine-orange', icon:'fa-heart' }
  ];
  $('savingsSummary').innerHTML = cards.map(item => `
    <div class="small-stat p-4 savings-kpi">
      <div class="flex items-center justify-between gap-3"><div class="text-sm text-calm-mute">${item.label}</div><i class="fa-solid ${item.icon} ${item.color}"></i></div>
      <div class="text-2xl font-black mt-2 ${item.color}">${escapeHtml(String(item.value))}</div>
      <div class="text-xs text-calm-mute mt-2">${escapeHtml(item.note)}</div>
    </div>`).join('');
  if ($('savingsAccountingHint')) {
    $('savingsAccountingHint').innerHTML = `
      <div class="font-black">本月记账参考</div>
      <div class="text-sm text-calm-mute mt-1">本月记账结余为 <span class="font-black ${currentBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${escapeHtml(formatAccountingMoney(currentBalance))}</span>。攒钱记录是目标资金调配，不会自动计为收入或支出，避免重复记账。</div>`;
  }
}
function renderSavingsGoals() {
  const goals = savingsFilteredGoals();
  $('savingsGoalCount').textContent = `${goals.length} 个`;
  $('savingsGoalList').innerHTML = goals.map(goal => {
    const category = savingsCategoryMeta(goal.category);
    const priority = savingsPriorityMeta(goal.priority);
    const status = savingsStatusMeta(goal.status);
    const saved = savingsGoalSavedAmount(goal);
    const remaining = Math.max(0, goal.targetAmount - saved);
    const progress = savingsGoalProgress(goal);
    const monthlyNeed = savingsGoalMonthlyNeed(goal);
    const days = goal.targetDate ? diffDays(todayStr(), goal.targetDate) : NaN;
    const dateHint = !goal.targetDate ? '没有设定完成日期'
      : days < 0 ? `已超过目标日期 ${Math.abs(days)} 天`
      : days === 0 ? '目标日期就是今天'
      : `距离目标日期 ${days} 天`;
    const entries = savingsEntriesForGoal(goal.id);
    return `
      <article class="savings-wish-card p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex gap-3">
            <div class="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-2xl shrink-0">${escapeHtml(goal.icon)}</div>
            <div class="min-w-0">
              <div class="font-black text-lg truncate">${escapeHtml(goal.title)}</div>
              <div class="flex flex-wrap gap-2 mt-2">
                <span class="pill bg-white border border-calm-line text-calm-mute">${category.icon} ${escapeHtml(category.label)}</span>
                <span class="pill ${priority.color}">${escapeHtml(priority.label)}</span>
                <span class="pill ${status.color}">${escapeHtml(status.label)}</span>
              </div>
            </div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange shrink-0" data-savings-goal-edit="${goal.id}">修改</button>
        </div>
        ${goal.note ? `<div class="savings-mini-note p-3 text-sm leading-6 mt-4">${escapeHtml(goal.note)}</div>` : ''}
        <div class="flex items-end justify-between gap-3 mt-4">
          <div><div class="text-xs text-calm-mute">已经攒下</div><div class="text-xl font-black text-emerald-600">${escapeHtml(formatSavingsMoney(saved))}</div></div>
          <div class="text-right"><div class="text-xs text-calm-mute">目标金额</div><div class="font-black">${escapeHtml(formatSavingsMoney(goal.targetAmount))}</div></div>
        </div>
        <div class="savings-progress-track mt-3"><div class="savings-progress-fill" style="width:${Math.min(100, progress)}%"></div></div>
        <div class="flex items-center justify-between gap-3 text-xs text-calm-mute mt-2"><span>${progress}% · 还差 ${escapeHtml(formatSavingsMoney(remaining))}</span><span>${escapeHtml(dateHint)}</span></div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 text-sm">
          <div class="small-stat p-3"><div class="text-xs text-calm-mute">希望完成</div><div class="font-black mt-1">${goal.targetDate ? escapeHtml(goal.targetDate) : '从容推进'}</div></div>
          <div class="small-stat p-3"><div class="text-xs text-calm-mute">建议每月</div><div class="font-black mt-1">${monthlyNeed ? escapeHtml(formatSavingsMoney(monthlyNeed)) : '—'}</div></div>
          <div class="small-stat p-3 col-span-2 md:col-span-1"><div class="text-xs text-calm-mute">存取记录</div><div class="font-black mt-1">${entries.length} 条</div></div>
        </div>
        <div class="flex gap-2 mt-4">
          <button class="flex-1 px-3 py-2 rounded-2xl bg-dopamine-mint text-white font-black" data-savings-quick-add="${goal.id}"><i class="fa-solid fa-plus mr-1"></i>为它存一笔</button>
          ${goal.status === 'paused' ? `<button class="px-3 py-2 rounded-2xl bg-white border border-calm-line font-bold" data-savings-resume="${goal.id}">继续</button>` : ''}
        </div>
      </article>`;
  }).join('') || '<div class="soft-card p-6 text-sm text-calm-mute">还没有符合条件的攒钱目标。先写下一个未来真正想去做的事情吧。</div>';

  $('savingsGoalList').querySelectorAll('[data-savings-goal-edit]').forEach(btn => btn.onclick = () => openSavingsGoalEditor(btn.dataset.savingsGoalEdit));
  $('savingsGoalList').querySelectorAll('[data-savings-quick-add]').forEach(btn => btn.onclick = () => {
    $('savingsEntryGoal').value = btn.dataset.savingsQuickAdd;
    $('savingsEntryType').value = 'deposit';
    $('savingsEntryAmount').focus();
    $('savingsEntryCard')?.scrollIntoView({behavior:'smooth',block:'center'});
  });
  $('savingsGoalList').querySelectorAll('[data-savings-resume]').forEach(btn => btn.onclick = () => {
    const goal = savingsGoalById(btn.dataset.savingsResume);
    if (!goal) return;
    goal.status = 'active'; goal.updatedAt = nowDateTime(); saveState(); renderAll();
  });
}
function renderSavingsEntries() {
  const entries = [...(state.savings?.entries || [])].sort((a,b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  $('savingsEntryCount').textContent = `${entries.length} 条`;
  $('savingsEntryList').innerHTML = entries.slice(0, 60).map(entry => {
    const goal = savingsGoalById(entry.goalId);
    const meta = savingsEntryTypeMeta(entry.type);
    return `
      <div class="savings-entry-row border ${meta.tone} p-3 flex items-start justify-between gap-3">
        <div class="min-w-0 flex gap-3">
          <div class="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-xl shrink-0">${meta.icon}</div>
          <div class="min-w-0">
            <div class="font-black truncate">${goal ? `${escapeHtml(goal.icon)} ${escapeHtml(goal.title)}` : '已删除目标'}</div>
            <div class="text-xs text-calm-mute mt-1">${escapeHtml(entry.date)} · ${escapeHtml(meta.label)}${entry.note ? ` · ${escapeHtml(entry.note)}` : ''}</div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="font-black ${meta.color}">${entry.type === 'withdrawal' ? '−' : '+'}${escapeHtml(formatSavingsMoney(entry.amount))}</div>
          <button class="text-xs font-bold text-dopamine-orange mt-2" data-savings-entry-edit="${entry.id}">修改</button>
        </div>
      </div>`;
  }).join('') || '<div class="text-sm text-calm-mute">还没有存取记录。完成一次小额存入，也是在认真靠近未来。</div>';
  $('savingsEntryList').querySelectorAll('[data-savings-entry-edit]').forEach(btn => btn.onclick = () => openSavingsEntryEditor(btn.dataset.savingsEntryEdit));
}
function savingsRecentMonths(count=6) {
  const result = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i=count-1; i>=0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth()-i, 1);
    result.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}`);
  }
  return result;
}
function renderSavingsCharts() {
  const months = savingsRecentMonths(6);
  const entries = state.savings?.entries || [];
  makeOrUpdateChart('savingsTrendChart','savingsTrend',{
    type:'bar',
    data:{
      labels:months.map(month => month.slice(2)),
      datasets:[
        { label:'存入', data:months.map(month => entries.filter(item => item.type === 'deposit' && item.date.startsWith(month)).reduce((sum,item)=>sum+item.amount,0)), backgroundColor:'rgba(114,199,162,.75)', borderRadius:9 },
        { label:'取出', data:months.map(month => entries.filter(item => item.type === 'withdrawal' && item.date.startsWith(month)).reduce((sum,item)=>sum+item.amount,0)), backgroundColor:'rgba(244,154,176,.62)', borderRadius:9 }
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true},x:{grid:{display:false}}}}
  });
  const goals = [...(state.savings?.goals || [])].sort((a,b)=>savingsGoalProgress(b)-savingsGoalProgress(a)).slice(0,8);
  makeOrUpdateChart('savingsProgressChart','savingsProgress',{
    type:'bar',
    data:{
      labels:goals.map(goal => `${goal.icon} ${goal.title}`),
      datasets:[{label:'完成度 %',data:goals.map(goal=>Math.min(100,savingsGoalProgress(goal))),backgroundColor:['#F49AB0','#F6C96B','#72C7A2','#8CBFE6','#B8A4E3','#F2A57F','#8FD0C3','#E7A9C6'],borderRadius:9}]
    },
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,max:100},y:{grid:{display:false}}}}
  });
}
function exportSavingsCsv() {
  const rows = [
    ['目标','类型','金额','币种','日期','备注'],
    ...(state.savings?.entries || []).map(entry => {
      const goal = savingsGoalById(entry.goalId);
      return [goal?.title || '', savingsEntryTypeMeta(entry.type).label, entry.amount, accountingCurrencyMeta().value, entry.date, entry.note];
    })
  ];
  const csv = '\uFEFF' + rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `savings_plan_${todayStr()}.csv`; link.click(); URL.revokeObjectURL(url);
}
function renderSavings() {
  initializeSavingsControls();
  renderSavingsSummary();
  renderSavingsGoals();
  renderSavingsEntries();
  renderSavingsCharts();
}
function bindSavingsEvents() {
  initializeSavingsControls();
  $('btnAddSavingsGoal').onclick = addSavingsGoal;
  $('btnAddSavingsEntry').onclick = addSavingsEntry;
  $('savingsFilterStatus').onchange = renderSavingsGoals;
  $('savingsFilterCategory').onchange = renderSavingsGoals;
  $('savingsFilterQuery').oninput = renderSavingsGoals;
  $('btnExportSavingsCsv').onclick = exportSavingsCsv;
  $('savingsEntryAmount').addEventListener('keydown', event => { if (event.key === 'Enter') addSavingsEntry(); });
}
