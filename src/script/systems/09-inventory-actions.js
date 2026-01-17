/* =========================================================================
   Inventory System: Bulk Actions
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { EQ_SIZE, INV_SIZE } = Skycore.Systems.InventoryConfig;
  const { getAreaArray, firstEmptyIndex, countEmpty, getEquipSlot, getItem, findEquippedIndexBySlot, resizeArray, isFilterActive } = Skycore.Systems.InventoryHelpers;
  const { updateAllSlots, rerenderWardrobeGrid, updateSlotEl } = Skycore.Systems.InventoryDOM;
  const { placeInWardrobe, ensureWardrobeHasEmptyRow, compactWardrobe } = Skycore.Systems.InventoryWardrobe;
  const { matchesFilter } = Skycore.Systems.InventoryRender;

  // Clean up: sort items by body slot (head to feet), then compact to the top
  function cleanUpEquipped(root) {
    const invSys = State.variables.invSys;
    if (!invSys || !Array.isArray(invSys.eq)) {
      const { logError } = Skycore.Systems.ErrorHandler || {};
      if (logError) {
        logError("InventoryActions.cleanUpEquipped", "invSys.eq not initialized", { invSys });
      } else {
        console.warn('cleanUpEquipped: invSys.eq not initialized');
      }
      return;
    }
    const eq = invSys.eq;
    const items = eq.filter(Boolean);
    
    // Define slot order from top to bottom (head to feet)
    // Note: overHead comes before head (items that go on top of head items)
    const slotOrder = [
      "overHead", "head", "face", "neck",
      "overUpper", "upper", "underUpper",
      "hands",
      "lower", "underLower",
      "legs",
      "feet"
    ];
    
    // Sort items by their slot position (items without slots go last)
    items.sort((a, b) => {
      const slotA = getEquipSlot(a) || "";
      const slotB = getEquipSlot(b) || "";
      const indexA = slotOrder.indexOf(slotA);
      const indexB = slotOrder.indexOf(slotB);
      
      // If slot not found, put it at the end
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      
      return posA - posB;
    });
    
    // Clear the array and fill with sorted items (use resizeArray for safety)
    resizeArray(eq, 0, null);
    for (let i = 0; i < items.length; i++) {
      eq.push(items[i]);
    }
    resizeArray(eq, EQ_SIZE, null);
    
    updateAllSlots(root, "eq");
  }

  function cleanUpInventory(root) {
    const invSys = State.variables.invSys;
    if (!invSys || !Array.isArray(invSys.inv)) {
      const { logError } = Skycore.Systems.ErrorHandler || {};
      if (logError) {
        logError("InventoryActions.cleanUpInventory", "invSys.inv not initialized", { invSys });
      } else {
        console.warn('cleanUpInventory: invSys.inv not initialized');
      }
      return;
    }
    const inv = invSys.inv;
    const items = inv.filter(Boolean);
    resizeArray(inv, 0, null);
    for (let i = 0; i < items.length; i++) {
      inv.push(items[i]);
    }
    resizeArray(inv, INV_SIZE, null);
    
    // Check if filter is active - if so, re-render to show sorted order
    const filter = State.variables.invSys?.filter || null;
    const hasFilter = isFilterActive(filter);
    
    if (hasFilter) {
      const { rerenderInventoryGrid } = Skycore.Systems.InventoryDOM;
      rerenderInventoryGrid(root);
    } else {
      updateAllSlots(root, "inv");
    }
  }

  function cleanUpWardrobe(root) {
    compactWardrobe();
    rerenderWardrobeGrid(root);
  }

  function unequipAll(root) {
    const invSys = State.variables.invSys;
    if (!invSys || !Array.isArray(invSys.eq) || !Array.isArray(invSys.inv)) {
      const { logError } = Skycore.Systems.ErrorHandler || {};
      if (logError) {
        logError("InventoryActions.unequipAll", "invSys not properly initialized", { invSys });
      } else {
        console.warn('unequipAll: invSys not properly initialized');
      }
      return;
    }
    const eq = invSys.eq;
    const inv = invSys.inv;

    const equippedItems = eq.filter(Boolean);
    if (!equippedItems.length) return;

    const emptyInv = countEmpty(inv);

    if (equippedItems.length > emptyInv) {
      Skycore.Systems.InventoryModals.ConfirmModal.open({
        title: "Not enough space",
        message:
          `Your inventory doesn't have enough empty slots to unequip everything.\n\n` +
          `Equipped items: ${equippedItems.length}\n` +
          `Empty inventory slots: ${emptyInv}\n\n` +
          `What would you like to do?`,
        actionText: "SEND TO WARDROBE INSTEAD",
        closeText: "CLOSE",
        closeAction: () => {},
        actionAction: () => {
          for (let i = 0; i < eq.length; i++) {
            if (eq[i]) {
              placeInWardrobe(eq[i]);
              eq[i] = null;
            }
          }
          ensureWardrobeHasEmptyRow();
          updateAllSlots(root, "eq");
          rerenderWardrobeGrid(root);
        }
      });
      return;
    }

    for (let i = 0; i < eq.length; i++) {
      const itemId = eq[i];
      if (!itemId) continue;

      const idx = firstEmptyIndex(inv);
      if (idx === -1) break;
      inv[idx] = itemId;
      eq[i] = null;
    }

    updateAllSlots(root, "eq");
    updateAllSlots(root, "inv");
  }

  function sendAllInventoryToWardrobe(root) {
    const inv = State.variables.invSys.inv;
    const filter = State.variables.invSys?.filter || null;
    const hasFilter = isFilterActive(filter);
    let movedAny = false;

    for (let i = 0; i < inv.length; i++) {
      if (inv[i]) {
        // If filter is active, only move items that match the filter
        if (hasFilter && !matchesFilter(inv[i], filter)) {
          continue;
        }
        placeInWardrobe(inv[i]);
        inv[i] = null;
        movedAny = true;
      }
    }

    if (movedAny) {
      ensureWardrobeHasEmptyRow();
      updateAllSlots(root, "inv");
      rerenderWardrobeGrid(root);
    }
  }

  function sendAllWardrobeToInventory(root) {
    const wardrobe = State.variables.invSys.wardrobe;
    const inv = State.variables.invSys.inv;
    const filter = State.variables.invSys?.filter || null;
    const hasFilter = isFilterActive(filter);
    
    let attempted = 0;
    let moved = 0;

    // First pass: count items we'll attempt to move
    for (let i = 0; i < wardrobe.length; i++) {
      if (wardrobe[i]) {
        // If filter is active, only count items that match the filter
        if (hasFilter && !matchesFilter(wardrobe[i], filter)) {
          continue;
        }
        attempted++;
      }
    }

    // If wardrobe is empty (or no items match filter), show message
    if (attempted === 0) {
      const message = hasFilter 
        ? "No items in wardrobe match your current filter."
        : "Your wardrobe is empty.";
      Skycore.Systems.InventoryModals.AlertModal.open({
        title: "Wardrobe is empty",
        message: message
      });
      return;
    }

    // Second pass: actually move items
    for (let i = 0; i < wardrobe.length; i++) {
      if (wardrobe[i]) {
        // If filter is active, only move items that match the filter
        if (hasFilter && !matchesFilter(wardrobe[i], filter)) {
          continue;
        }
        const emptyIdx = firstEmptyIndex(inv);
        if (emptyIdx === -1) break; // Inventory full, stop
        inv[emptyIdx] = wardrobe[i];
        wardrobe[i] = null;
        moved++;
      }
    }

    const remaining = attempted - moved;

    // Update UI if we moved anything
    if (moved > 0) {
      compactWardrobe();
      updateAllSlots(root, "inv");
      rerenderWardrobeGrid(root);
    }

    // Show modals based on results
    if (attempted > 0 && moved === 0) {
      // Inventory full, nothing moved
      let message = "You don't have any empty inventory slots. Move items to wardrobe or equip them to free space.";
      if (hasFilter) {
        message += "\n\nTip: Some items may be hidden by your active filter.";
      }
      Skycore.Systems.InventoryModals.AlertModal.open({
        title: "Inventory is full",
        message: message
      });
      return;
    }

    if (remaining > 0) {
      // Partial transfer - some items moved, some couldn't
      let message = `Moved ${moved} item${moved === 1 ? "" : "s"} to inventory.\n\n${remaining} item${remaining === 1 ? "" : "s"} could not be moved because your inventory ran out of space.`;
      if (hasFilter) {
        message += "\n\nTip: Some items may be hidden by your active filter.";
      }
      Skycore.Systems.InventoryModals.AlertModal.open({
        title: "Inventory is full",
        message: message
      });
      return;
    }

    // Success case: all items moved (no modal needed, just silent success)
    // Optional: could add a toast here if you have a toast system
  }

  // ---- Sets Management -----------------------------------------------------

  function createSetFromEquipped(name, items, root) {
    if (!items || items.length === 0) {
      Skycore.Systems.InventoryModals.AlertModal.open({
        title: "No items",
        message: "You need to include at least one item to create a set."
      });
      return;
    }

    const setId = `set:${Date.now()}`;
    const newSet = {
      id: setId,
      name: name.trim() || "Untitled Set",
      items: [...items] // Copy the array
    };

    if (!State.variables.invSys.sets) {
      State.variables.invSys.sets = [];
    }
    State.variables.invSys.sets.push(newSet);

    Skycore.Systems.InventoryModals.AlertModal.open({
      title: "Set created",
      message: `"${newSet.name}" has been saved with ${items.length} item${items.length !== 1 ? "s" : ""}.`
    });
  }

  function applySet(setId, root) {
    const sets = State.variables.invSys.sets || [];
    const set = sets.find(s => s.id === setId);
    if (!set) return;

    const eq = State.variables.invSys.eq;
    const inv = State.variables.invSys.inv;
    const wardrobe = State.variables.invSys.wardrobe;

    // Get currently equipped items (to remove them)
    const currentlyEquipped = eq.filter(Boolean);
    
    // First, unequip all currently equipped items
    // Try to move to inventory first, then wardrobe if not enough space
    let itemsToMoveToWardrobe = [];
    
    for (let i = 0; i < eq.length; i++) {
      const itemId = eq[i];
      if (!itemId) continue;
      
      const emptyIdx = firstEmptyIndex(inv);
      if (emptyIdx !== -1) {
        inv[emptyIdx] = itemId;
        eq[i] = null;
        updateSlotEl(root, "inv", emptyIdx);
      } else {
        // Not enough inventory space, mark for wardrobe
        itemsToMoveToWardrobe.push({ index: i, itemId });
      }
    }

    // Move remaining items to wardrobe
    itemsToMoveToWardrobe.forEach(({ index, itemId }) => {
      eq[index] = null;
      placeInWardrobe(itemId);
      updateSlotEl(root, "eq", index);
    });

    if (itemsToMoveToWardrobe.length > 0) {
      ensureWardrobeHasEmptyRow();
      compactWardrobe();
      rerenderWardrobeGrid(root);
      updateAllSlots(root, "inv");
    } else {
      updateAllSlots(root, "eq");
      updateAllSlots(root, "inv");
    }

    // Now equip the set items
    let hasWardrobeChange = false;
    for (const itemId of set.items) {
      const slotKey = getEquipSlot(itemId);
      if (!slotKey) continue; // Skip non-wearable items
      
      // Check if item is already equipped in this slot
      const conflictIndex = findEquippedIndexBySlot(eq, slotKey, -1);
      
      // Try to find item in inventory or wardrobe
      let itemFound = false;
      let fromArea = null;
      let fromIndex = -1;

      // Check inventory first
      for (let i = 0; i < inv.length; i++) {
        if (inv[i] === itemId) {
          fromArea = "inv";
          fromIndex = i;
          itemFound = true;
          break;
        }
      }

      // If not in inventory, check wardrobe
      if (!itemFound) {
        for (let i = 0; i < wardrobe.length; i++) {
          if (wardrobe[i] === itemId) {
            fromArea = "wardrobe";
            fromIndex = i;
            itemFound = true;
            break;
          }
        }
      }

      if (!itemFound) continue; // Item not found, skip it

      // If slot is occupied, replace it
      if (conflictIndex !== -1) {
        const oldItemId = eq[conflictIndex];
        if (oldItemId !== itemId) {
          // Replace: move old item to where new item was
          const fromArr = getAreaArray(fromArea);
          fromArr[fromIndex] = oldItemId;
          eq[conflictIndex] = itemId;
          updateSlotEl(root, fromArea, fromIndex);
          updateSlotEl(root, "eq", conflictIndex);
          if (fromArea === "wardrobe") {
            hasWardrobeChange = true;
          }
        }
      } else {
        // Find empty slot
        const emptyIdx = firstEmptyIndex(eq);
        if (emptyIdx === -1) continue; // Equipment full

        const fromArr = getAreaArray(fromArea);
        fromArr[fromIndex] = null;
        eq[emptyIdx] = itemId;
        updateSlotEl(root, fromArea, fromIndex);
        updateSlotEl(root, "eq", emptyIdx);
        if (fromArea === "wardrobe") {
          hasWardrobeChange = true;
        }
      }
    }

    if (hasWardrobeChange) {
      compactWardrobe();
      rerenderWardrobeGrid(root);
    }
    updateAllSlots(root, "eq");
    updateAllSlots(root, "inv");
  }

  function removeSet(setId, root) {
    const sets = State.variables.invSys.sets || [];
    const setIndex = sets.findIndex(s => s.id === setId);
    if (setIndex === -1) return;

    // Remove the set from the saved sets array
    sets.splice(setIndex, 1);
  }

  Skycore.Systems.InventoryActions = {
    cleanUpEquipped,
    cleanUpInventory,
    cleanUpWardrobe,
    unequipAll,
    sendAllInventoryToWardrobe,
    sendAllWardrobeToInventory,
    createSetFromEquipped,
    applySet,
    removeSet
  };
})();
