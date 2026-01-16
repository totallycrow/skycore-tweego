/* =========================================================================
   Inventory System: Drag and Drop
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { CFG } = Skycore.Systems.InventoryConfig;
  const { getItem, getAreaArray, isWearableClothes, getEquipSlot, findEquippedIndexBySlot, firstEmptyIndex } = Skycore.Systems.InventoryHelpers;
  const { updateSlotEl, rerenderWardrobeGrid, clearDropTargets } = Skycore.Systems.InventoryDOM;
  const { placeInWardrobe, compactWardrobe, ensureWardrobeHasEmptyRow, expandWardrobeOneRow } = Skycore.Systems.InventoryWardrobe;
  const { AlertModal, ConfirmModal, ItemModal, FilterModal } = Skycore.Systems.InventoryModals;
  const { cleanUpEquipped, cleanUpInventory, cleanUpWardrobe, unequipAll, sendAllInventoryToWardrobe, sendAllWardrobeToInventory } = Skycore.Systems.InventoryActions;
  const { setActiveTab } = Skycore.Systems.InventoryTabs;

  // ---- Pointer interactions: tap vs drag ---------------------------------
  function bindInteractions(root) {
    // Prevent duplicate bindings
    if (root.hasAttribute("data-interactions-bound")) return;
    root.setAttribute("data-interactions-bound", "true");
    
    function blurActiveIfInsideRoot() {
      const ae = document.activeElement;
      if (!ae) return;
      if (!(ae instanceof HTMLElement)) return;
      if (!root.contains(ae)) return;
    
      // Only blur interactive controls (prevents annoying blur on other things)
      const tag = ae.tagName;
      if (tag === "BUTTON" || tag === "A" || ae.classList.contains("inv-slot") || ae.classList.contains("inv-btn")) {
        ae.blur();
      }
    }

    // Function to reset focus by simulating a background click (iOS workaround)
    function resetFocus() {
      // Create a temporary invisible button, click it, then remove it
      // This forces iOS to move focus away from the clicked button
      const temp = document.createElement("button");
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      temp.style.pointerEvents = "none";
      temp.style.width = "1px";
      temp.style.height = "1px";
      temp.style.top = "-9999px";
      document.body.appendChild(temp);
      temp.focus();
      temp.click();
      setTimeout(() => {
        try { document.body.removeChild(temp); } catch(e) {}
      }, 0);
    }

    // Tabs
    root.addEventListener("click", (ev) => {
      const tabBtn = ev.target.closest("[data-tab-btn]");
      if (tabBtn) {
        setActiveTab(root, tabBtn.dataset.tabBtn);
        // Reset focus by clicking background to prevent iOS focus stickiness
        setTimeout(resetFocus, 0);
        return;
      }

      const btn = ev.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === "cleanup-eq") {
        cleanUpEquipped(root);
      }
      if (action === "cleanup-inv") {
        cleanUpInventory(root);
      }
      if (action === "cleanup-wardrobe") {
        cleanUpWardrobe(root);
      }
      if (action === "unequip-all") unequipAll(root);
      if (action === "send-inv-all-wardrobe") sendAllInventoryToWardrobe(root);
      if (action === "send-wardrobe-all-inv") sendAllWardrobeToInventory(root);

      function refreshFilteredUI() {
        // Check if filter is active
        const currentFilter = State.variables.invSys?.filter || null;
        const isFilterActive = currentFilter && (
          (Array.isArray(currentFilter.category) && currentFilter.category.length > 0) ||
          (Array.isArray(currentFilter.type) && currentFilter.type.length > 0) ||
          (Array.isArray(currentFilter.slot) && currentFilter.slot.length > 0)
        );
        
        // Update equipped slots (never filtered)
        const { updateAllSlots } = Skycore.Systems.InventoryDOM;
        updateAllSlots(root, "eq");
        
        // If filter is active, re-render inventory and wardrobe grids to show sorted order
        // Otherwise, just update slots
        if (isFilterActive) {
          const { rerenderInventoryGrid, rerenderWardrobeGrid } = Skycore.Systems.InventoryDOM;
          rerenderInventoryGrid(root);
          rerenderWardrobeGrid(root);
        } else {
          updateAllSlots(root, "inv");
          const { rerenderWardrobeGrid } = Skycore.Systems.InventoryDOM;
          rerenderWardrobeGrid(root);
        }
        
        // Update actions sections and filter button without replacing entire HTML
        
        // Update filter button
        const filterBtn = root.querySelector('[data-action="filter"]');
        if (filterBtn) {
          filterBtn.classList.toggle("has-filter", isFilterActive);
          const text = filterBtn.textContent.replace(/\s*\*$/, "");
          filterBtn.textContent = isFilterActive ? text + " *" : text;
        }
        
        // Update remove filter buttons in actions sections
        const actionSections = root.querySelectorAll('.inv-tabpanel[data-tab-panel="inventory"] .inv-actions');
        actionSections.forEach(actions => {
          const removeFilterLink = actions.querySelector('[data-action="remove-filter"]');
          if (isFilterActive) {
            // Add remove filter link if it doesn't exist
            if (!removeFilterLink) {
              const removeLink = document.createElement("a");
              removeLink.href = "javascript:void(0)";
              removeLink.className = "inv-link inv-cleanup";
              removeLink.setAttribute("data-action", "remove-filter");
              removeLink.setAttribute("role", "button");
              removeLink.textContent = "[Remove Filter]";
              // Insert before first cleanup link or at the start
              const firstCleanup = actions.querySelector('.inv-link.inv-cleanup[data-action^="cleanup"]');
              if (firstCleanup) {
                actions.insertBefore(removeLink, firstCleanup);
              } else {
                actions.insertBefore(removeLink, actions.firstChild);
              }
            }
          } else {
            // Remove filter link if it exists
            if (removeFilterLink) {
              removeFilterLink.remove();
            }
          }
        });
      }

      if (action === "filter") {
        const currentFilter = State.variables.invSys?.filter || { category: [], type: [], slot: [] };
        FilterModal.open(currentFilter, (newFilter) => {
          State.variables.invSys.filter = newFilter;
          refreshFilteredUI();
        });
      }
      
      if (action === "remove-filter") {
        State.variables.invSys.filter = { category: [], type: [], slot: [] };
        // Compact inventory and wardrobe so items start from the top after removing filter
        cleanUpInventory(root);
        compactWardrobe();
        refreshFilteredUI();
      }
      if (action === "create-set") {
        const eq = State.variables.invSys.eq;
        const equippedItems = eq.filter(Boolean);
        
        if (equippedItems.length === 0) {
          AlertModal.open({
            title: "No items equipped",
            message: "You need to equip at least one item to create a set."
          });
          return;
        }
        
        const { CreateSetModal } = Skycore.Systems.InventoryModals;
        const { createSetFromEquipped } = Skycore.Systems.InventoryActions;
        const { renderUI } = Skycore.Systems.InventoryRender;
        const { setActiveTab } = Skycore.Systems.InventoryTabs;
        
        CreateSetModal.open(equippedItems, (setName, items) => {
          createSetFromEquipped(setName, items, root);
          // Re-render UI to show the new set
          const wrap = root.parentElement;
          const currentTab = root.getAttribute("data-tab") || "inventory";
          wrap.innerHTML = renderUI("itemsets");
          const newRoot = wrap.querySelector('[data-inv-root="1"]');
          bindInteractions(newRoot);
          setActiveTab(newRoot, "itemsets");
        });
      }
      
      if (action === "apply-set") {
        const setId = btn.dataset.setId;
        if (!setId) return;
        
        const { applySet } = Skycore.Systems.InventoryActions;
        const { renderUI } = Skycore.Systems.InventoryRender;
        applySet(setId, root);
        // Refresh UI to update equipped items
        const wrap = root.parentElement;
        const currentTab = root.getAttribute("data-tab") || "inventory";
        wrap.innerHTML = renderUI(currentTab);
        const newRoot = wrap.querySelector('[data-inv-root="1"]');
        bindInteractions(newRoot);
        setActiveTab(newRoot, currentTab);
      }
      
      if (action === "remove-set") {
        const setId = btn.dataset.setId;
        if (!setId) return;
        
        const { removeSet } = Skycore.Systems.InventoryActions;
        const { renderUI } = Skycore.Systems.InventoryRender;
        removeSet(setId, root);
        // Refresh UI to update sets list
        const wrap = root.parentElement;
        const currentTab = root.getAttribute("data-tab") || "inventory";
        wrap.innerHTML = renderUI(currentTab);
        const newRoot = wrap.querySelector('[data-inv-root="1"]');
        bindInteractions(newRoot);
        setActiveTab(newRoot, currentTab);
      }

      // Immediately blur the clicked element to prevent iOS focus stickiness
      if (btn && btn instanceof HTMLElement) {
        btn.blur();
        // Also blur activeElement as a fallback
        if (document.activeElement === btn) {
          document.activeElement.blur();
        }
      }
    });

    // Ensure default visible panel
    setActiveTab(root, "inventory");

    // Aggressively blur cleanup links and action buttons on touch/mouse down to prevent focus
    root.addEventListener("mousedown", (ev) => {
      const link = ev.target.closest(".inv-link.inv-cleanup, [data-action]");
      if (link && root.contains(link)) {
        // Prevent focus by blurring immediately on mousedown
        setTimeout(() => {
          if (link instanceof HTMLElement) link.blur();
          if (document.activeElement === link) document.activeElement.blur();
        }, 0);
      }
    }, true);

    // On iOS, buttons keep focus after taps/drag-drop, causing "stuck highlight".
    // We blur on touch interactions to match native app feel.
    root.addEventListener("pointerup", (ev) => {
      if (ev.pointerType === "touch" || ev.pointerType === "pen") {
        const link = ev.target.closest(".inv-link.inv-cleanup, [data-action]");
        if (link && root.contains(link)) {
          // Immediately blur cleanup links and action buttons
          if (link instanceof HTMLElement) {
            link.blur();
            setTimeout(() => {
              if (document.activeElement === link) document.activeElement.blur();
            }, 0);
          }
        }
        // Let the click handler run first, then blur
        setTimeout(blurActiveIfInsideRoot, 10);
      }
    }, true);

    // If user taps empty background within the UI, also clear focus
    root.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "touch" || ev.pointerType === "pen") {
        const btn = ev.target.closest("button, [role='button']");
        if (!btn) setTimeout(blurActiveIfInsideRoot, 0);
      }
    }, true);

    // Hard lock scrolling while dragging (mobile Safari needs this)
    const blockTouchMove = (e) => { e.preventDefault(); };

    const drag = {
      active: false,
      started: false,
      pointerId: null,
      fromArea: null,
      fromIndex: -1,
      itemId: null,
      ghost: null,
      offsetX: 0,
      offsetY: 0,
      lastTarget: null,
      startX: 0,
      startY: 0,
      pointerType: null,
      captured: false
    };

    function createGhost(itemId) {
      const item = getItem(itemId);
      const ghost = document.createElement("div");
      ghost.className = "inv-ghost";
      ghost.innerHTML = `<span class="inv-item" aria-hidden="true">${item ? item.icon : "❔"}</span>`;
      document.body.appendChild(ghost);
      return ghost;
    }

    function moveGhost(x, y) {
      if (!drag.ghost) return;
      drag.ghost.style.transform = `translate(${x - drag.offsetX}px, ${y - drag.offsetY}px)`;
    }

    function findSlotAtPoint(x, y) {
      const el = document.elementFromPoint(x, y);
      const slot = el && el.closest ? el.closest(".inv-slot") : null;
      // Don't allow dropping on hidden (filtered) slots
      if (slot && slot.hasAttribute("data-filter-hidden")) return null;
      return slot;
    }

    function setDropTarget(slotEl) {
      if (drag.lastTarget === slotEl) return;
      if (drag.lastTarget) drag.lastTarget.classList.remove("drop-target");
      drag.lastTarget = slotEl;
      if (slotEl) slotEl.classList.add("drop-target");
    }

    function startDragging(slot, ev) {
      drag.started = true;

      // lock scroll while dragging
      document.body.classList.add("inv-dragging");
      document.addEventListener("touchmove", blockTouchMove, { passive: false });

      const slotSize =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--slot-size")) || 64;
      drag.offsetX = slotSize / 2;
      drag.offsetY = slotSize / 2;

      drag.ghost = createGhost(drag.itemId);

      if (!drag.captured) {
        slot.setPointerCapture(ev.pointerId);
        drag.captured = true;
      }

      ev.preventDefault();
      moveGhost(ev.clientX, ev.clientY);
      setDropTarget(slot);
    }

    function infoSameItem() {
      AlertModal.open({ title: "Already wearing it", message: "You're currently wearing the same item already." });
    }

    function commitDrop(targetSlot) {
      if (!targetSlot) return false;

      const toArea = targetSlot.dataset.area;
      const toIndex = Number(targetSlot.dataset.index);

      if (drag.fromArea === toArea && drag.fromIndex === toIndex) return false;

      const eq = State.variables.invSys.eq;
      const inv = State.variables.invSys.inv;
      const wardrobe = State.variables.invSys.wardrobe;

      const fromArr = getAreaArray(drag.fromArea);
      const toArr = getAreaArray(toArea);

      const fromItem = fromArr[drag.fromIndex];
      const toItem = toArr[toIndex];
      // EQ -> EQ is always a freestyle swap (never show body-slot modals for rearranging).
      if (drag.fromArea === "eq" && toArea === "eq") {
        const tmp = eq[toIndex];
        eq[toIndex] = eq[drag.fromIndex];
        eq[drag.fromIndex] = tmp;
        updateSlotEl(root, "eq", drag.fromIndex);
        updateSlotEl(root, "eq", toIndex);
        return true;
      }

      // --- EQUIP constraints ------------------------------------------------
      if (toArea === "eq") {
        if (!isWearableClothes(fromItem)) {
          AlertModal.open({ title: "Can't equip", message: "Only clothing can go into Equipped." });
          return false;
        }

        const slotKey = getEquipSlot(fromItem);
        // If dropping onto an equipped cell, ignore THAT cell (it will be replaced in the swap).
        const ignore = toIndex;
        const conflictIndex = findEquippedIndexBySlot(eq, slotKey, ignore);

        if (conflictIndex !== -1) {
          const oldId = eq[conflictIndex];

          // Duplicate itemId: pointless replacement
          if (oldId === fromItem) {
            infoSameItem();
            return false;
          }

          // If the user dropped on the actual conflicting equipped cell, replace immediately (no modal)
          if ((drag.fromArea === "inv" || drag.fromArea === "wardrobe") && toIndex === conflictIndex) {
            eq[conflictIndex] = fromItem;
            fromArr[drag.fromIndex] = oldId;

            updateSlotEl(root, "eq", conflictIndex);
            if (drag.fromArea === "wardrobe") {
              compactWardrobe();
              rerenderWardrobeGrid(root);
            } else {
              updateSlotEl(root, drag.fromArea, drag.fromIndex);
            }
            return true;
          }

          const newItem = getItem(fromItem);
          const oldItem = getItem(oldId);

          ConfirmModal.open({
            title: "Body slot occupied",
            message:
              `You're already wearing "${oldItem ? oldItem.name : oldId}" in slot "${slotKey}".\n\n` +
              `Replace it with "${newItem ? newItem.name : fromItem}"?`,
            actionText: "REPLACE",
            closeText: "CLOSE",
            closeAction: () => {},
            actionAction: (() => {
              // Capture now; drag.* will be reset by pointerup before click.
              const snap = {
                fromArea: drag.fromArea,
                fromIndex: drag.fromIndex,
                conflictIndex
              };
              return () => {
                const eq = State.variables.invSys.eq;
                const fromArr = getAreaArray(snap.fromArea);

                const A = fromArr[snap.fromIndex]; // new item
                const B = eq[snap.conflictIndex];  // old item in slot
                if (!A || !B) return;

                // Same-item safeguard (redundant but safe)
                if (A === B) {
                  infoSameItem();
                  return;
                }

                eq[snap.conflictIndex] = A;
                fromArr[snap.fromIndex] = B;

                updateSlotEl(root, "eq", snap.conflictIndex);
                if (snap.fromArea === "wardrobe") {
                  compactWardrobe();
                  rerenderWardrobeGrid(root);
                } else {
                  updateSlotEl(root, snap.fromArea, snap.fromIndex);
                }
              };
            })()
          });

          return false;
        }
      }

      // --- UNEQUIP constraints (eq -> inv/wardrobe) -------------------------
      if (drag.fromArea === "eq" && (toArea === "inv" || toArea === "wardrobe") && toItem) {
        // If dropping onto occupied destination slot, we must NOT put a non-wearable into EQ.
        if (!isWearableClothes(toItem)) {
          // Move destination item out of the way into empty destination slot
          let empty = firstEmptyIndex(toArr);

          if (empty === -1) {
            if (toArea === "wardrobe") {
              expandWardrobeOneRow();
              rerenderWardrobeGrid(root);
              empty = firstEmptyIndex(State.variables.invSys.wardrobe);
            } else {
              AlertModal.open({
                title: "Inventory is full",
                message: "You can't drop onto an occupied slot unless there is an empty inventory space."
              });
              return false;
            }
          }

          toArr[empty] = toItem;        // shift existing item
          toArr[toIndex] = fromItem;    // place equipped item here
          eq[drag.fromIndex] = null;    // equipped slot becomes empty

          updateSlotEl(root, toArea, empty);
          updateSlotEl(root, toArea, toIndex);
          updateSlotEl(root, "eq", drag.fromIndex);
          if (toArea === "wardrobe") {
            compactWardrobe();
            rerenderWardrobeGrid(root);
          }

          return true;
        }

        // If destination item IS wearable and would be swapped into EQ, enforce slot uniqueness
        const slotKey = getEquipSlot(toItem);
        const conflictIndex = findEquippedIndexBySlot(eq, slotKey, drag.fromIndex);
        if (conflictIndex !== -1) {
          const oldId = eq[conflictIndex];

          // duplicate itemId
          if (oldId === toItem) {
            infoSameItem();
            return false;
          }

          const newItem = getItem(toItem);
          const oldItem = getItem(oldId);

          ConfirmModal.open({
            title: "Body slot occupied",
            message:
              `You're already wearing "${oldItem ? oldItem.name : oldId}" in slot "${slotKey}".\n\n` +
              `Replace it with "${newItem ? newItem.name : toItem}"?`,
            actionText: "REPLACE",
            closeText: "CLOSE",
            closeAction: () => {},
            actionAction: (() => {
              const snap = {
                eqFromIndex: drag.fromIndex,
                destArea: toArea,
                destIndex: toIndex,
                conflictIndex
              };
              return () => {
                const eq = State.variables.invSys.eq;
                const dest = getAreaArray(snap.destArea);

                const A = eq[snap.eqFromIndex];   // equipped dragged out
                const B = dest[snap.destIndex];   // wearable wants to go into eq
                const C = eq[snap.conflictIndex]; // conflicting equipped

                if (!A || !B || !C) return;

                // Swap A <-> B
                eq[snap.eqFromIndex] = B;
                dest[snap.destIndex] = A;

                // Remove conflict and move it to destination empty slot (or wardrobe if dest is inv full)
                eq[snap.conflictIndex] = null;

                let empty = firstEmptyIndex(dest);
                if (empty === -1) {
                  if (snap.destArea === "wardrobe") {
                    expandWardrobeOneRow();
                    rerenderWardrobeGrid(root);
                    empty = firstEmptyIndex(State.variables.invSys.wardrobe);
                  } else {
                    // destination is inv and full: send to wardrobe (infinite)
                    placeInWardrobe(C);
                    rerenderWardrobeGrid(root);
                    updateSlotEl(root, "eq", snap.eqFromIndex);
                    updateSlotEl(root, snap.destArea, snap.destIndex);
                    updateSlotEl(root, "eq", snap.conflictIndex);
                    return;
                  }
                }

                dest[empty] = C;

                updateSlotEl(root, "eq", snap.eqFromIndex);
                updateSlotEl(root, snap.destArea, snap.destIndex);
                updateSlotEl(root, "eq", snap.conflictIndex);
                if (snap.destArea === "wardrobe") {
                  compactWardrobe();
                  rerenderWardrobeGrid(root);
                } else {
                  updateSlotEl(root, snap.destArea, empty);
                }
              };
            })()
          });

          return false;
        }
      }

      // --- Default swap/move ------------------------------------------------
      // General safety: never allow non-wearable to end up in EQ.
      if (toArea === "eq" && toItem && !isWearableClothes(toItem)) {
        AlertModal.open({ title: "Invalid state", message: "Equipped contains a non-wearable item." });
        return false;
      }

      // If moving into wardrobe and the target index is beyond the current array length,
      // expand the array first (handles virtual empty slots from filtered render)
      if (toArea === "wardrobe" && toIndex >= toArr.length) {
        const rowsNeeded = Math.ceil((toIndex + 1) / CFG.invCols);
        const currentRows = Math.ceil(toArr.length / CFG.invCols);
        const rowsToAdd = rowsNeeded - currentRows;
        for (let i = 0; i < rowsToAdd; i++) {
          expandWardrobeOneRow();
        }
        // Refresh toArr reference after expansion (toItem is already undefined, which is correct for empty slot)
        toArr = getAreaArray(toArea);
      }

      // If moving into wardrobe and there are no empty wardrobe slots, expand *before* the swap if needed.
      if (toArea === "wardrobe" && !toItem) {
        // ok (empty slot exists)
      }

      fromArr[drag.fromIndex] = toItem ?? null;
      toArr[toIndex] = fromItem;

      if (drag.fromArea === "wardrobe" && toArea !== "wardrobe") {
        // Removing item FROM wardrobe - compact
        compactWardrobe();
        rerenderWardrobeGrid(root);
        updateSlotEl(root, toArea, toIndex);
      } else if (toArea === "wardrobe" && drag.fromArea !== "wardrobe") {
        // Adding item TO wardrobe - ensure empty row
        ensureWardrobeHasEmptyRow();
        updateSlotEl(root, drag.fromArea, drag.fromIndex);
        rerenderWardrobeGrid(root);
      } else if (drag.fromArea === "wardrobe" && toArea === "wardrobe") {
        // Swapping within wardrobe - just rerender, no compaction
        rerenderWardrobeGrid(root);
      } else {
        updateSlotEl(root, drag.fromArea, drag.fromIndex);
        updateSlotEl(root, toArea, toIndex);
      }

      return true;
    }

    function endInteraction(commit = true) {
      // Tap opens modal (only if we didn't start dragging)
      if (drag.active && !drag.started && drag.itemId) {
        ItemModal.open({
          root,
          area: drag.fromArea,
          index: drag.fromIndex,
          itemId: drag.itemId
        });
      }

      if (drag.started) {
        clearDropTargets(root);
        if (commit) commitDrop(drag.lastTarget);

        if (drag.ghost) {
          drag.ghost.remove();
          drag.ghost = null;
        }

        document.body.classList.remove("inv-dragging");
        document.removeEventListener("touchmove", blockTouchMove, { passive: false });
      }

      drag.active = false;
      drag.started = false;
      drag.pointerId = null;
      drag.fromArea = null;
      drag.fromIndex = -1;
      drag.itemId = null;
      drag.lastTarget = null;
      drag.startX = 0;
      drag.startY = 0;

      // iOS: after drag/drop, the source/target button may stay focused (blue highlight).
      const wasTouch = drag.pointerType === "touch" || drag.pointerType === "pen";
      drag.pointerType = null;
      drag.captured = false;

      if (wasTouch) {
        setTimeout(() => {
          const ae = document.activeElement;
          if (ae && ae instanceof HTMLElement && root.contains(ae)) ae.blur();
        }, 0);
      }
    }

    // pointerdown: capture pointer immediately for touch devices to prevent scrolling
    root.addEventListener("pointerdown", (ev) => {
      const slot = ev.target.closest(".inv-slot");
      if (!slot) return;
      
      // Don't allow dragging from hidden (filtered) slots
      if (slot.hasAttribute("data-filter-hidden")) return;

      const area = slot.dataset.area;
      const index = Number(slot.dataset.index);
      const arr = getAreaArray(area);
      const itemId = arr[index];
      if (!itemId) return;

      drag.active = true;
      drag.pointerId = ev.pointerId;
      drag.fromArea = area;
      drag.fromIndex = index;
      drag.itemId = itemId;
      drag.startX = ev.clientX;
      drag.startY = ev.clientY;
      drag.pointerType = ev.pointerType || "mouse";
      drag.captured = false;

      // For touch devices: capture pointer immediately to prevent scrolling
      const isMouse = (ev.pointerType || "mouse") === "mouse";
      if (!isMouse) {
        slot.setPointerCapture(ev.pointerId);
        drag.captured = true;
        // Prevent default to stop scrolling immediately
        ev.preventDefault();
      }
    }, { passive: false });

    root.addEventListener("pointermove", (ev) => {
      if (!drag.active || ev.pointerId !== drag.pointerId) return;

      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      const dist2 = dx * dx + dy * dy;

      // Use different threshold for mouse vs touch
      const isMouse = drag.pointerType === "mouse";
      const threshold = isMouse ? 3 : CFG.dragStartThresholdPx;
      const threshold2 = threshold * threshold;

      // For touch devices: prevent scroll if we've captured the pointer
      if (!drag.started && drag.captured) {
        ev.preventDefault();
      }

      if (!drag.started && dist2 >= threshold2) {
        const slot = root.querySelector(`.inv-slot[data-area="${drag.fromArea}"][data-index="${drag.fromIndex}"]`);
        if (slot) startDragging(slot, ev);
      }

      if (drag.started) {
        ev.preventDefault();
        moveGhost(ev.clientX, ev.clientY);
        const slot = findSlotAtPoint(ev.clientX, ev.clientY);
        setDropTarget(slot && slot.classList.contains("inv-slot") ? slot : null);
      }
    }, { passive: false });

    root.addEventListener("pointerup", (ev) => {
      if (!drag.active || ev.pointerId !== drag.pointerId) return;
      if (drag.started || drag.captured) ev.preventDefault();
      if (drag.captured && !drag.started) {
        const slot = root.querySelector(`.inv-slot[data-area="${drag.fromArea}"][data-index="${drag.fromIndex}"]`);
        if (slot) slot.releasePointerCapture(ev.pointerId);
      }
      endInteraction(true);
    }, { passive: false });

    root.addEventListener("pointercancel", (ev) => {
      if (!drag.active || ev.pointerId !== drag.pointerId) return;
      if (drag.captured && !drag.started) {
        const slot = root.querySelector(`.inv-slot[data-area="${drag.fromArea}"][data-index="${drag.fromIndex}"]`);
        if (slot) slot.releasePointerCapture(ev.pointerId);
      }
      endInteraction(false);
    });
  }

  Skycore.Systems.InventoryDrag = {
    bindInteractions
  };
})();
