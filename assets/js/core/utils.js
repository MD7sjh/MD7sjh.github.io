/* Date, time, formatting, escaping, and range helpers. */
'use strict';

function uid(prefix='id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function pad(n) { return String(n).padStart(2,'0'); }
function todayStr(offset=0) { const d = new Date(); d.setDate(d.getDate()+offset); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function nowTime() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function nowDateTime() { const d = new Date(); return `${todayStr()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function parseYMD(dateStr) {
  const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0,0,0,0);
  return d;
}
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function dateFromDateTime(dtStr='') { return String(dtStr || '').slice(0,10); }
function shiftDate(dateStr, offset=0) {
  const d = parseYMD(dateStr);
  if (!d) return todayStr(offset);
  d.setDate(d.getDate() + offset);
  return ymd(d);
}
function parseHM(v) { if (!v) return null; const m=String(v).match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; const h=+m[1], mm=+m[2]; if(h<0||h>23||mm<0||mm>59) return null; return `${pad(h)}:${pad(mm)}`; }
function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function hmToMinutes(hm) { const t=parseHM(hm); if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; }
function minutesBetween(start,end) { let s=hmToMinutes(start), e=hmToMinutes(end); if (e < s) e += 24*60; return Math.max(0, e-s); }
function formatMinutes(mins) { mins = Math.round(Number(mins)||0); const h=Math.floor(mins/60), m=mins%60; return h>0 ? `${h}小时 ${m}分钟` : `${m}分钟`; }
function formatDurationHM(mins) { mins=Math.round(Number(mins)||0); const h=Math.floor(mins/60), m=mins%60; return `${pad(h)}:${pad(m)}`; }
function addMinutesToHM(start, mins) {
  const base = hmToMinutes(start);
  const total = (base + Math.max(0, Number(mins) || 0)) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
function bytesToKB(bytes) { return `${(bytes/1024).toFixed(1)} KB`; }
function dayLabel(dateStr) { const d=parseYMD(dateStr); return d ? `${dateStr} · 周${'日一二三四五六'[d.getDay()]}` : String(dateStr || ''); }
function sortByTime(arr, key='start') { return [...arr].sort((a,b)=>(a[key]||'').localeCompare(b[key]||'')); }
function jsDateFrom(dateStr, hm='00:00') { return new Date(`${dateStr}T${parseHM(hm)||'00:00'}:00`); }
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function diffDays(fromDateStr, toDateStr) {
  const a = parseYMD(fromDateStr);
  const b = parseYMD(toDateStr);
  if (!a || !b) return NaN;
  return Math.round((b - a) / (1000 * 3600 * 24));
}
function startOfWeek(dateStr) {
  const d = parseYMD(dateStr);
  if (!d) return todayStr();
  // Monday as first day of week.
  const weekday = d.getDay(); // 0 Sun - 6 Sat
  const diff = weekday === 0 ? 6 : weekday - 1;
  d.setDate(d.getDate() - diff);
  return ymd(d);
}
function startOfMonth(dateStr) {
  const d = parseYMD(dateStr);
  if (!d) return todayStr();
  d.setDate(1);
  return ymd(d);
}
function dateSpan(startStr, endStr) {
  const start = parseYMD(startStr);
  const end = parseYMD(endStr);
  if (!start || !end || start > end) return [];
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(ymd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
function isDateInRange(dateStr, startStr, endStr) {
  if (!dateStr || !startStr || !endStr) return false;
  return dateStr >= startStr && dateStr <= endStr;
}
function statsModeText(baseDate=todayStr()) {
  if (statsMode === 'week') return '本周';
  if (statsMode === 'month') return '本月';
  return baseDate === todayStr() ? '今日' : '当日';
}
function getStatsRange(baseDate=todayStr()) {
  const base = baseDate || todayStr();
  if (statsMode === 'week') {
    const start = startOfWeek(base);
    return { start, end: base, dates: dateSpan(start, base), label: `本周 ${start} ~ ${base}` };
  }
  if (statsMode === 'month') {
    const start = startOfMonth(base);
    return { start, end: base, dates: dateSpan(start, base), label: `本月 ${start} ~ ${base}` };
  }
  return { start: base, end: base, dates: [base], label: dayLabel(base) };
}
function recentDates(days=7) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) dates.push(todayStr(-i));
  return dates;
}
