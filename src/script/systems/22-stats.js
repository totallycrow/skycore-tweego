/* =========================================================================
   MC Sheet v1: Main System File
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // Ensure dependencies are loaded
  if (!Skycore.Systems.StatsState) {
    console.error("20-stats-state.js must be loaded before 22-stats.js");
    return;
  }
  if (!Skycore.Systems.StatsRender) {
    console.error("21-stats-render.js must be loaded before 22-stats.js");
    return;
  }

  const { ensureState } = Skycore.Systems.StatsState;
  const { renderStats } = Skycore.Systems.StatsRender;

  // ---- Macro --------------------------------------------------------------
  Macro.add("mcStats", {
    handler() {
      ensureState();

      const wrap = document.createElement("div");
      wrap.innerHTML = renderStats();
      this.output.appendChild(wrap);
    }
  });

  Skycore.Systems.Stats = { ensureState };
})();
