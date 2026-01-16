/* =========================================================================
   Skycore System: Inventory + Wardrobe + UI + Modals + Drag/Drop (mobile-first)

   Saved:
     State.variables.invSys = {
       eq[10],
       inv[20],
       wardrobe[variable],   // slot array (infinite; grows by rows)
       _seeded
     }

   Static (NOT saved):
     Skycore.Content.ItemDB

   Rules:
   - Equipped grid is freestyle (10 slots).
   - Equipped accepts CLOTHES only (cat === "clothes" && has slot).
   - No two equipped items can share the same body slot.
     If slot occupied -> modal: REPLACE (top) / CLOSE (bottom)
     Edge cases:
       * If trying to replace with the same itemId -> info modal only.
       * If you drop onto the *actual conflicting equipped cell* -> replace immediately (no confirm).

   Modal actions:
   - clothes: WEAR/REMOVE + SEND TO WARDROBE + CLOSE (close at bottom)
   - usable : USE + SEND TO WARDROBE + CLOSE (close at bottom)
              after use -> Alert modal with descAfterUse + effects/bonuses (close only)
   - misc   : SEND TO WARDROBE + CLOSE (close at bottom)

   Mobile UX:
   - You can scroll normally even when swiping on grid/slots.
   - Once a drag actually starts, page scrolling is locked (no accidental scroll).

   Module Structure (files are prefixed with numbers to ensure correct load order):
   - 01-inventory-config.js: Configuration constants
   - 02-inventory-helpers.js: Utility functions and item helpers
   - 03-inventory-state.js: State initialization and management
   - 04-inventory-wardrobe.js: Wardrobe operations
   - 05-inventory-effects.js: Item use effects
   - 06-inventory-render.js: UI rendering functions
   - 07-inventory-dom.js: DOM update functions
   - 08-inventory-modals.js: Modal components (Alert, Confirm, Item)
   - 09-inventory-actions.js: Bulk actions and cleanup
   - 10-inventory-tabs.js: Tab management
   - 11-inventory-drag.js: Drag and drop interactions
   - 12-inventory.js: Main file (this file)

   Note: Files are prefixed with numbers (01-12) to ensure Tweego loads them
   in the correct dependency order when processing scripts alphabetically.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // Ensure all modules are loaded
  if (!Skycore.Systems.InventoryConfig) {
    console.error("inventory-config.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryHelpers) {
    console.error("inventory-helpers.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryState) {
    console.error("inventory-state.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryWardrobe) {
    console.error("inventory-wardrobe.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryEffects) {
    console.error("inventory-effects.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryRender) {
    console.error("inventory-render.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryDOM) {
    console.error("inventory-dom.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryModals) {
    console.error("inventory-modals.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryActions) {
    console.error("inventory-actions.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryTabs) {
    console.error("inventory-tabs.js must be loaded before inventory.js");
    return;
  }
  if (!Skycore.Systems.InventoryDrag) {
    console.error("inventory-drag.js must be loaded before inventory.js");
    return;
  }

  const { ensureState } = Skycore.Systems.InventoryState;
  const { renderUI } = Skycore.Systems.InventoryRender;
  const { bindInteractions } = Skycore.Systems.InventoryDrag;

  // ---- Macro --------------------------------------------------------------
  Macro.add("gridInv", {
    handler() {
      ensureState();

      const wrap = document.createElement("div");
      wrap.innerHTML = renderUI("inventory");
      this.output.appendChild(wrap);

      const root = wrap.querySelector('[data-inv-root="1"]');
      bindInteractions(root);
      
      // Ensure presentation score is up-to-date when inventory opens
      if (Skycore.Systems.InventoryDOM && Skycore.Systems.InventoryDOM.updatePresentationScore) {
        Skycore.Systems.InventoryDOM.updatePresentationScore(root);
      }
    }
  });

  Skycore.Systems.Inventory = { ensureState };
})();
