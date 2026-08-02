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
  renderHomeAttendance();
  renderTasks();
  renderFocusTimeline();
  renderTimeline();
  renderSchedulePlanner();
  renderHabitSnapshot();
  renderHabitList();
  renderHabitManager();
  renderFoods();
  renderWeights();
  renderCareThemeStats();
  renderCare();
  renderMentorThemeStats();
  renderMentor();
  renderReview();
  renderReviewThemeStats();
  renderAchievements();
  renderAchievementRangeStats();
  renderSubmissionBoard();
  renderAccounting();
  renderSettingsRangeStats();
  if (currentSection === 'dashboard-section') renderDashboard();
  if (currentSection === 'settings-section') refreshSettings();
}
