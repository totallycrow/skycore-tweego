/* =========================================================================
   Inventory System: DOM Updates
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { getAreaArray, getItem } = Skycore.Systems.InventoryHelpers;
  const { renderWardrobeSlots, slotHTML, matchesFilter } = Skycore.Systems.InventoryRender;
  const { ensureWardrobeHasEmptyRow } = Skycore.Systems.InventoryWardrobe;

  function updateSlotEl(root, area, index, opts = {}) {
    const { skipSideEffects = false } = opts;
    const arr = getAreaArray(area);
    const itemId = arr[index];
    const item = getItem(itemId);
    const filter = State.variables.invSys?.filter || null;
    const { matchesFilter } = Skycore.Systems.InventoryRender;

    const slotEl = root.querySelector(`.inv-slot[data-area="${area}"][data-index="${index}"]`);
    if (!slotEl) return;

    // Update filter visibility
    // Equipped items are NEVER filtered - always visible
    // Empty slots always match (always visible)
    // Inventory and wardrobe items are filtered - hide item icon if doesn't match
    const shouldShowItem = (area === "eq") ? true : (!itemId || !filter || matchesFilter(itemId, filter));
    
    slotEl.dataset.item = itemId || "";
    slotEl.classList.toggle("is-filled", !!item);
    slotEl.classList.toggle("inv-item-hidden", !!item && !shouldShowItem);
    
    // Update item icon
    const itemEl = slotEl.querySelector(".inv-item");
    if (item && shouldShowItem) {
      if (itemEl) {
        itemEl.textContent = item.icon;
      } else {
        const newItemEl = document.createElement("span");
        newItemEl.className = "inv-item";
        newItemEl.setAttribute("aria-hidden", "true");
        newItemEl.textContent = item.icon;
        slotEl.appendChild(newItemEl);
      }
    } else {
      if (itemEl) {
        itemEl.remove();
      }
    }
    
    slotEl.setAttribute("aria-label", item ? item.name : "Empty slot");

    // Update presentation score, character display, and comment if equipment changed
    if (area === "eq" && !skipSideEffects) {
      // Invalidate presentation state cache so fresh data is computed
      if (Skycore.Systems.PresentationState && Skycore.Systems.PresentationState.invalidate) {
        Skycore.Systems.PresentationState.invalidate();
      }
      
      updatePresentationScore(root);
      updateCharacterDisplay(root);
      updateCharacterComment(root);
      
      // Update character sidebar components throughout the page
      if (Skycore.Systems.CharacterSidebar && Skycore.Systems.CharacterSidebar.updateAll) {
        Skycore.Systems.CharacterSidebar.updateAll();
      }
    }
  }

  function updateAllSlots(root, area) {
    const arr = getAreaArray(area);

    if (area === "eq") {
      // Update all equipment slots without side effects
      for (let i = 0; i < arr.length; i++) {
        updateSlotEl(root, area, i, { skipSideEffects: true });
      }

      // Do expensive side effects once after all slots are updated
      // Invalidate presentation state cache so fresh data is computed
      if (Skycore.Systems.PresentationState && Skycore.Systems.PresentationState.invalidate) {
        Skycore.Systems.PresentationState.invalidate();
      }
      
      updatePresentationScore(root);
      updateCharacterDisplay(root);
      updateCharacterComment(root);
      
      // Update character sidebar components throughout the page
      if (Skycore.Systems.CharacterSidebar && Skycore.Systems.CharacterSidebar.updateAll) {
        Skycore.Systems.CharacterSidebar.updateAll();
      }
      return;
    }

    // For non-equipment areas, update normally (no side effects needed)
    for (let i = 0; i < arr.length; i++) {
      updateSlotEl(root, area, i);
    }
  }

  function rerenderInventoryGrid(root) {
    const grid = root.querySelector('[data-grid="inv"]:not([data-grid="wardrobe"])');
    if (!grid) return;
    const filter = State.variables.invSys?.filter || null;
    const inv = State.variables.invSys.inv;
    
    // Check if filter is active
    const hasFilter = filter && (
      (Array.isArray(filter.category) && filter.category.length > 0) ||
      (Array.isArray(filter.type) && filter.type.length > 0) ||
      (Array.isArray(filter.slot) && filter.slot.length > 0)
    );
    
    if (!hasFilter) {
      // No filter: render in original order
      const { slotHTML } = Skycore.Systems.InventoryRender;
      grid.innerHTML = inv.map((id, i) => {
        return slotHTML("inv", i, id, filter, true);
      }).join("");
    } else {
      // With filter: render in sorted order
      const { slotHTML, matchesFilter } = Skycore.Systems.InventoryRender;
      const items = inv.map((id, i) => ({
        id,
        originalIndex: i,
        isEmpty: !id,
        itemMatches: id ? matchesFilter(id, filter) : false
      }));
      
      // Sort: matching items first, then empty slots, then non-matching items
      items.sort((a, b) => {
        if (a.isEmpty && b.isEmpty) {
          return a.originalIndex - b.originalIndex;
        }
        if (a.isEmpty) return 1;
        if (b.isEmpty) return -1;
        if (a.itemMatches && b.itemMatches) {
          return a.originalIndex - b.originalIndex;
        }
        if (a.itemMatches) return -1;
        if (b.itemMatches) return 1;
        return a.originalIndex - b.originalIndex;
      });
      
      grid.innerHTML = items.map(item => {
        const displayMatches = item.isEmpty || item.itemMatches;
        return slotHTML("inv", item.originalIndex, item.id, filter, displayMatches);
      }).join("");
    }
  }

  function rerenderWardrobeGrid(root) {
    ensureWardrobeHasEmptyRow();
    const grid = root.querySelector('[data-grid="wardrobe"]');
    if (!grid) return;
    const filter = State.variables.invSys?.filter || null;
    const { renderWardrobeSlots } = Skycore.Systems.InventoryRender;
    grid.innerHTML = renderWardrobeSlots(filter);
    // Re-bind drag interactions after re-rendering
    if (Skycore.Systems.InventoryDrag && Skycore.Systems.InventoryDrag.bindInteractions) {
      const rootEl = grid.closest('[data-inv-root="1"]');
      if (rootEl) {
        // Re-bind only if needed - the bindInteractions should handle existing bindings
        // Actually, we shouldn't re-bind here as it might cause duplicate listeners
        // The slots will work because they're in the same root
      }
    }
  }

  function clearDropTargets(root) {
    root.querySelectorAll(".inv-slot.drop-target").forEach(el => el.classList.remove("drop-target"));
  }

  /**
   * Update presentation score display in inventory UI
   * Called whenever equipment changes
   * Uses PresentationState as single source of truth
   */
  function updatePresentationScore(root) {
    const presentationEl = root.querySelector(".char-presentation-score");
    if (!presentationEl) return;

    const data = Skycore.Systems.PresentationState?.get?.();
    const presentationScore = data ? Math.round(data.presentationScore || 0) : 0;
    presentationEl.textContent = presentationScore;
  }

  /**
   * Update character outfit comment display in inventory UI
   * Called whenever equipment changes
   */
  function updateCharacterComment(root) {
    const commentEl = root.querySelector(".inv-character-comment");
    if (!Skycore.Systems.PresentationEngine || !Skycore.Systems.PresentationEngine.getOutfitComment) {
      // Hide comment if system not available
      if (commentEl) commentEl.remove();
      return;
    }

    let outfitComment = "";
    let outfitState = "";
    try {
      const commentData = Skycore.Systems.PresentationEngine.getOutfitComment();
      if (commentData && commentData.comment) {
        outfitComment = commentData.comment;
        outfitState = commentData.state || "";
      }
    } catch (e) {
      console.error("Error getting outfit comment:", e);
    }

    if (outfitComment) {
      // Check for both old (inside eq-row) and new (full-width) comment locations
      let fullWidthCommentEl = root.querySelector(".inv-character-comment-full");
      
      // Update or create full-width comment (new location)
      if (fullWidthCommentEl) {
        fullWidthCommentEl.textContent = outfitComment;
        fullWidthCommentEl.setAttribute("data-outfit-state", outfitState);
      } else {
        // Remove old comment if it exists
        if (commentEl) commentEl.remove();
        
        // Create new full-width comment element
        const invPanel = root.querySelector(".inv-panel");
        if (invPanel) {
          const eqRow = invPanel.querySelector(".eq-row");
          const newCommentEl = document.createElement("div");
          newCommentEl.className = "inv-character-comment-full";
          newCommentEl.setAttribute("data-outfit-state", outfitState);
          newCommentEl.textContent = outfitComment;
          // Insert after eq-row, before actions-centered
          if (eqRow) {
            eqRow.insertAdjacentElement("afterend", newCommentEl);
          } else {
            invPanel.appendChild(newCommentEl);
          }
        }
      }
      
      // Also remove old comment if it still exists (migration)
      if (commentEl && !fullWidthCommentEl) {
        commentEl.remove();
      }
    } else {
      // Remove both old and new comments if no comment to show
      if (commentEl) commentEl.remove();
      const fullWidthCommentEl = root.querySelector(".inv-character-comment-full");
      if (fullWidthCommentEl) fullWidthCommentEl.remove();
    }
  }

  /**
   * Update character display sprite based on equipment state
   * Called whenever equipment changes
   */
  function updateCharacterDisplay(root) {
    if (!Skycore.Systems.CharacterDisplay || !Skycore.Systems.CharacterDisplay.update) {
      return;
    }

    // Try multiple ways to find the character display element
    let charDisplayEl = root.querySelector(".char-display");
    
    // Fallback 1: search from char-card
    if (!charDisplayEl) {
      const charCard = root.querySelector(".char-card");
      if (charCard) {
        charDisplayEl = charCard.querySelector(".char-display");
      }
    }
    
    // Fallback 2: if still not found, try to find the img directly and update it
    if (!charDisplayEl) {
      const charCard = root.querySelector(".char-card");
      if (charCard) {
        const spriteImg = charCard.querySelector("img");
        if (spriteImg) {
          // Update the sprite directly if we can't find the wrapper
          const eq = State.variables.invSys?.eq || [];
          if (Skycore.Systems.CharacterDisplay.getBaseSprite) {
            const spritePath = Skycore.Systems.CharacterDisplay.getBaseSprite(eq);
            spriteImg.src = spritePath;
            spriteImg.setAttribute("src", spritePath);
            return;
          }
        }
      }
    }
    
    if (charDisplayEl) {
      Skycore.Systems.CharacterDisplay.update(charDisplayEl, {
        showPresentation: true
      });
    }
  }

  Skycore.Systems.InventoryDOM = {
    updateSlotEl,
    updateAllSlots,
    rerenderInventoryGrid,
    rerenderWardrobeGrid,
    clearDropTargets,
    updatePresentationScore,
    updateCharacterDisplay,
    updateCharacterComment
  };
})();
