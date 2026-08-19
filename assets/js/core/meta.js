/* Shared metadata lookup helpers used by upward management and daily review modules. */
'use strict';

function upwardStatusMeta(status) {
  return UPWARD_STATUS_OPTIONS.find(item => item.value === status) || UPWARD_STATUS_OPTIONS[0];
}
function upwardPromiseStatusMeta(status) {
  return UPWARD_PROMISE_STATUS_OPTIONS.find(item => item.value === status) || UPWARD_PROMISE_STATUS_OPTIONS[0];
}
function upwardRoleMeta(role) {
  return UPWARD_ROLE_OPTIONS.find(item => item.value === role) || UPWARD_ROLE_OPTIONS[UPWARD_ROLE_OPTIONS.length - 1];
}
function paperTypeMeta(type) {
  return PAPER_TYPES.find(item => item.value === type) || PAPER_TYPES[PAPER_TYPES.length - 1];
}
function paperStatusMeta(status) {
  return PAPER_STATUSES.find(item => item.value === status) || PAPER_STATUSES[0];
}
function travelStatusMeta(status) {
  return TRAVEL_PLAN_STATUSES.find(item => item.value === status) || TRAVEL_PLAN_STATUSES[0];
}
function travelNoteTypeMeta(type) {
  return TRAVEL_NOTE_TYPES.find(item => item.value === type) || TRAVEL_NOTE_TYPES[TRAVEL_NOTE_TYPES.length - 1];
}

function experimentTaskMeta(type) {
  return EXPERIMENT_TASK_TYPES.find(item => item.value === type) || EXPERIMENT_TASK_TYPES[EXPERIMENT_TASK_TYPES.length - 1];
}
function experimentStatusMeta(status) {
  return EXPERIMENT_STATUSES.find(item => item.value === status) || EXPERIMENT_STATUSES[0];
}
function experimentArtifactTypeMeta(type) {
  return EXPERIMENT_ARTIFACT_TYPES.find(item => item.value === type) || EXPERIMENT_ARTIFACT_TYPES[EXPERIMENT_ARTIFACT_TYPES.length - 1];
}
function experimentMetricPreset(name) {
  return EXPERIMENT_METRIC_PRESETS.find(item => item.name === name) || null;
}

function reviewEnergyMeta(energy) {
  return REVIEW_ENERGY_OPTIONS.find(item => item.value === energy) || REVIEW_ENERGY_OPTIONS[1];
}
