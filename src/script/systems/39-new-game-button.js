/* =========================================================================
   New Game Button: Adds a "New Game" button to the UI bar
   
   Inserts a button at the top of the UI bar (above SAVES/RESTART buttons)
   that resets the game to a fresh state.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  /**
   * Initialize New Game button in SugarCube UI bar
   * Called when DOM is ready
   */
  function initNewGameButton() {
    // Wait for UI bar to be available
    const uiBarBody = document.getElementById('ui-bar-body');
    if (!uiBarBody) {
      // Try again after a short delay if UI bar isn't ready yet
      setTimeout(initNewGameButton, 100);
      return;
    }

    // Check if button already exists
    if (uiBarBody.querySelector('[data-new-game-button="1"]')) {
      return;
    }

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.setAttribute("data-new-game-button", "1");
    buttonContainer.style.marginBottom = "1em";
    buttonContainer.style.paddingBottom = "1em";
    buttonContainer.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";

    // Create button
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-bar-button";
    button.textContent = "NEW GAME";
    button.style.cssText = `
      width: 100%;
      padding: 0.75em 1em;
      margin: 0;
      background-color: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.9em;
      font-weight: 600;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    // Add hover styles
    button.addEventListener('mouseenter', function() {
      button.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });

    button.addEventListener('mouseleave', function() {
      button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      button.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });

    // Add click handler
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Confirm with user
      if (confirm('Start a new game? This will reset all progress and clear saves.')) {
        // Clear persistent storage (saves are stored here)
        if (typeof storage !== 'undefined' && storage.clear) {
          try {
            storage.clear();
          } catch (err) {
            console.warn('Could not clear storage:', err);
          }
        }
        
        // Reset game state using Engine.restart()
        // This fully resets the game to initial state and clears all saves
        if (typeof Engine !== 'undefined') {
          if (typeof Engine.restart === 'function') {
            Engine.restart();
          } else {
            // Fallback: clear history and navigate to Start passage
            if (typeof History !== 'undefined' && History.clear) {
              History.clear();
            }
            if (Engine.play) {
              Engine.play("Start");
            }
          }
        }
      }
    });

    // Assemble
    buttonContainer.appendChild(button);
    
    // Insert at the beginning of ui-bar-body (before SAVES/RESTART buttons)
    uiBarBody.insertBefore(buttonContainer, uiBarBody.firstChild);
  }

  // Initialize when DOM is ready
  $(document).one(":storyready", function() {
    setTimeout(initNewGameButton, 50);
  });

  // Also try on DOMContentLoaded as fallback
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      setTimeout(initNewGameButton, 150);
    });
  } else {
    // DOM already loaded, try immediately but with delay
    setTimeout(initNewGameButton, 150);
  }

  Skycore.Systems.NewGameButton = {
    init: initNewGameButton
  };
})();
