/**
 * Application bootstrap; loaded after all business modules
 * Phase-1 modularization: classic deferred scripts share the original global scope.
 */
'use strict';

ensureTaskCleanup();

bindEvents();

loadPrefs();

renderAll();

updateClock();

setInterval(updateClock, 1000);
