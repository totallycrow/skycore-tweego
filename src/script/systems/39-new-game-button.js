/* =========================================================================
   Restart + Clean Cache Button: Adds a comprehensive restart button to the UI bar
   
   Inserts a button at the top of the UI bar (above SAVES/RESTART buttons)
   that resets the game to a fresh state and clears all clearable caches:
   - SugarCube saves (storage.clear())
   - localStorage (all entries)
   - sessionStorage
   - Service Worker caches (if any)
   - In-memory presentation cache
   
   Note: Browser HTTP cache (images/CSS/JS files) cannot be cleared from
   JavaScript due to browser security restrictions.
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
    button.textContent = "RESTART + CLEAN CACHE";
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

    // Comprehensive cache clearing function
    async function clearAllCaches() {
      const cleared = [];
      
      // 1. Clear SugarCube storage (saves)
      if (typeof storage !== 'undefined' && storage.clear) {
        try {
          storage.clear();
          cleared.push('game saves');
        } catch (err) {
          console.warn('Could not clear SugarCube storage:', err);
        }
      }
      
      // 2. Clear localStorage (all entries for this origin)
      try {
        localStorage.clear();
        cleared.push('localStorage');
      } catch (err) {
        console.warn('Could not clear localStorage:', err);
      }
      
      // 3. Clear sessionStorage
      try {
        sessionStorage.clear();
        cleared.push('sessionStorage');
      } catch (err) {
        console.warn('Could not clear sessionStorage:', err);
      }
      
      // 4. Clear Service Worker caches (if available)
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          if (cacheNames.length > 0) {
            cleared.push('service worker caches');
          }
        } catch (err) {
          console.warn('Could not clear service worker caches:', err);
        }
      }
      
      // 5. Clear in-memory presentation cache (if exists)
      if (window.Skycore && window.Skycore.Systems && window.Skycore.Systems.PresentationState) {
        try {
          // Clear cached presentation data
          if (window.Skycore.Systems.PresentationState.invalidate) {
            window.Skycore.Systems.PresentationState.invalidate();
            cleared.push('presentation cache');
          }
        } catch (err) {
          console.warn('Could not clear presentation cache:', err);
        }
      }
      
      return cleared;
    }

    // Add click handler
    button.addEventListener('click', async function(e) {
      e.preventDefault();
      
      // Confirm with user
      const message = 'Start a new game and clear all cache?\n\n' +
        'This will:\n' +
        '• Reset all game progress\n' +
        '• Clear all saves\n' +
        '• Clear localStorage and sessionStorage\n' +
        '• Clear service worker caches (if any)\n\n' +
        'Note: Browser HTTP cache (images/CSS/JS) cannot be cleared from JavaScript.';
      
      if (confirm(message)) {
        // Clear all caches
        const cleared = await clearAllCaches();
        console.log('Cleared caches:', cleared.join(', '));
        
        // Reset game state using Engine.restart()
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
