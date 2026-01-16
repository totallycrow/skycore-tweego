/* =========================================================================
   UI Configuration: Modular UI toggles
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Config = Skycore.Config || {};
  Skycore.Config.UI = Skycore.Config.UI || {};

  // Toggle modules without touching render code everywhere
  Skycore.Config.UI.InventoryModules = {
    presentation: true, // can be disabled after dev
    vibes: true,
    quote: true
  };
})();
