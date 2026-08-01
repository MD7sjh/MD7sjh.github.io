/**
 * Navigation, overview and attendance
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 * Functions: syncStatsModeButtons, setStatsMode, applySidebarHidden, toggleSidebar, loadPrefs, navTo, updateClock, renderSidebarSnapshot, renderHomeQuickLinks, renderHomeThemeStats, addWorkLog, endWorkLog, addLeave, clearTodayLeaves, renderHomeAttendance
 */
'use strict';

function syncStatsModeButtons() {
      document.querySelectorAll('.stats-mode-btn').forEach(btn => {
        const active = btn.dataset.statsMode === statsMode;
        btn.classList.toggle('bg-dopamine-orange', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('shadow-soft', active);
        btn.classList.toggle('text-calm-mute', !active);
      });
    }

function setStatsMode(nextMode, { persist=true, rerender=true } = {}) {
      const mode = ['day','week','month'].includes(nextMode) ? nextMode : 'day';
      if (statsMode === mode) return;
      statsMode = mode;
      if (persist) localStorage.setItem(PREF_STATS_MODE_KEY, statsMode);
      syncStatsModeButtons();
      syncDashboardRangeToStatsMode();
      if (rerender) renderAll();
    }

function applySidebarHidden(hidden) {
      const layout = $('appLayout');
      if (!layout) return;
      layout.classList.toggle('layout-sidebar-hidden', !!hidden);
      const btn = $('btnSidebarToggle');
      if (!btn) return;
      const label = hidden ? '显示边栏' : '隐藏边栏';
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.innerHTML = `<i class="fa-solid ${hidden ? 'fa-angles-right' : 'fa-angles-left'}"></i>`;
    }

function toggleSidebar() {
      sidebarHidden = !sidebarHidden;
      localStorage.setItem(PREF_SIDEBAR_HIDDEN_KEY, sidebarHidden ? '1' : '0');
      applySidebarHidden(sidebarHidden);
    }

function loadPrefs() {
      const storedMode = localStorage.getItem(PREF_STATS_MODE_KEY);
      statsMode = ['day','week','month'].includes(storedMode) ? storedMode : 'day';
      sidebarHidden = localStorage.getItem(PREF_SIDEBAR_HIDDEN_KEY) === '1';
      applySidebarHidden(sidebarHidden);
      syncStatsModeButtons();
      syncDashboardRangeToStatsMode();
    }

function navTo(sectionId) {
      currentSection = sectionId;
      sections.forEach(id => $(id).classList.toggle('section-hidden', id !== sectionId));
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.target === sectionId));
      if (sectionId === 'dashboard-section') renderDashboard();
      if (sectionId === 'settings-section') refreshSettings();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

function updateClock() {
      const d = new Date();
      $('sidebarNowDate').textContent = `${d.getFullYear()}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 周${'日一二三四五六'[d.getDay()]}`;
      $('sidebarNowTime').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

function renderSidebarSnapshot() {
      $('sbFocus').textContent = formatMinutes(focusMinutesOn());
      $('sbTask').textContent = activeTask()?.title || '无';
      $('sbHabit').textContent = `${todayHabitCompletion()}%`;
      $('sbReview').textContent = String(supportPageCountOn());
      $('sbSubmission').textContent = String(runningSubmissionCount());
    }

function renderHomeQuickLinks() {
      const cards = [
        { target:'workflow-section', label:'项目看板', value:`${openTasksList().length} 项`, color:'text-dopamine-pink', icon:'fa-diagram-project' },
        { target:'submission-section', label:'投稿项目', value:`${state.submissions.length} 项`, color:'text-dopamine-sky', icon:'fa-paper-plane' },
        { target:'thesis-section', label:'论文进度', value:`${thesisOverallProgress()}%`, color:'text-dopamine-purple', icon:'fa-book-open' },
        { target:'habit-section', label:'习惯完成度', value:`${todayHabitCompletion()}%`, color:'text-dopamine-mint', icon:'fa-leaf' },
        { target:'care-section', label:'心灵关怀', value: careCountOn() ? '已记录' : '待关照', color:'text-dopamine-mint', icon:'fa-seedling' },
        { target:'mentor-section', label:'导师沟通', value: mentorCountOn() ? '已梳理' : '待整理', color:'text-dopamine-purple', icon:'fa-user-tie' },
        { target:'review-section', label:'今日复盘', value: reviewCountOn() ? '已写' : '待写', color:'text-dopamine-pink', icon:'fa-heart' },
        { target:'achievement-section', label:'已解锁成就', value:`${getAchievements().filter(a=>a.unlocked).length} 枚`, color:'text-dopamine-yellow', icon:'fa-trophy' },
        { target:'dashboard-section', label:'数据看板', value:'查看趋势', color:'text-dopamine-purple', icon:'fa-chart-line' },
        { target:'settings-section', label:'数据管理', value:'备份 / 导入', color:'text-dopamine-orange', icon:'fa-database' }
      ];
      $('homeQuickLinks').innerHTML = cards.map(card => `
        <div class="overview-link small-stat p-3" data-target="${card.target}">
          <div class="flex items-center justify-between text-sm ${card.color}"><span class="font-black">${card.label}</span><i class="fa-solid ${card.icon}"></i></div>
          <div class="mt-2 font-black text-lg">${card.value}</div>
        </div>
      `).join('');
      $('homeQuickLinks').querySelectorAll('[data-target]').forEach(el => el.onclick = () => navTo(el.dataset.target));
    }

function renderHomeThemeStats() {
      const range = getStatsRange(todayStr());
      if ($('homeStatsRangeLabel')) $('homeStatsRangeLabel').textContent = range.label;
      const days = Math.max(1, range.dates.length);
      const focusMins = range.dates.reduce((sum, d) => sum + focusMinutesOn(d), 0);
      const workMins = range.dates.reduce((sum, d) => sum + totalAttendanceMinutes(d), 0);
      const avgHabit = Math.round(range.dates.reduce((sum, d) => sum + todayHabitCompletion(d), 0) / days);
      const careEntries = range.dates.reduce((sum, d) => sum + careCountOn(d), 0);
      const mentorEntries = range.dates.reduce((sum, d) => sum + mentorCountOn(d), 0);
      const reviewEntries = range.dates.reduce((sum, d) => sum + reviewCountOn(d), 0);
      const doneTasks = state.tasks.filter(t => t.doneAt && isDateInRange(dateFromDateTime(t.doneAt), range.start, range.end)).length;
      const newSubs = state.submissions.filter(s => s.createdAt && isDateInRange(dateFromDateTime(s.createdAt), range.start, range.end)).length;
      const cards = [
        { label:`${statsModeText()}专注`, value: formatMinutes(focusMins), color:'text-dopamine-orange' },
        { label:`${statsModeText()}打卡`, value: formatMinutes(workMins), color:'text-dopamine-sky' },
        { label:`${statsModeText()}习惯均值`, value: `${avgHabit}%`, color:'text-dopamine-mint' },
        { label:`${statsModeText()}心灵关怀`, value: careEntries, color:'text-dopamine-mint' },
        { label:`${statsModeText()}导师沟通`, value: mentorEntries, color:'text-dopamine-purple' },
        { label:`${statsModeText()}复盘`, value: reviewEntries, color:'text-dopamine-pink' },
        { label:`${statsModeText()}完成任务`, value: doneTasks, color:'text-dopamine-purple' },
        { label:`${statsModeText()}新增投稿`, value: newSubs, color:'text-dopamine-sky' }
      ];
      $('homeThemeStats').innerHTML = cards.map(item => `
        <div class="small-stat p-4">
          <div class="text-sm text-calm-mute">${item.label}</div>
          <div class="text-2xl font-black mt-1 ${item.color}">${escapeHtml(String(item.value))}</div>
        </div>
      `).join('');
    }

function addWorkLog() {
      const day = getDayAttendance();
      day.logs.push({ id:uid('work'), date:todayStr(), start:nowTime(), end:null, note:'' });
      saveState(); renderAll();
    }

function endWorkLog() {
      const open = [...todayOpenLogs()].pop();
      if (!open) { alert('今天没有进行中的工作段。'); return; }
      open.end = nowTime();
      saveState(); renderAll();
    }

function addLeave() {
      const day = getDayAttendance();
      day.leaves.push({ id:uid('leave'), date:todayStr(), type:$('leaveTypeSelect').value || '其他' });
      saveState(); renderAll();
    }

function clearTodayLeaves() {
      getDayAttendance().leaves = [];
      saveState(); renderAll();
    }

function renderHomeAttendance() {
      const day = getDayAttendance();
      $('todayCheckinCount').textContent = String(day.logs.length);
      $('todayWorkMinutes').textContent = formatMinutes(totalAttendanceMinutes());
      $('todayLeaveCount').textContent = String(day.leaves.length);
      $('todayOpenLogCount').textContent = String(todayOpenLogs().length);
      const logHtml = sortByTime(day.logs).map(log => `
        <div class="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 border border-calm-line">
          <div>
            <div class="font-bold">工作段 <span class="text-xs text-calm-mute">${log.start}${log.end ? ` - ${log.end}` : ' - 进行中'}</span></div>
            <div class="text-xs text-calm-mute">${log.end ? formatMinutes(minutesBetween(log.start, log.end)) : '尚未结束'}</div>
          </div>
          <button class="text-sm font-bold text-dopamine-orange" data-edit-log="${log.id}">修改</button>
        </div>
      `).join('');
      const leaveHtml = day.leaves.map(item => `
        <div class="flex items-center justify-between gap-3 rounded-2xl bg-purple-50 px-3 py-3 border border-purple-100">
          <div><div class="font-bold text-dopamine-purple">请假：${item.type}</div><div class="text-xs text-calm-mute">${item.date}</div></div>
          <button class="text-sm font-bold text-dopamine-orange" data-edit-leave="${item.id}">修改</button>
        </div>
      `).join('');
      $('todayAttendanceList').innerHTML = logHtml + leaveHtml || '<div class="text-calm-mute text-sm">今天还没有记录。</div>';
      $('todayAttendanceList').querySelectorAll('[data-edit-log]').forEach(btn => btn.onclick = () => openWorkLogEditor(btn.dataset.editLog));
      $('todayAttendanceList').querySelectorAll('[data-edit-leave]').forEach(btn => btn.onclick = () => openLeaveEditor(btn.dataset.editLeave));
    }
