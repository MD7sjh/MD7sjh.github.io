/* DOM event binding and application startup. */
'use strict';

function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.onclick = () => navTo(btn.dataset.target));
  document.querySelectorAll('.stats-mode-btn').forEach(btn => btn.onclick = () => setStatsMode(btn.dataset.statsMode));
  $('btnSidebarToggle').onclick = toggleSidebar;

  bindPaperEvents();

  $('btnCheckinStart').onclick = addWorkLog;
  $('btnCheckinEnd').onclick = endWorkLog;
  $('btnLeaveAdd').onclick = addLeave;
  $('btnCloseOpenLogs').onclick = closeAllOpenLogs;
  $('btnClearTodayLeaves').onclick = clearTodayLeaves;

  $('workflowDate').value = todayStr();
  if ($('workflowProjectStartDate')) $('workflowProjectStartDate').value = todayStr();
  $('workflowDate').onchange = renderAll;
  $('btnWorkflowToday').onclick = () => { $('workflowDate').value = todayStr(); renderAll(); };
  $('btnWorkflowCapture').onclick = addWorkflowCaptureTask;
  $('btnAddWorkflowProject').onclick = addWorkflowProject;
  $('workflowTaskFilter').onchange = renderWorkflow;
  if ($('workflowProjectFilterSelect')) $('workflowProjectFilterSelect').onchange = () => { workflowSelectedProjectId = $('workflowProjectFilterSelect').value || ''; renderWorkflow(); };
  const jumpWorkflowToSchedule = () => {
    $('scheduleDate').value = $('workflowDate').value || todayStr();
    navTo('home-section');
    renderAll();
  };
  $('btnWorkflowJumpScheduleTop').onclick = jumpWorkflowToSchedule;

  $('btnAddTask').onclick = addTask;
  $('taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  $('btnFocusStart').onclick = startFocus;
  $('btnFocusStop').onclick = stopFocus;
  $('btnFocusDiscard').onclick = discardFocus;
  $('manualFocusDate').value = todayStr();
  $('btnAddManualFocus').onclick = addManualFocus;
  $('scheduleDate').value = todayStr();
  $('scheduleDate').onchange = renderAll;
  $('btnScheduleToday').onclick = () => { $('scheduleDate').value = todayStr(); renderAll(); };
  $('scheduleTaskSelect').onchange = () => {
    const task = state.tasks.find(item => item.id === $('scheduleTaskSelect').value);
    if (!task) return;
    $('scheduleTaskTitle').value = task.title;
    if (parseHM($('scheduleTaskStart').value) && task.estimate) $('scheduleTaskEnd').value = addMinutesToHM($('scheduleTaskStart').value, task.estimate);
  };
  $('scheduleTaskStart').onchange = () => {
    const task = state.tasks.find(item => item.id === $('scheduleTaskSelect').value);
    if (task?.estimate && parseHM($('scheduleTaskStart').value)) $('scheduleTaskEnd').value = addMinutesToHM($('scheduleTaskStart').value, task.estimate);
  };
  $('btnAddTaskBlock').onclick = addScheduledTaskBlock;



  bindUpwardEvents();

  $('reviewDate').value = todayStr();
  $('reviewDate').onchange = renderAll;
  $('btnSaveDailyReview').onclick = saveDailyReview;
  $('btnDeleteDailyReview').onclick = () => { if (confirm('确定清空这天的每日复盘吗？')) deleteDailyReview(); };
  $('btnDownloadReviewMd').onclick = downloadReviewMarkdown;
  $('btnReviewToday').onclick = () => { $('reviewDate').value = todayStr(); renderAll(); };

  $('btnToggleSubmissionForm').onclick = () => $('submissionFormWrap').classList.toggle('hidden');
  $('btnCancelSubmissionForm').onclick = () => $('submissionFormWrap').classList.add('hidden');
  $('btnAddSubmission').onclick = addSubmission;
  $('submissionFilterQuery').oninput = renderSubmissionBoard;
  $('submissionFilterMonth').onchange = renderSubmissionBoard;
  $('submissionFilterStage').onchange = renderSubmissionBoard;
  $('submissionLogDate').value = todayStr();
  $('submissionLogProject').onchange = renderSubmissionLogs;
  $('btnAddSubmissionLog').onclick = addSubmissionLog;
  $('btnDownloadSubmissionMd').onclick = downloadSubmissionMarkdown;

  bindExperimentEvents();
  bindTravelEvents();
  bindResearchIdeaEvents();

  $('dashboardRange').onchange = () => {
    const v = String($('dashboardRange').value || '');
    if (v === '7') setStatsMode('week');
    else if (v === '30') setStatsMode('month');
    else setStatsMode('day');
  };

  $('btnExportJson').onclick = exportJson;
  $('btnCopyJson').onclick = copyJson;
  $('btnImportJsonText').onclick = () => importJsonText($('jsonEditor').value);
  $('btnRefreshJsonPreview').onclick = refreshSettings;
  $('btnClearAllData').onclick = clearAllData;
  $('importFile').onchange = async (e) => { const file = e.target.files?.[0]; if (!file) return; importJsonText(await file.text()); e.target.value=''; };

  $('btnCloseEditDialog').onclick = closeEditDialog;
  $('btnSaveRecord').onclick = () => { if (editContext?.onSave) editContext.onSave(collectEditValues()); closeEditDialog(); };
  $('btnDeleteRecord').onclick = () => { if (editContext?.onDelete && confirm('确定删除这条记录吗？')) { editContext.onDelete(); closeEditDialog(); } };
}

bindEvents();
loadPrefs();
renderAll();
updateClock();
setInterval(updateClock, 1000);
