/* =========================================================================
   Inventory System: Rendering
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { getItem, getCat, getEquipSlot } = Skycore.Systems.InventoryHelpers;
  const { ensureWardrobeCapacity, ensureWardrobeHasEmptyRow } = Skycore.Systems.InventoryWardrobe;
  const { CFG, WARD_MIN_SIZE } = Skycore.Systems.InventoryConfig;

  function matchesFilter(itemId, filter) {
    if (!filter) return true;
    // Empty slots always match (always visible)
    if (!itemId) return true;

    const item = getItem(itemId);
    if (!item) return true; // If item not found, show it (safer)

    // Check if any filters are active
    const hasCategoryFilter = Array.isArray(filter.category) && filter.category.length > 0;
    const hasTypeFilter = Array.isArray(filter.type) && filter.type.length > 0;
    const hasSlotFilter = Array.isArray(filter.slot) && filter.slot.length > 0;

    if (!hasCategoryFilter && !hasTypeFilter && !hasSlotFilter) return true;

    // Filter logic:
    // - Within each filter category: OR logic (item matches if it matches ANY selected value in that category)
    //   Example: If category filter = ["clothes", "usable"], show items that are "clothes" OR "usable"
    // - Across different filter categories: OR logic (item matches if it matches ANY active category)
    //   Example: If category = ["clothes"] OR type = ["beauty"], show items that are "clothes" OR "beauty"
    //   This means: show all items from selected categories/types/slots combined
    
    // Item matches if it matches at least one active filter category
    let matchesAny = false;
    
    if (hasCategoryFilter && filter.category.includes(getCat(item))) {
      matchesAny = true;
    }
    // Support both new structure (subtype) and legacy (type)
    const itemSubtype = item.subtype || item.type;
    if (hasTypeFilter && itemSubtype && filter.type.includes(itemSubtype)) {
      matchesAny = true;
    }
    if (hasSlotFilter && filter.slot.includes(getEquipSlot(itemId))) {
      matchesAny = true;
    }
    
    return matchesAny;
  }

  function slotHTML(area, index, itemId, filter = null, matchesFilter = true) {
    const item = getItem(itemId);
    const filled = item ? "is-filled" : "";
    const label = item ? `${item.name}` : "Empty slot";
    
    // Determine if item is filtered out
    const hasItem = !!itemId;
    const filterActive = filter && (
      (Array.isArray(filter.category) && filter.category.length > 0) ||
      (Array.isArray(filter.type) && filter.type.length > 0) ||
      (Array.isArray(filter.slot) && filter.slot.length > 0)
    );
    
    const isFilteredOut = 
      area !== "eq" &&
      hasItem &&
      filterActive &&
      !matchesFilter;
    
    const filteredOutClass = isFilteredOut ? " is-filtered-out" : "";
    const filterHiddenAttr = isFilteredOut ? ' data-filter-hidden="1" aria-disabled="true"' : "";

    // IMPORTANT: always show icon when item exists, even if filtered out
    // This prevents UX confusion where filtered-out items appear empty but block bulk moves
    return `
      <button type="button"
              class="inv-slot ${filled}${filteredOutClass}"
              data-area="${area}"
              data-index="${index}"
              data-item="${itemId || ""}"
              aria-label="${label}"${filterHiddenAttr}>
        ${item ? `<span class="inv-item" aria-hidden="true">${item.icon}</span>` : ""}
      </button>
    `;
  }

  function filterAndSortSlots(arr, filter) {
    if (!filter || (!Array.isArray(filter.category) || filter.category.length === 0) &&
        (!Array.isArray(filter.type) || filter.type.length === 0) &&
        (!Array.isArray(filter.slot) || filter.slot.length === 0)) {
      // No filter active, return as-is
      return arr.map((id, i) => ({ id, index: i, matches: true }));
    }

    // Separate matching and non-matching items
    const matching = [];
    const nonMatching = [];

    arr.forEach((id, i) => {
      if (!id) {
        // Empty slots always go to non-matching (will be filtered out)
        nonMatching.push({ id, index: i, matches: false });
      } else if (matchesFilter(id, filter)) {
        matching.push({ id, index: i, matches: true });
      } else {
        nonMatching.push({ id, index: i, matches: false });
      }
    });

    // Return matching items first, then non-matching (which will be hidden)
    return [...matching, ...nonMatching];
  }

  function characterPlaceholderSVG() {
    // Use CharacterDisplay engine if available, otherwise fallback
    // NOTE: showPresentation is now false - presentation/vibes are separate modules
    if (Skycore.Systems.CharacterDisplay && Skycore.Systems.CharacterDisplay.render) {
      return Skycore.Systems.CharacterDisplay.render({
        showPresentation: false,
        blinkGroup: "mc"
      });
    }
    // Fallback for backwards compatibility
    return `
      <img src="assets/mc-sprite.webp" alt="Character" role="img" aria-label="Character">
    `;
  }

  /**
   * Renders presentation bar module
   * @returns {string} HTML for presentation meter
   */
  function renderPresentationModule() {
    let presentationScore = 0;
    
    if (Skycore.Systems.PresentationState) {
      const presentationData = Skycore.Systems.PresentationState.get();
      presentationScore = Math.max(0, Math.min(100, Math.round(presentationData.presentationScore || 0)));
    } else if (Skycore.Systems.PresentationEngine && Skycore.Systems.PresentationEngine.compute) {
      const result = Skycore.Systems.PresentationEngine.compute();
      presentationScore = Math.max(0, Math.min(100, Math.round(result.presentationScore || 0)));
    }

    return `
      <div class="eq-module eq-module--presentation" data-ui-module="presentation">
        <div class="ui-meter" data-meter="presentation">
          <div class="ui-meter-head">
            <div class="ui-meter-label">Presentation</div>
            <div class="ui-meter-value"><span class="js-pres-score">${presentationScore}</span>/100</div>
          </div>
          <div class="ui-meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${presentationScore}">
            <div class="ui-meter-fill js-pres-fill" style="width:${presentationScore}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders outfit vibes module
   * @returns {string} HTML for outfit vibes tags
   */
  function renderVibesModule() {
    let vibesText = "Al naturale";
    
    if (Skycore.Systems.PresentationState) {
      const presentationData = Skycore.Systems.PresentationState.get();
      vibesText = presentationData.outfitVibesText || "Al naturale";
    } else if (Skycore.Systems.CharacterDisplay && Skycore.Systems.CharacterDisplay.getOutfitVibes) {
      const outfitVibes = Skycore.Systems.CharacterDisplay.getOutfitVibes();
      vibesText = outfitVibes.length > 0 ? outfitVibes.join(", ") : "Al naturale";
    }

    return `
      <div class="eq-module eq-module--vibes" data-ui-module="vibes">
        <div class="eq-vibes-title">OUTFIT VIBE</div>
        <div class="eq-vibes-tags js-vibes-tags">${vibesText}</div>
      </div>
    `;
  }

  function renderWardrobeSlots(filter = null) {
    ensureWardrobeCapacity(State.variables.invSys.wardrobe.length);
    ensureWardrobeHasEmptyRow();
    const W = State.variables.invSys.wardrobe;
    
    // Check if filter is active
    const hasFilter = filter && (
      (Array.isArray(filter.category) && filter.category.length > 0) ||
      (Array.isArray(filter.type) && filter.type.length > 0) ||
      (Array.isArray(filter.slot) && filter.slot.length > 0)
    );
    
    // If no filter, render in original order
    if (!hasFilter) {
      return W.map((id, i) => {
        return slotHTML("wardrobe", i, id, filter, true);
      }).join("");
    }
    
    // With filter: only render matching items + enough empty slots to fill complete rows
    // This makes the grid shrink to only show visible/filtered items
    const matchingItems = [];
    const emptySlots = [];
    
    W.forEach((id, i) => {
      if (!id) {
        // Collect empty slots (we'll use only a few)
        emptySlots.push({ id: null, originalIndex: i });
      } else if (matchesFilter(id, filter)) {
        // Collect matching items
        matchingItems.push({ id, originalIndex: i });
      }
    });
    
    // Calculate how many empty slots to render
    // When filtering, render matching items + at least 1 extra row of empty slots
    // Ensure total slots is a multiple of CFG.invCols (4) so grid displays evenly
    const matchingCount = matchingItems.length;
    const rowsForItems = Math.ceil(matchingCount / CFG.invCols);
    // Always add at least 1 extra row of empty slots (minimum 2 rows total if no items)
    const minRows = matchingCount > 0 ? rowsForItems + 1 : 2;
    const totalRows = minRows;
    const totalSlotsNeeded = totalRows * CFG.invCols;
    const emptyNeeded = Math.max(0, totalSlotsNeeded - matchingCount);
    
    // Use existing empty slots, and create virtual empty slots if needed
    // Virtual slots use indices beyond the current array length (W.length + i)
    // These will be expanded when items are actually dropped on them
    const emptyToRender = Math.min(emptySlots.length, emptyNeeded);
    const virtualEmptyNeeded = Math.max(0, emptyNeeded - emptySlots.length);
    const virtualEmptySlots = [];
    
    // Create virtual empty slots (don't mutate state - these are render-only)
    for (let i = 0; i < virtualEmptyNeeded; i++) {
      virtualEmptySlots.push({ id: null, originalIndex: W.length + i });
    }
    
    // Sort matching items by original index to maintain relative order
    matchingItems.sort((a, b) => a.originalIndex - b.originalIndex);
    
    // Sort empty slots by original index
    emptySlots.sort((a, b) => a.originalIndex - b.originalIndex);
    
    // Combine: matching items first, then real empty slots, then virtual empty slots
    const toRender = [
      ...matchingItems,
      ...emptySlots.slice(0, emptyToRender),
      ...virtualEmptySlots
    ];
    
    // Render only the items we want to show
    return toRender.map(item => {
      return slotHTML("wardrobe", item.originalIndex, item.id, filter, true);
    }).join("");
  }

  function renderUI(activeTab = "inventory") {
    const filter = State.variables.invSys?.filter || null;
    const hasFilter = filter && (
      (Array.isArray(filter.category) && filter.category.length > 0) ||
      (Array.isArray(filter.type) && filter.type.length > 0) ||
      (Array.isArray(filter.slot) && filter.slot.length > 0)
    );

    // Always render all slots with correct indices
    // Equipped items are NEVER filtered - always visible
    const eqSlots = State.variables.invSys.eq.map((id, i) => {
      return slotHTML("eq", i, id, filter, true);
    }).join("");
    
    // Inventory items are filtered
    // If no filter, render in original order
    let invSlots;
    if (!filter || (!Array.isArray(filter.category) || filter.category.length === 0) &&
        (!Array.isArray(filter.type) || filter.type.length === 0) &&
        (!Array.isArray(filter.slot) || filter.slot.length === 0)) {
      invSlots = State.variables.invSys.inv.map((id, i) => {
        return slotHTML("inv", i, id, filter, true);
      }).join("");
    } else {
      // With filter: sort items - matching items first, then empty slots, then non-matching
      const inv = State.variables.invSys.inv;
      const items = inv.map((id, i) => ({
        id,
        originalIndex: i,
        isEmpty: !id,
        itemMatches: id ? matchesFilter(id, filter) : false // Empty slots don't "match" for sorting
      }));
      
      // Sort: matching items first, then empty slots, then non-matching items
      // Within each group, maintain original order
      items.sort((a, b) => {
        // Priority: matching items > empty slots > non-matching items
        if (a.isEmpty && b.isEmpty) {
          return a.originalIndex - b.originalIndex; // Both empty: maintain order
        }
        if (a.isEmpty) return 1; // a is empty, b is not: b comes first (if b matches) or after (if b doesn't match)
        if (b.isEmpty) return -1; // b is empty, a is not: a comes first (if a matches) or after (if a doesn't match)
        
        // Both non-empty
        if (a.itemMatches && b.itemMatches) {
          return a.originalIndex - b.originalIndex; // Both match: maintain order
        }
        if (a.itemMatches) return -1; // a matches, b doesn't: a first
        if (b.itemMatches) return 1; // b matches, a doesn't: b first
        return a.originalIndex - b.originalIndex; // Both don't match: maintain order
      });
      
      // Render in sorted order - CSS Grid will place them in this order
      // Use original index for data-index (for drag/drop)
      invSlots = items.map(item => {
        // Empty slots always "match" for display purposes (always visible)
        const displayMatches = item.isEmpty || item.itemMatches;
        return slotHTML("inv", item.originalIndex, item.id, filter, displayMatches);
      }).join("");
    }
    
    const wSlots = renderWardrobeSlots(filter);

    // Get presentation data from single source of truth
    let presentationScore = 0;
    let readAs = null;
    let outfitComment = "";
    let outfitState = "";
    
    if (Skycore.Systems.PresentationState) {
      const presentationData = Skycore.Systems.PresentationState.get();
      presentationScore = presentationData.presentationScore || 0;
      readAs = presentationData.readAs || null;
      outfitComment = presentationData.outfitComment || "";
      outfitState = presentationData.outfitState || "";
    } else {
      // Fallback to direct computation if PresentationState not available
      if (Skycore.Systems.PresentationEngine && Skycore.Systems.PresentationEngine.compute) {
        const result = Skycore.Systems.PresentationEngine.compute();
        presentationScore = Math.round(result.presentationScore);
        readAs = result.readAs;
      }
      if (Skycore.Systems.PresentationEngine && Skycore.Systems.PresentationEngine.getOutfitComment) {
        try {
          const commentData = Skycore.Systems.PresentationEngine.getOutfitComment();
          if (commentData && commentData.comment) {
            outfitComment = commentData.comment;
            outfitState = commentData.state || "";
          }
        } catch (e) {
          console.error("Error getting outfit comment:", e);
        }
      }
    }

    // Get module flags from config
    const flags = Skycore.Config?.UI?.InventoryModules || { presentation: true, vibes: true, quote: true };

    // Build bottom modules HTML in correct order
    let bottomHTML = '';

    // 1) ACTIONS
    bottomHTML += `
      <div class="eq-actions">
        <button class="inv-btn eq-action" data-action="cleanup-eq" type="button">Clean Up</button>
        <button class="inv-btn eq-action" data-action="unequip-all" type="button">Unequip All</button>
      </div>
    `;

    // 2) QUOTE
    if (flags.quote && outfitComment) {
      bottomHTML += `
        <div class="eq-quote" data-outfit-state="${outfitState}" aria-live="polite">
          ${outfitComment}
        </div>
      `;
    }

    // 3) PRESENTATION (toggle-able module)
    if (flags.presentation) {
      bottomHTML += renderPresentationModule();
    }

    // 4) VIBES (toggle-able module)
    if (flags.vibes) {
      bottomHTML += renderVibesModule();
    }

    return `
      <div class="inv-ui" data-inv-root="1">

        <section class="eq-panel">
          <header class="eq-header">
            <h2 class="eq-title">Currently Equipped</h2>
          </header>

          <!-- TOP: always 2-column on mobile -->
          <div class="eq-top">
            <div class="eq-charBox stage stage--inventory" data-stage="inventory">
              ${characterPlaceholderSVG()}
            </div>

            <div class="eq-gridWrap">
              <div class="inv-grid eq" data-grid="eq">
                ${eqSlots}
              </div>
            </div>
          </div>

          <!-- BOTTOM: modules, grows downward only -->
          <div class="eq-bottom">
            ${bottomHTML}
          </div>
        </section>

        <section class="inv-panel">
          <div class="inv-tabs" role="tablist" aria-label="Inventory tabs">
            <button type="button" class="inv-tab" data-tab-btn="inventory" role="tab"
                    aria-selected="${activeTab === "inventory"}">Inventory</button>
            <button type="button" class="inv-tab" data-tab-btn="itemsets" role="tab"
                    aria-selected="${activeTab === "itemsets"}">Item Sets</button>
          </div>

          <!-- Divider must be ABOVE subactions (Filter / Create Set) -->
          <div class="inv-tabs-divider" aria-hidden="true"></div>

          <div class="inv-tabpanels">
            <div class="inv-tabpanel" data-tab-panel="inventory" role="tabpanel" ${activeTab === "inventory" ? "" : 'hidden="hidden"'}>
              <div class="inv-subactions">
                <button type="button" class="inv-link inv-subaction ${hasFilter ? "has-filter" : ""}" data-action="filter">[Filter${hasFilter ? " *" : ""}]</button>
                <button type="button" class="inv-link inv-subaction" data-action="create-set">[Create Item Set<br/>From Equipped]</button>
              </div>

              <h3 class="inv-title">Inventory</h3>
              <div class="inv-grid inv" data-grid="inv">
                ${invSlots}
              </div>

              <div class="inv-actions">
                ${hasFilter ? `<a href="javascript:void(0)" class="inv-link inv-cleanup" data-action="remove-filter" role="button">[Remove Filter]</a>` : ""}
                <a href="javascript:void(0)" class="inv-link inv-cleanup" data-action="cleanup-inv" role="button">
                  [Clean Up]
                </a>
                <button type="button" class="inv-btn inv-wardrobe" data-action="send-inv-all-wardrobe">
                  SEND ALL TO WARDROBE
                </button>
              </div>

              <h3 class="inv-title inv-wardrobe-title">Wardrobe</h3>
              <div class="inv-grid inv" data-grid="wardrobe" aria-label="Wardrobe">
                ${wSlots}
              </div>

              <div class="inv-actions">
                ${hasFilter ? `<a href="javascript:void(0)" class="inv-link inv-cleanup" data-action="remove-filter" role="button">[Remove Filter]</a>` : ""}
                <a href="javascript:void(0)" class="inv-link inv-cleanup" data-action="cleanup-wardrobe" role="button">
                  [Clean Up]
                </a>
                <button type="button" class="inv-btn inv-neutral" data-action="send-wardrobe-all-inv">
                  SEND ALL TO INVENTORY
                </button>
              </div>
            </div>

            <div class="inv-tabpanel" data-tab-panel="itemsets" role="tabpanel" ${activeTab === "itemsets" ? "" : 'hidden="hidden"'}>
              <h3 class="inv-title">ITEM SETS</h3>
              
              <div class="inv-sets-list">
                ${(() => {
                  const sets = State.variables.invSys?.sets || [];
                  if (sets.length === 0) {
                    return '<div class="inv-empty-state">(No sets saved)</div>';
                  }
                  return sets.map(set => {
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
                })()}
              </div>
              
              <div class="inv-actions">
                <button type="button" class="inv-btn inv-neutral" data-action="create-set">
                  CREATE SET NEW<br/>FROM EQUIPPED
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    `;
  }

  Skycore.Systems.InventoryRender = {
    slotHTML,
    characterPlaceholderSVG,
    renderWardrobeSlots,
    renderUI,
    matchesFilter,
    filterAndSortSlots,
    renderPresentationModule,
    renderVibesModule
  };
})();
