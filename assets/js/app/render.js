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
  renderAccounting();
  renderSavings();
  renderSettingsRangeStats();
  if (currentSection === 'dashboard-section') renderDashboard();
  if (currentSection === 'settings-section') refreshSettings();
}
