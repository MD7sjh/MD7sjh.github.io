/* Stable bridge between modular application code and optional plugins. */
'use strict';

(() => {
  const app = {
    version: '12.1.1',
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

  window.PHD_WORKSPACE_APP = app;
  window.dispatchEvent(new CustomEvent('phd-workspace:ready', { detail: app }));
})();
