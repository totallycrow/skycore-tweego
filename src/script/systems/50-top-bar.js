/* =========================================================================
   Top Bar System

   Displays:
   - Turns (dynamically counted)
   - Day (e.g., "Monday")
   - Time of day (Morning, Afternoon, Evening, Night)
   - 3 square icons showing actions left per day
     * Light green = action still available
     * Dark red = action already used

   Usage in Twee:
     <<topBar>>
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // ----------------------------- State Management ------------------------

  /**
   * Ensures top bar state exists in State.variables
   */
  function ensureState() {
    const V = State.variables;
    
    if (!V.topBarData) {
      V.topBarData = {
        turns: 0,
        day: "Monday",
        timeOfDay: "Afternoon",
        actionsUsed: 0,
        totalActions: 3
      };
    }
    
    // Ensure all required fields exist (migration safety)
    if (typeof V.topBarData.turns !== 'number') {
      V.topBarData.turns = 0;
    }
    if (!V.topBarData.day) {
      V.topBarData.day = "Monday";
    }
    if (!V.topBarData.timeOfDay) {
      V.topBarData.timeOfDay = "Afternoon";
    }
    if (typeof V.topBarData.actionsUsed !== 'number') {
      V.topBarData.actionsUsed = 0;
    }
    if (typeof V.topBarData.totalActions !== 'number') {
      V.topBarData.totalActions = 3;
    }
  }

  /**
   * Gets current top bar data from state
   * @returns {Object} Current top bar data
   */
  function getTopBarData() {
    ensureState();
    return State.variables.topBarData;
  }

  /**
   * Increments the turn counter
   */
  function incrementTurn() {
    ensureState();
    State.variables.topBarData.turns += 1;
  }

  // --------------------------- Helpers -----------------------------------

  /**
   * Removes the top bar from the page
   */
  function removeTopBar() {
    const container = document.querySelector('.top-bar-container');
    if (container) {
      container.remove();
    }
  }

  /**
   * Renders action icons
   * @param {number} actionsUsed - Number of actions used
   * @param {number} totalActions - Total number of actions per day
   * @returns {string} HTML string for action icons
   */
  function renderActionIcons(actionsUsed, totalActions) {
    let iconsHTML = '';
    for (let i = 0; i < totalActions; i++) {
      const isUsed = i < actionsUsed;
      const iconClass = isUsed ? 'top-bar-action-icon--used' : 'top-bar-action-icon--available';
      iconsHTML += `<div class="top-bar-action-icon ${iconClass}" aria-label="${isUsed ? 'Action used' : 'Action available'}"></div>`;
    }
    return iconsHTML;
  }

  /**
   * Creates and renders the top bar
   * @param {Object} data - Optional data object to override state values
   */
  function createTopBar(data) {
    // Remove any existing top bar first
    removeTopBar();

    // Get data from state, allow override via parameter
    const stateData = getTopBarData();
    const turns = data?.turns ?? stateData.turns;
    const day = data?.day ?? stateData.day;
    const timeOfDay = data?.timeOfDay ?? stateData.timeOfDay;
    const actionsUsed = data?.actionsUsed ?? stateData.actionsUsed;
    const totalActions = data?.totalActions ?? stateData.totalActions;

    // Create container
    const container = document.createElement('div');
    container.className = 'top-bar-container';

    // Build HTML
    const html = `
      <div class="top-bar-content">
        <div class="top-bar-section top-bar-section--turns">
          <span class="top-bar-label">Turns</span>
          <span class="top-bar-value">${turns}</span>
        </div>

        <div class="top-bar-section top-bar-section--day">
          <span class="top-bar-value">${day}</span>
        </div>

        <div class="top-bar-section top-bar-section--time">
          <span class="top-bar-value">${timeOfDay}</span>
        </div>

        <div class="top-bar-section top-bar-section--actions">
          <div class="top-bar-actions">
            ${renderActionIcons(actionsUsed, totalActions)}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Add to page (insert at the beginning of body or after UI bar)
    const story = document.getElementById('story');
    if (story) {
      // Insert before the story element
      document.body.insertBefore(container, story);
    } else {
      // Fallback: append to body
      document.body.appendChild(container);
    }

    return container;
  }

  /**
   * Updates the top bar with new data
   * @param {Object} data - Optional data object to override state values
   */
  function updateTopBar(data) {
    const container = document.querySelector('.top-bar-container');
    if (!container) {
      // Create if it doesn't exist
      return createTopBar(data);
    }

    // Get data from state, allow override via parameter
    const stateData = getTopBarData();
    const turns = data?.turns ?? stateData.turns;
    const day = data?.day ?? stateData.day;
    const timeOfDay = data?.timeOfDay ?? stateData.timeOfDay;
    const actionsUsed = data?.actionsUsed ?? stateData.actionsUsed;
    const totalActions = data?.totalActions ?? stateData.totalActions;

    const turnsValue = container.querySelector('.top-bar-section--turns .top-bar-value');
    const dayValue = container.querySelector('.top-bar-section--day .top-bar-value');
    const timeValue = container.querySelector('.top-bar-section--time .top-bar-value');
    const actionsContainer = container.querySelector('.top-bar-actions');

    if (turnsValue) turnsValue.textContent = turns;
    if (dayValue) dayValue.textContent = day;
    if (timeValue) timeValue.textContent = timeOfDay;
    if (actionsContainer) {
      actionsContainer.innerHTML = renderActionIcons(actionsUsed, totalActions);
    }

    return container;
  }

  // ---------------------------- Macro ------------------------------------

  Macro.add("topBar", {
    handler() {
      const args = this.args;
      // Allow passing data as first argument
      const data = args[0] || null;
      createTopBar(data);
    }
  });

  // ---------------------------- Auto-initialize ---------------------------

  // Initialize state on story init
  $(document).on(':storyinit', function() {
    ensureState();
  });

  // Create top bar on story start
  $(document).on(':storystart', function() {
    ensureState();
    createTopBar();
  });

  // Increment turn on passage end (before save happens)
  // This ensures the turn count is saved correctly
  $(document).on(':passageend', function() {
    ensureState();
    // Increment on every passage end
    incrementTurn();
    
    // Update top bar immediately after incrementing to show the value that will be saved
    const existing = document.querySelector('.top-bar-container');
    if (existing) {
      updateTopBar();
    }
  });

  // Update top bar display on passage start (after increment has happened)
  // This ensures the top bar always reflects the current state (including after save loads)
  $(document).on(':passagestart', function() {
    ensureState();
    
    // Always update to sync with current state (which includes the increment from :passageend)
    const existing = document.querySelector('.top-bar-container');
    if (existing) {
      updateTopBar();
    } else {
      createTopBar();
    }
  });

  // Also update top bar after save loads to ensure sync
  $(document).on(':passagerender', function() {
    ensureState();
    const existing = document.querySelector('.top-bar-container');
    if (existing) {
      updateTopBar();
    }
  });

  // ---------------------------- Public API --------------------------------

  Skycore.Systems.TopBar = {
    create: createTopBar,
    update: updateTopBar,
    remove: removeTopBar,
    incrementTurn: incrementTurn,
    getData: getTopBarData,
    ensureState: ensureState
  };
})();
