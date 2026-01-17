/* =========================================================================
   Character Display Sidebar: Reusable character display with presentation and quote
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  /**
   * Renders a status bar HTML
   * @param {string} label - Status label
   * @param {number} value - Current value (0-100)
   * @param {string} statusType - Status type for CSS styling
   * @returns {string} HTML string for status bar
   */
  function renderStatusBar(label, value, statusType) {
    const percent = Math.min(100, Math.max(0, value));
    return `
      <div class="char-sidebar-stat-bar" data-status="${statusType}">
        <div class="char-sidebar-stat-bar-label">
          ${label}
          <div class="char-sidebar-stat-bar-value">${value}/100</div>
        </div>
        <div class="char-sidebar-stat-bar-track">
          <div class="char-sidebar-stat-bar-fill" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the character display sidebar component
   * Reuses CharacterDisplay from inventory with presentation box and quote
   * Uses PresentationState as single source of truth
   * @returns {string} HTML string for the component
   */
  function renderCharacterSidebar() {
    // Get data from single source of truth
    const presentationData = Skycore.Systems.PresentationState 
      ? Skycore.Systems.PresentationState.get()
      : null;

    const eq = presentationData ? presentationData.equipment : (State.variables.invSys?.eq || []);

    // Get character display HTML - use EXACT same approach as inventory
    // The inventory uses CharacterDisplay.render() with showPresentation: true
    let characterDisplayHTML = "";
    if (Skycore.Systems.CharacterDisplay && Skycore.Systems.CharacterDisplay.render) {
      // Use exact same call as inventory does - don't pass equipment explicitly
      // Let CharacterDisplay get it from state (same as inventory)
      characterDisplayHTML = Skycore.Systems.CharacterDisplay.render({
        showPresentation: true,
        blinkGroup: "mc"
      });
    } else {
      // Fallback if CharacterDisplay is not available
      characterDisplayHTML = `
        <div class="char-display">
          <div class="char-display-container">
            <div class="char-display-layers">
              <div class="char-display-layer char-display-layer-base">
                <img src="assets/mc-naked.webp" alt="Character" role="img" aria-label="Character" class="char-display-sprite char-display-sprite-base">
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Get character quote/comment from presentation data
    const outfitComment = presentationData ? presentationData.outfitComment : "";
    const outfitState = presentationData ? presentationData.outfitState : "";

    // Get status values for bars (dummy values for now)
    const V = State.variables;
    const mcStats = V.mcStats || {};
    const status = mcStats.status || {};
    const attributes = mcStats.attributes || {};
    
    const stress = status.stress || 0;
    const fatigue = status.fatigue || 0;
    const arousal = status.arousal || 0;
    // Willpower is in attributes, but show as 0-100 scale (multiply by 5 if it's 0-20 scale)
    const willpowerAttr = attributes.willpower || 10;
    const willpower = willpowerAttr <= 20 ? (willpowerAttr * 5) : willpowerAttr;

    // Render status bars HTML
    const statusBarsHTML = `
      <div class="char-sidebar-status">
        ${renderStatusBar("Stress", stress, "stress")}
        ${renderStatusBar("Fatigue", fatigue, "fatigue")}
        ${renderStatusBar("Arousal", arousal, "arousal")}
        ${renderStatusBar("Willpower", willpower, "willpower")}
      </div>
    `;

    // Build the complete sidebar component
    return `
      <div class="char-sidebar" data-char-sidebar="1">
        <div class="stage stage--sidebar" data-stage="sidebar">
          ${characterDisplayHTML}
        </div>
        ${outfitComment ? `
        <div class="char-sidebar-comment" data-outfit-state="${outfitState}">
          ${outfitComment}
        </div>
        ` : ""}
        ${statusBarsHTML}
        <div class="char-sidebar-actions">
          <button type="button" class="char-sidebar-btn" data-action="goto-inventory">
            INVENTORY
          </button>
          <button type="button" class="char-sidebar-btn" data-action="goto-settings">
            SETTINGS
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Updates an existing character sidebar component in the DOM
   * Ensures it stays in sync with equipment changes
   * Uses PresentationState as single source of truth
   * @param {HTMLElement|string} element - DOM element or selector
   */
  function updateCharacterSidebar(element) {
    const el = typeof element === "string" 
      ? document.querySelector(element) 
      : element;

    if (!el) {
      console.warn("CharacterSidebar: Element not found", element);
      return;
    }

    // Get fresh data from single source of truth
    const presentationData = Skycore.Systems.PresentationState 
      ? Skycore.Systems.PresentationState.get()
      : null;

    const eq = presentationData ? presentationData.equipment : (State.variables.invSys?.eq || []);

    // Update character display - use same approach as inventory
    const charDisplayEl = el.querySelector(".char-display");
    if (charDisplayEl && Skycore.Systems.CharacterDisplay && Skycore.Systems.CharacterDisplay.update) {
      // Use same update call as inventory - don't pass equipment explicitly
      Skycore.Systems.CharacterDisplay.update(charDisplayEl, {
        showPresentation: true
      });
    }

    // Update character quote/comment from presentation data
    const outfitComment = presentationData ? presentationData.outfitComment : "";
    const outfitState = presentationData ? presentationData.outfitState : "";

    // Update or create comment element
    let commentEl = el.querySelector(".char-sidebar-comment");
    if (outfitComment) {
      if (!commentEl) {
        commentEl = document.createElement("div");
        commentEl.className = "char-sidebar-comment";
        el.appendChild(commentEl);
      }
      commentEl.setAttribute("data-outfit-state", outfitState);
      commentEl.textContent = outfitComment;
    } else {
      // Remove comment element if no comment
      if (commentEl) {
        commentEl.remove();
      }
    }

    // Update status bars
    const V = State.variables;
    const mcStats = V.mcStats || {};
    const status = mcStats.status || {};
    const attributes = mcStats.attributes || {};
    
    const stress = status.stress || 0;
    const fatigue = status.fatigue || 0;
    const arousal = status.arousal || 0;
    // Willpower is in attributes, but show as 0-100 scale (multiply by 5 if it's 0-20 scale)
    const willpowerAttr = attributes.willpower || 10;
    const willpower = willpowerAttr <= 20 ? (willpowerAttr * 5) : willpowerAttr;

    let statusSection = el.querySelector(".char-sidebar-status");
    if (!statusSection) {
      statusSection = document.createElement("div");
      statusSection.className = "char-sidebar-status";
      // Insert before actions section
      const actionsSection = el.querySelector(".char-sidebar-actions");
      if (actionsSection) {
        el.insertBefore(statusSection, actionsSection);
      } else {
        el.appendChild(statusSection);
      }
    }

    // Update status bars
    statusSection.innerHTML = `
      ${renderStatusBar("Stress", stress, "stress")}
      ${renderStatusBar("Fatigue", fatigue, "fatigue")}
      ${renderStatusBar("Arousal", arousal, "arousal")}
      ${renderStatusBar("Willpower", willpower, "willpower")}
    `;

    // Reapply background theme if stage exists
    const stage = el.querySelector(".stage--sidebar");
    if (stage && Skycore.Systems.BackgroundThemes) {
      Skycore.Systems.BackgroundThemes.applyStage(stage, "sidebar");
    }
  }

  /**
   * Updates all character sidebar components on the page
   * Called when equipment changes to keep everything in sync
   */
  function updateAllCharacterSidebars() {
    const sidebars = document.querySelectorAll('[data-char-sidebar="1"]');
    sidebars.forEach(sidebar => {
      updateCharacterSidebar(sidebar);
    });
  }

  /**
   * Bind event handlers for sidebar buttons
   * @param {HTMLElement} sidebarEl - Sidebar element
   */
  function bindSidebarActions(sidebarEl) {
    if (!sidebarEl) return;

    // Inventory button
    const inventoryBtn = sidebarEl.querySelector('[data-action="goto-inventory"]');
    if (inventoryBtn) {
      inventoryBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // Navigate to inventory passage using SugarCube
        if (typeof Engine !== 'undefined' && Engine.play) {
          Engine.play("Inventory");
        }
      });
    }

    // Settings button
    const settingsBtn = sidebarEl.querySelector('[data-action="goto-settings"]');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // Navigate to settings passage using SugarCube
        if (typeof Engine !== 'undefined' && Engine.play) {
          Engine.play("Settings");
        }
      });
    }
  }

  Skycore.Systems.CharacterSidebar = {
    render: renderCharacterSidebar,
    update: updateCharacterSidebar,
    updateAll: updateAllCharacterSidebars,
    bindActions: bindSidebarActions
  };
})();
