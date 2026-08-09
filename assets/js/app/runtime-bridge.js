/* Stable bridge between modular application code and optional plugins. */
'use strict';

(() => {
  const app = {
    version: '15.0.0',
    storageKey: STORAGE_KEY,
    state,
    loadState,
    renderAll,
    getSaveState() {
      return saveState;
    },
    setSaveState(nextSaveState) {
      if (typeof nextSaveState !== 'function') {
        throw new TypeError('nextSaveState must be a function.');
      }
      saveState = nextSaveState;
    }
  };

  window.PERSONAL_WORKSPACE_APP = app;
  window.PHD_WORKSPACE_APP = app; // legacy alias for older sync plugins
  window.dispatchEvent(new CustomEvent('personal-workspace:ready', { detail: app }));
})();
