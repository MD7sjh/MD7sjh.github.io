/* Personal accounting: transactions, budgets, filters, CSV export, and charts. */
'use strict';

function accountingTypeMeta(type) {
  return ACCOUNTING_TRANSACTION_TYPES.find(item => item.value === type) || ACCOUNTING_TRANSACTION_TYPES[0];
}
function accountingCategoryMeta(category, type='expense') {
  const all = [...ACCOUNTING_EXPENSE_CATEGORIES, ...ACCOUNTING_INCOME_CATEGORIES];
  return all.find(item => item.value === category)
    || accountingCategoriesForType(type)[accountingCategoriesForType(type).length - 1];
}
function accountingAccountMeta(account) {
  return ACCOUNTING_ACCOUNTS.find(item => item.value === account) || ACCOUNTING_ACCOUNTS[1];
}
function accountingCurrencyMeta() {
  const code = state.accounting?.settings?.currency || 'CNY';
  return ACCOUNTING_CURRENCIES.find(item => item.value === code) || ACCOUNTING_CURRENCIES[0];
}
function formatAccountingMoney(amount, options={}) {
  const value = Number(amount) || 0;
  const currency = accountingCurrencyMeta();
  try {
    return new Intl.NumberFormat('zh-CN', {
      style:'currency', currency:currency.value,
      minimumFractionDigits: options.compact ? 0 : 2,
      maximumFractionDigits: options.compact ? 0 : 2
    }).format(value);
  } catch (_) {
    return `${currency.symbol}${value.toFixed(options.compact ? 0 : 2)}`;
  }
}
function currentAccountingMonth() {
  return $('accountingMonth')?.value || accountingMonthKey();
}
function ensureAccountingMonthBudget(month=currentAccountingMonth()) {
  if (!state.accounting.budgets[month]) state.accounting.budgets[month] = normalizeAccountingBudget({});
  return state.accounting.budgets[month];
}
function accountingMonthDays(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return [];
  const count = new Date(year, monthNumber, 0).getDate();
  return Array.from({length:count}, (_, index) => `${month}-${pad(index + 1)}`);
}
function accountingFilteredTransactions() {
  const month = currentAccountingMonth();
  const type = $('accountingFilterType')?.value || '';
  const category = $('accountingFilterCategory')?.value || '';
  const account = $('accountingFilterAccount')?.value || '';
  const query = ($('accountingFilterQuery')?.value || '').trim().toLowerCase();
  return (state.accounting?.transactions || [])
    .filter(item => String(item.date || '').startsWith(month))
    .filter(item => !type || item.type === type)
    .filter(item => !category || item.category === category)
    .filter(item => !account || item.account === account)
    .filter(item => {
      if (!query) return true;
      const cat = accountingCategoryMeta(item.category, item.type);
      const acc = accountingAccountMeta(item.account);
      return `${item.note} ${cat.label} ${acc.label}`.toLowerCase().includes(query);
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
}
function syncAccountingCategorySelect(selectId, type='expense', includeAll=false) {
  const select = $(selectId);
  if (!select) return;
  const current = select.value;
  const categories = includeAll
    ? [...ACCOUNTING_EXPENSE_CATEGORIES, ...ACCOUNTING_INCOME_CATEGORIES]
    : accountingCategoriesForType(type);
  const prefix = includeAll ? '<option value="">全部分类</option>' : '';
  select.innerHTML = prefix + categories.map(item => `<option value="${item.value}">${item.icon} ${escapeHtml(item.label)}</option>`).join('');
  if ([...select.options].some(option => option.value === current)) select.value = current;
}
function syncAccountingFormOptions() {
  const type = $('accountingType')?.value || 'expense';
  syncAccountingCategorySelect('accountingCategory', type, false);
}
function initializeAccountingControls() {
  if ($('accountingMonth') && !$('accountingMonth').value) $('accountingMonth').value = accountingMonthKey();
  if ($('accountingDate') && !$('accountingDate').value) $('accountingDate').value = todayStr();
  if ($('accountingCurrency')) $('accountingCurrency').value = state.accounting.settings.currency || 'CNY';
  syncAccountingFormOptions();
  syncAccountingCategorySelect('accountingFilterCategory', 'expense', true);
  syncAccountingCategorySelect('accountingBudgetCategory', 'expense', false);
}
function addAccountingTransaction() {
  const amount = Math.abs(Number($('accountingAmount').value) || 0);
  if (!amount) { alert('请填写大于 0 的金额。'); return; }
  const item = normalizeAccountingTransaction({
    id:uid('money'),
    type:$('accountingType').value,
    amount,
    category:$('accountingCategory').value,
    account:$('accountingAccount').value,
    date:$('accountingDate').value || todayStr(),
    note:$('accountingNote').value.trim(),
    createdAt:nowDateTime(),
    updatedAt:nowDateTime()
  });
  if (!item) return;
  state.accounting.transactions.unshift(item);
  $('accountingAmount').value = '';
  $('accountingNote').value = '';
  saveState();
  renderAll();
}
function saveAccountingSettings() {
  const currency = $('accountingCurrency').value;
  state.accounting.settings.currency = ACCOUNTING_CURRENCIES.some(item => item.value === currency) ? currency : 'CNY';
  saveState();
  renderAll();
}
function saveAccountingMonthlyBudget() {
  const month = currentAccountingMonth();
  const budget = ensureAccountingMonthBudget(month);
  budget.total = Math.max(0, Math.round((Number($('accountingMonthlyBudget').value) || 0) * 100) / 100);
  saveState();
  renderAll();
}
function saveAccountingCategoryBudget() {
  const month = currentAccountingMonth();
  const category = $('accountingBudgetCategory').value;
  const amount = Math.max(0, Math.round((Number($('accountingCategoryBudgetAmount').value) || 0) * 100) / 100);
  if (!category) return;
  const budget = ensureAccountingMonthBudget(month);
  if (amount > 0) budget.categories[category] = amount;
  else delete budget.categories[category];
  $('accountingCategoryBudgetAmount').value = '';
  saveState();
  renderAll();
}
function deleteAccountingCategoryBudget(category) {
  const budget = ensureAccountingMonthBudget();
  delete budget.categories[category];
  saveState();
  renderAll();
}
function openAccountingTransactionEditor(id) {
  const item = state.accounting.transactions.find(entry => entry.id === id);
  if (!item) return;
  const categoryOptions = accountingCategoriesForType(item.type).map(entry => ({ value:entry.value, label:`${entry.icon} ${entry.label}` }));
  openEditDialog({
    title:'修改记账记录',
    desc:`${item.date} · ${accountingTypeMeta(item.type).label}`,
    fields:[
      { name:'type', label:'类型', type:'select', value:item.type, options:ACCOUNTING_TRANSACTION_TYPES.map(entry => ({ value:entry.value, label:entry.label })) },
      { name:'amount', label:'金额', type:'number', value:String(item.amount) },
      { name:'category', label:'分类', type:'select', value:item.category, options:categoryOptions },
      { name:'account', label:'账户 / 支付方式', type:'select', value:item.account, options:ACCOUNTING_ACCOUNTS.map(entry => ({ value:entry.value, label:`${entry.icon} ${entry.label}` })) },
      { name:'date', label:'日期', type:'date', value:item.date },
      { name:'note', label:'备注', type:'textarea', value:item.note || '' }
    ],
    onSave:(values) => {
      const nextType = values.type === 'income' ? 'income' : 'expense';
      const nextCategories = accountingCategoriesForType(nextType);
      item.type = nextType;
      item.amount = Math.max(0.01, Math.abs(Number(values.amount) || item.amount));
      item.category = nextCategories.some(entry => entry.value === values.category) ? values.category : nextCategories[nextCategories.length - 1].value;
      item.account = ACCOUNTING_ACCOUNTS.some(entry => entry.value === values.account) ? values.account : 'bank';
      item.date = values.date || item.date;
      item.note = values.note.trim();
      item.updatedAt = nowDateTime();
      saveState(); renderAll();
    },
    onDelete:() => {
      state.accounting.transactions = state.accounting.transactions.filter(entry => entry.id !== id);
      saveState(); renderAll();
    }
  });
}
function renderAccountingSummary() {
  const month = currentAccountingMonth();
  const totals = accountingMonthTotals(month);
  const budget = ensureAccountingMonthBudget(month);
  const remaining = budget.total - totals.expense;
  const savingsRate = totals.income > 0 ? Math.round((totals.balance / totals.income) * 100) : 0;
  const cards = [
    { label:'本月收入', value:formatAccountingMoney(totals.income), note:`${totals.count} 条收支记录`, color:'text-emerald-600', icon:'fa-arrow-trend-up' },
    { label:'本月支出', value:formatAccountingMoney(totals.expense), note:'控制节奏，不苛责自己', color:'text-rose-600', icon:'fa-arrow-trend-down' },
    { label:'本月结余', value:formatAccountingMoney(totals.balance), note:`储蓄率 ${savingsRate}%`, color:totals.balance >= 0 ? 'text-dopamine-sky' : 'text-rose-600', icon:'fa-piggy-bank' },
    { label:'预算剩余', value:budget.total ? formatAccountingMoney(remaining) : '未设置', note:budget.total ? `预算 ${formatAccountingMoney(budget.total)}` : '设置月预算后自动计算', color:remaining >= 0 ? 'text-dopamine-purple' : 'text-rose-600', icon:'fa-wallet' }
  ];
  $('accountingSummary').innerHTML = cards.map(item => `
    <div class="small-stat p-4 accounting-summary-card">
      <div class="flex items-center justify-between gap-3"><div class="text-sm text-calm-mute">${item.label}</div><i class="fa-solid ${item.icon} ${item.color}"></i></div>
      <div class="text-2xl font-black mt-2 ${item.color}">${escapeHtml(item.value)}</div>
      <div class="text-xs text-calm-mute mt-2">${escapeHtml(item.note)}</div>
    </div>`).join('');

  const percent = budget.total ? Math.max(0, Math.round((totals.expense / budget.total) * 100)) : 0;
  const visualPercent = Math.min(100, percent);
  $('accountingBudgetOverview').innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><div class="font-black">${escapeHtml(month)} 月度预算</div><div class="text-sm text-calm-mute mt-1">已支出 ${escapeHtml(formatAccountingMoney(totals.expense))}${budget.total ? ` / ${escapeHtml(formatAccountingMoney(budget.total))}` : ''}</div></div>
      <span class="pill ${!budget.total ? 'bg-gray-100 text-calm-mute' : percent <= 80 ? 'bg-emerald-100 text-emerald-700' : percent <= 100 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}">${budget.total ? `${percent}%` : '待设置'}</span>
    </div>
    <div class="mt-3 h-3 rounded-full bg-white overflow-hidden border border-calm-line"><div class="h-full rounded-full ${percent > 100 ? 'bg-rose-400' : 'bg-gradient-to-r from-dopamine-mint via-dopamine-yellow to-dopamine-pink'}" style="width:${visualPercent}%"></div></div>
    ${budget.total && percent > 100 ? `<div class="text-xs text-rose-600 font-bold mt-2">本月已超出预算 ${escapeHtml(formatAccountingMoney(totals.expense - budget.total))}</div>` : ''}`;
  setInputIfIdle('accountingMonthlyBudget', budget.total || '');
}
function renderAccountingCategoryBudgets() {
  const month = currentAccountingMonth();
  const budget = ensureAccountingMonthBudget(month);
  const expenses = accountingTransactionsInMonth(month).filter(item => item.type === 'expense');
  const rows = Object.entries(budget.categories)
    .map(([category, limit]) => {
      const meta = accountingCategoryMeta(category, 'expense');
      const spent = expenses.filter(item => item.category === category).reduce((sum, item) => sum + item.amount, 0);
      const percent = limit ? Math.round(spent / limit * 100) : 0;
      return { category, limit, spent, percent, meta };
    })
    .sort((a, b) => b.percent - a.percent);
  $('accountingCategoryBudgetList').innerHTML = rows.map(item => `
    <div class="rounded-2xl border border-calm-line bg-white p-3">
      <div class="flex items-center justify-between gap-3">
        <div class="font-bold">${item.meta.icon} ${escapeHtml(item.meta.label)}</div>
        <button class="text-xs font-bold text-rose-600" data-budget-delete="${item.category}">删除</button>
      </div>
      <div class="flex items-center justify-between text-xs text-calm-mute mt-2"><span>${escapeHtml(formatAccountingMoney(item.spent))} / ${escapeHtml(formatAccountingMoney(item.limit))}</span><span>${item.percent}%</span></div>
      <div class="mt-2 h-2 rounded-full bg-calm-bg overflow-hidden"><div class="h-full rounded-full ${item.percent > 100 ? 'bg-rose-400' : 'bg-dopamine-mint'}" style="width:${Math.min(100,item.percent)}%"></div></div>
    </div>`).join('') || '<div class="text-sm text-calm-mute">还没有分类预算。可先给餐饮、交通或科研等常用分类设置额度。</div>';
  $('accountingCategoryBudgetList').querySelectorAll('[data-budget-delete]').forEach(button => button.onclick = () => deleteAccountingCategoryBudget(button.dataset.budgetDelete));
}
function renderAccountingTransactions() {
  const items = accountingFilteredTransactions();
  const monthItems = accountingTransactionsInMonth(currentAccountingMonth());
  $('accountingTransactionCount').textContent = `${items.length} / ${monthItems.length} 条`;
  $('accountingTransactionList').innerHTML = items.map(item => {
    const type = accountingTypeMeta(item.type);
    const category = accountingCategoryMeta(item.category, item.type);
    const account = accountingAccountMeta(item.account);
    const signedAmount = item.type === 'income' ? item.amount : -item.amount;
    return `
      <div class="accounting-transaction-row rounded-2xl border border-calm-line bg-white p-4 flex items-start justify-between gap-4">
        <div class="flex items-start gap-3 min-w-0">
          <div class="accounting-category-icon ${type.tone}">${category.icon}</div>
          <div class="min-w-0">
            <div class="font-black truncate">${escapeHtml(category.label)}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</div>
            <div class="text-xs text-calm-mute mt-1">${escapeHtml(item.date)} · ${account.icon} ${escapeHtml(account.label)} · ${escapeHtml(type.label)}</div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-lg font-black ${type.color}">${signedAmount > 0 ? '+' : '−'}${escapeHtml(formatAccountingMoney(Math.abs(signedAmount)))}</div>
          <button class="text-xs font-bold text-dopamine-orange mt-2" data-accounting-edit="${item.id}">修改</button>
        </div>
      </div>`;
  }).join('') || '<div class="text-sm text-calm-mute py-5 text-center">这个筛选范围内还没有记录。先记下今天的一笔收支吧。</div>';
  $('accountingTransactionList').querySelectorAll('[data-accounting-edit]').forEach(button => button.onclick = () => openAccountingTransactionEditor(button.dataset.accountingEdit));
}
function renderAccountingCharts() {
  if (currentSection !== 'accounting-section') return;
  const month = currentAccountingMonth();
  const dates = accountingMonthDays(month);
  const items = accountingTransactionsInMonth(month);
  makeOrUpdateChart('accountingTrendChart', 'accountingTrend', {
    type:'bar',
    data:{
      labels:dates.map(date => date.slice(8)),
      datasets:[
        { label:'收入', data:dates.map(date => items.filter(item => item.date === date && item.type === 'income').reduce((sum,item)=>sum+item.amount,0)), backgroundColor:'rgba(114,199,162,.72)', borderRadius:8 },
        { label:'支出', data:dates.map(date => items.filter(item => item.date === date && item.type === 'expense').reduce((sum,item)=>sum+item.amount,0)), backgroundColor:'rgba(244,127,159,.62)', borderRadius:8 }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, scales:{ y:{beginAtZero:true}, x:{grid:{display:false}} } }
  });
  const expenses = items.filter(item => item.type === 'expense');
  const categoryRows = ACCOUNTING_EXPENSE_CATEGORIES
    .map(category => ({ category, value:expenses.filter(item => item.category === category.value).reduce((sum,item)=>sum+item.amount,0) }))
    .filter(item => item.value > 0)
    .sort((a,b)=>b.value-a.value);
  makeOrUpdateChart('accountingCategoryChart', 'accountingCategory', {
    type:'doughnut',
    data:{
      labels:categoryRows.map(item => `${item.category.icon} ${item.category.label}`),
      datasets:[{ data:categoryRows.map(item => item.value), backgroundColor:['#F49AB0','#F6C96B','#72C7A2','#8CBFE6','#B8A4E3','#F2A57F','#8FD0C3','#E7A9C6','#AAB7E8','#CFB18E','#92C6A7','#D3C6C0'], borderWidth:0 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'64%', plugins:{ legend:{position:'bottom', labels:{boxWidth:11,usePointStyle:true}} } }
  });
}
function renderAccounting() {
  initializeAccountingControls();
  renderAccountingSummary();
  renderAccountingCategoryBudgets();
  renderAccountingTransactions();
  renderAccountingCharts();
}
function escapeCsvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text;
}
function exportAccountingCsv() {
  const items = accountingFilteredTransactions();
  const rows = [
    ['日期','类型','金额','币种','分类','账户','备注'],
    ...items.map(item => [item.date, accountingTypeMeta(item.type).label, item.amount, accountingCurrencyMeta().value, accountingCategoryMeta(item.category,item.type).label, accountingAccountMeta(item.account).label, item.note])
  ];
  const csv = '\uFEFF' + rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `accounting_${currentAccountingMonth()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
function bindAccountingEvents() {
  initializeAccountingControls();
  $('accountingType').onchange = syncAccountingFormOptions;
  $('btnAddAccountingTransaction').onclick = addAccountingTransaction;
  $('btnSaveAccountingBudget').onclick = saveAccountingMonthlyBudget;
  $('btnSaveCategoryBudget').onclick = saveAccountingCategoryBudget;
  $('accountingCurrency').onchange = saveAccountingSettings;
  $('accountingMonth').onchange = renderAll;
  $('btnAccountingCurrentMonth').onclick = () => { $('accountingMonth').value = accountingMonthKey(); renderAll(); };
  $('accountingFilterType').onchange = renderAccounting;
  $('accountingFilterCategory').onchange = renderAccounting;
  $('accountingFilterAccount').onchange = renderAccounting;
  $('accountingFilterQuery').oninput = renderAccountingTransactions;
  $('btnExportAccountingCsv').onclick = exportAccountingCsv;
  $('accountingAmount').addEventListener('keydown', event => { if (event.key === 'Enter') addAccountingTransaction(); });
}
