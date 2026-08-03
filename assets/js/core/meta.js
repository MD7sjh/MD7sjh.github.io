/* Shared metadata lookup helpers used by mentor and daily review modules. */
'use strict';

function mentorStatusMeta(status) {
  return MENTOR_STATUS_OPTIONS.find(item => item.value === status)
    || MENTOR_STATUS_OPTIONS[0];
}

function mentorPromiseStatusMeta(status) {
  return MENTOR_PROMISE_STATUS_OPTIONS.find(item => item.value === status)
    || MENTOR_PROMISE_STATUS_OPTIONS[0];
}

function reviewEnergyMeta(energy) {
  return REVIEW_ENERGY_OPTIONS.find(item => item.value === energy)
    || REVIEW_ENERGY_OPTIONS[1];
}
