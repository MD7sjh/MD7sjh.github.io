/* Central render coordinator. */
'use strict';

function renderAll() {
  updateClock();
  syncStatsModeButtons();
  renderSidebarSnapshot();
  renderHomeQuickLinks();
  renderHomeThemeStats();
  renderWorkflow();
  renderThesis();
  renderResearchIdeas();
  renderHomeAttendance();
  renderTasks();
  renderFocusTimeline();
  renderTimeline();
  renderSchedulePlanner();
  renderMentorThemeStats();
  renderMentor();
  renderReview();
  renderReviewThemeStats();
  renderSubmissionBoard();
  renderAccounting();
  renderSavings();
  renderSettingsRangeStats();
  if (currentSection === 'dashboard-section') renderDashboard();
  if (currentSection === 'settings-section') refreshSettings();
}
