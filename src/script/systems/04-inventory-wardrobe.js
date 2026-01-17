/* =========================================================================
   Inventory System: Wardrobe Management
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { CFG, WARD_MIN_SIZE } = Skycore.Systems.InventoryConfig;
  const { firstEmptyIndex, countEmpty, resizeArray } = Skycore.Systems.InventoryHelpers;

  function ensureWardrobeCapacity(minSize) {
    const W = State.variables.invSys.wardrobe;
    if (!Array.isArray(W)) State.variables.invSys.wardrobe = [];
    const wardrobe = State.variables.invSys.wardrobe;

    const want = Math.max(minSize || 0, WARD_MIN_SIZE, wardrobe.length);
    const rows = Math.ceil(want / CFG.invCols);
    const size = rows * CFG.invCols;

    if (wardrobe.length < size) {
      const add = size - wardrobe.length;
      for (let i = 0; i < add; i++) wardrobe.push(null);
    }
  }

  function expandWardrobeOneRow() {
    const wardrobe = State.variables.invSys.wardrobe;
    for (let i = 0; i < CFG.invCols; i++) wardrobe.push(null);
  }

  // Ensure wardrobe has at least 1 empty row (CFG.invCols empty slots)
  function ensureWardrobeHasEmptyRow() {
    const wardrobe = State.variables.invSys.wardrobe;
    const emptyCount = countEmpty(wardrobe);
    if (emptyCount < CFG.invCols) {
      expandWardrobeOneRow();
    }
  }

  // Compact wardrobe: move all items to the top, keep exactly 1 extra row of empty slots
  function compactWardrobe() {
    const wardrobe = State.variables.invSys.wardrobe;
    const items = wardrobe.filter(Boolean); // Get all non-null items
    
    // Calculate minimum size: items + exactly 1 empty row (CFG.invCols), but at least WARD_MIN_SIZE
    const minSize = Math.max(WARD_MIN_SIZE, items.length + CFG.invCols);
    const rows = Math.ceil(minSize / CFG.invCols);
    const targetSize = rows * CFG.invCols;
    
    // Rebuild array: items first, then empty slots (exactly enough to reach targetSize)
    // Use resizeArray for safety
    resizeArray(wardrobe, 0, null);
    for (let i = 0; i < items.length; i++) {
      wardrobe.push(items[i]);
    }
    resizeArray(wardrobe, targetSize, null);
  }

  // Place into wardrobe (infinite). Returns placed index.
  function placeInWardrobe(itemId) {
    if (!itemId) return -1;
    const W = State.variables.invSys.wardrobe;
    let idx = firstEmptyIndex(W);
    if (idx === -1) {
      expandWardrobeOneRow();
      idx = firstEmptyIndex(W);
    }
    W[idx] = itemId;
    ensureWardrobeHasEmptyRow();
    return idx;
  }

  Skycore.Systems.InventoryWardrobe = {
    ensureWardrobeCapacity,
    expandWardrobeOneRow,
    ensureWardrobeHasEmptyRow,
    compactWardrobe,
    placeInWardrobe
  };
})();
