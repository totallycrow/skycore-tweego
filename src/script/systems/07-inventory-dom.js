/* =========================================================================
   Inventory System: DOM Updates
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { getAreaArray, getItem, isFilterActive } = Skycore.Systems.InventoryHelpers;
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
    // Inventory and wardrobe items are filtered - show icon but dimmed if doesn't match
    const hasItem = !!itemId;
    const filterActive = isFilterActive(filter);
    
    const isFilteredOut = 
      area !== "eq" &&
      hasItem &&
      filterActive &&
      !matchesFilter(itemId, filter);
    
    slotEl.dataset.item = itemId || "";
    slotEl.classList.toggle("is-filled", !!item);
    slotEl.classList.toggle("is-filtered-out", isFilteredOut);
    
    // Set data-filter-hidden attribute for drag/drop checks and disable interaction
    // Only disable slots that contain items that don't match filter
    // Empty slots remain interactive so users can move items between areas
    if (!hasItem) {
      slotEl.removeAttribute("data-filter-hidden");
      slotEl.removeAttribute("aria-disabled");
      slotEl.classList.remove("is-filtered-out");
    } else if (isFilteredOut) {
      slotEl.setAttribute("data-filter-hidden", "1");
      slotEl.setAttribute("aria-disabled", "true");
      slotEl.classList.add("is-filtered-out");
    } else {
      slotEl.removeAttribute("data-filter-hidden");
      slotEl.removeAttribute("aria-disabled");
      slotEl.classList.remove("is-filtered-out");
    }
    
    // IMPORTANT: keep icon visible even when filtered out, so slot doesn't look empty
    // This prevents UX confusion where filtered-out items appear empty but block bulk moves
    const itemEl = slotEl.querySelector(".inv-item");
    if (item) {
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
      updateOutfitVibes(root);
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
      updateOutfitVibes(root);
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
    const hasFilter = isFilterActive(filter);
    
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
    // NOTE: No need to re-bind listeners here. The drag system uses event delegation
    // on the root element ([data-inv-root="1"]), not on individual slots. When we
    // replace innerHTML, the root's listeners remain intact and continue to work
    // for the new slot elements via event bubbling.
  }

  function clearDropTargets(root) {
    root.querySelectorAll(".inv-slot.drop-target").forEach(el => el.classList.remove("drop-target"));
  }

  /**
   * Update presentation score display in inventory UI
   * Called whenever equipment changes
   * Uses PresentationState as single source of truth
   * Now updates the new modular presentation bar
   */
  function updatePresentationScore(root) {
    // Update new modular presentation bar
    const scoreEl = root.querySelector(".js-pres-score");
    const fillEl = root.querySelector(".js-pres-fill");
    const trackEl = root.querySelector(".ui-meter-track[data-meter='presentation']");

    if (scoreEl || fillEl) {
      const data = Skycore.Systems.PresentationState?.get?.();
      const presentationScore = data 
        ? Math.max(0, Math.min(100, Math.round(data.presentationScore || 0)))
        : 0;

      if (scoreEl) scoreEl.textContent = String(presentationScore);
      if (fillEl) fillEl.style.width = presentationScore + "%";
      if (trackEl) trackEl.setAttribute("aria-valuenow", String(presentationScore));
    }

    // Legacy support: update old presentation score display if it exists
    const presentationEl = root.querySelector(".char-presentation-score");
    if (presentationEl) {
      const data = Skycore.Systems.PresentationState?.get?.();
      const presentationScore = data ? Math.round(data.presentationScore || 0) : 0;
      presentationEl.textContent = presentationScore;
    }
  }

  /**
   * Update outfit vibes display in inventory UI
   * Called whenever equipment changes
   */
  function updateOutfitVibes(root) {
    const vibesEl = root.querySelector(".js-vibes-tags");
    if (!vibesEl) return;

    let vibesText = "Al naturale";
    
    if (Skycore.Systems.PresentationState) {
      const presentationData = Skycore.Systems.PresentationState.get();
      vibesText = presentationData.outfitVibesText || "Al naturale";
    } else if (Skycore.Systems.CharacterDisplay && Skycore.Systems.CharacterDisplay.getOutfitVibes) {
      const outfitVibes = Skycore.Systems.CharacterDisplay.getOutfitVibes();
      vibesText = outfitVibes.length > 0 ? outfitVibes.join(", ") : "Al naturale";
    }

    vibesEl.textContent = vibesText;
  }

  /**
   * Update character outfit comment display in inventory UI
   * Called whenever equipment changes
   * Now updates the new modular quote block
   */
  function updateCharacterComment(root) {
    if (!Skycore.Systems.PresentationEngine || !Skycore.Systems.PresentationEngine.getOutfitComment) {
      // Hide quote if system not available
      const quoteEl = root.querySelector(".eq-quote");
      if (quoteEl) quoteEl.remove();
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

    // Check if quote module is enabled
    const flags = Skycore.Config?.UI?.InventoryModules || { quote: true };
    if (!flags.quote) {
      const quoteEl = root.querySelector(".eq-quote");
      if (quoteEl) quoteEl.remove();
      return;
    }

    if (outfitComment) {
      // Update or create new modular quote block
      let quoteEl = root.querySelector(".eq-quote");
      
      if (quoteEl) {
        quoteEl.textContent = outfitComment;
        quoteEl.setAttribute("data-outfit-state", outfitState);
      } else {
        // Create new quote element in correct position (after actions, before presentation)
        const eqBottom = root.querySelector(".eq-bottom");
        if (eqBottom) {
          const actionsEl = eqBottom.querySelector(".eq-actions");
          quoteEl = document.createElement("div");
          quoteEl.className = "eq-quote";
          quoteEl.setAttribute("data-outfit-state", outfitState);
          quoteEl.setAttribute("aria-live", "polite");
          quoteEl.textContent = outfitComment;
          
          // Insert after actions, before modules
          if (actionsEl) {
            actionsEl.insertAdjacentElement("afterend", quoteEl);
          } else {
            eqBottom.insertBefore(quoteEl, eqBottom.firstChild);
          }
        }
      }
    } else {
      // Remove quote if no comment to show
      const quoteEl = root.querySelector(".eq-quote");
      if (quoteEl) quoteEl.remove();
    }

    // Legacy support: remove old comment elements if they exist
    const oldCommentEl = root.querySelector(".inv-character-comment");
    if (oldCommentEl) oldCommentEl.remove();
    const oldFullCommentEl = root.querySelector(".inv-character-comment-full");
    if (oldFullCommentEl) oldFullCommentEl.remove();
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
    // New structure: look in eq-charBox first
    let charDisplayEl = root.querySelector(".eq-charBox .char-display");
    
    // Fallback 1: search from char-card (legacy)
    if (!charDisplayEl) {
      const charCard = root.querySelector(".char-card");
      if (charCard) {
        charDisplayEl = charCard.querySelector(".char-display");
      }
    }
    
    // Fallback 2: direct search
    if (!charDisplayEl) {
      charDisplayEl = root.querySelector(".char-display");
    }
    
    // Fallback 3: if still not found, try to find the img directly and update it
    if (!charDisplayEl) {
      const charBox = root.querySelector(".eq-charBox") || root.querySelector(".char-card");
      if (charBox) {
        const spriteImg = charBox.querySelector("img");
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
        showPresentation: false // Presentation/vibes are now separate modules
      });
    }
  }

  /**
   * Update sets list fragment incrementally (preserves scroll position and focus)
   * Only updates the sets list DOM, not the entire UI
   */
  function updateSetsList(root) {
    const setsListEl = root.querySelector(".inv-sets-list");
    if (!setsListEl) return;

    const { getItem } = Skycore.Systems.InventoryHelpers;
    const sets = State.variables.invSys?.sets || [];
    
    if (sets.length === 0) {
      setsListEl.innerHTML = '<div class="inv-empty-state">(No sets saved)</div>';
      return;
    }

    setsListEl.innerHTML = sets.map(set => {
      const itemsList = set.items.map(itemId => {
        const item = getItem(itemId);
        if (!item) return '';
        return `<span class="inv-set-item-preview">${item.icon}</span>`;
      }).join('');
      
      return `
        <div class="inv-set-entry" data-set-id="${set.id}">
          <div class="inv-set-header">
            <div class="inv-set-name">${set.name}</div>
          </div>
          <div class="inv-set-items-preview">
            ${itemsList || '<span class="inv-set-empty-msg">(Empty set)</span>'}
          </div>
          <div class="inv-set-actions">
            <a href="javascript:void(0)" class="inv-link inv-set-action inv-set-action-apply" data-action="apply-set" data-set-id="${set.id}" role="button">APPLY</a>
            <a href="javascript:void(0)" class="inv-link inv-set-action inv-set-action-remove" data-action="remove-set" data-set-id="${set.id}" role="button">REMOVE</a>
          </div>
        </div>
      `;
    }).join('');
  }

  Skycore.Systems.InventoryDOM = {
    updateSlotEl,
    updateAllSlots,
    rerenderInventoryGrid,
    rerenderWardrobeGrid,
    clearDropTargets,
    updatePresentationScore,
    updateOutfitVibes,
    updateCharacterDisplay,
    updateCharacterComment,
    updateSetsList
  };
})();
