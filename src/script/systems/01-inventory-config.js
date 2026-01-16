/* =========================================================================
   Inventory System: Configuration
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const CFG = Object.freeze({
    eqCols: 2,
    invCols: 4,
    invRows: 5,
    wardrobeMinRows: 3,
    dragStartThresholdPx: 10
  });

  const EQ_SIZE = CFG.eqCols * CFG.invRows;      // 10
  const INV_SIZE = CFG.invCols * CFG.invRows;   // 20
  const WARD_MIN_SIZE = CFG.invCols * CFG.wardrobeMinRows; // 12 (3 rows)

  Skycore.Systems.InventoryConfig = {
    CFG,
    EQ_SIZE,
    INV_SIZE,
    WARD_MIN_SIZE
  };
})();
