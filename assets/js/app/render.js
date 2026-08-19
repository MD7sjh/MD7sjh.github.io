/* Central render coordinator. */
'use strict';

function renderAll() {
  updateClock();
  syncStatsModeButtons();
  renderSidebarSnapshot();
  renderHomeQuickLinks();
  renderHomeThemeStats();
  renderWorkflow();
  renderPapers();
  renderResearchIdeas();
  renderExperiments();
  renderHomeAttendance();
  renderTasks();
  renderFocusTimeline();
  renderTimeline();
  renderSchedulePlanner();
  renderTravel();
  renderUpwardThemeStats();
  renderUpward();
  renderReview();
  renderReviewThemeStats();
  renderSubmissionBoard();
  renderSettingsRangeStats();
  if (currentSection === 'dashboard-section') renderDashboard();
  if (currentSection === 'settings-section') refreshSettings();
}
