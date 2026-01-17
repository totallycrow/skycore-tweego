/* =========================================================================
   Back Button System

   A modular fixed-position back button that sticks to the bottom of the
   viewport. Can be attached to any passage when needed.

   Usage in Twee:
     <<backButton>>                    // Goes to previous passage
     <<backButton "Start">>            // Goes to "Start" passage
     <<backButton "Start" "Go Home">>  // Custom button text
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // ---- Back Button Functions ----------------------------------------------

  /**
   * Removes the back button from the page
   */
  function removeBackButton() {
    const container = document.querySelector('.back-button-container');
    if (container) {
      // Clean up resize listener if it exists
      if (container._resizeHandler) {
        window.removeEventListener('resize', container._resizeHandler);
      }
      // Clean up observers if they exist
      if (container._uiBarObserver) {
        container._uiBarObserver.disconnect();
      }
      if (container._storyObserver) {
        container._storyObserver.disconnect();
      }
      container.remove();
    }
  }

  /**
   * Updates button position based on UI bar state
   */
  function updateButtonPosition(container) {
    if (!container) return;
    
    const backdrop = container.querySelector('.back-button-backdrop');
    if (!backdrop) return;
    
    // Check if we're on mobile (where UI bar behavior changes)
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
    // On mobile, just center it (handled by CSS width: 80%)
    if (isMobile) {
      backdrop.style.left = '50%';
      backdrop.style.transform = 'translateX(-50%)';
      return;
    }
    
    // On desktop, center within the content area (story element's visible area)
    // The story element has margin-left that shifts when UI bar is open/closed
    const story = document.getElementById('story');
    
    if (story) {
      // Get the actual rendered position of the story element
      const storyRect = story.getBoundingClientRect();
      const storyLeft = storyRect.left; // Where content area actually starts
      const storyRight = storyRect.right; // Where content area ends
      
      // Content area center is the midpoint of the story element
      // This accounts for all margins, padding, and positioning
      const contentAreaCenter = storyLeft + ((storyRight - storyLeft) / 2);
      
      // Convert to percentage of viewport width
      const viewportWidth = window.innerWidth;
      const centerPercent = (contentAreaCenter / viewportWidth) * 100;
      
      backdrop.style.left = centerPercent + '%';
      backdrop.style.transform = 'translateX(-50%)';
    } else {
      // Fallback: just center at 50% if story element not found
      backdrop.style.left = '50%';
      backdrop.style.transform = 'translateX(-50%)';
    }
  }

  /**
   * Creates and renders the back button
   * @param {string} targetPassage - Target passage name (optional, defaults to previous)
   * @param {string} buttonText - Button label text (optional, defaults to "BACK")
   */
  function createBackButton(targetPassage, buttonText) {
    // Remove any existing back button first
    removeBackButton();

    // Use defaults if not provided
    const text = buttonText || "BACK";
    const target = targetPassage || null;

    // Create container
    const container = document.createElement('div');
    container.className = 'back-button-container';

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'back-button-backdrop';

    // Create button/link
    const button = document.createElement('a');
    button.className = 'back-button';
    button.textContent = text;

    if (target) {
      // Go to specific passage using SugarCube
      button.addEventListener('click', function(e) {
        e.preventDefault();
        // Use Engine.play() for navigation to a passage by name
        if (typeof Engine !== 'undefined' && Engine.play) {
          Engine.play(target);
        }
      });
    } else {
      // Go back to previous passage using SugarCube history
      button.addEventListener('click', function(e) {
        e.preventDefault();
        // SugarCube history navigation - use History.go() with moment index
        if (typeof History !== 'undefined' && History.length > 1) {
          try {
            // Get the previous moment index (second-to-last in history)
            const previousIndex = History.length - 2;
            // History.go() accepts a moment index (number) or moment object
            History.go(previousIndex);
          } catch (err) {
            console.error('Back button navigation error:', err);
          }
        }
      });
    }

    // Assemble DOM structure
    backdrop.appendChild(button);
    container.appendChild(backdrop);

    // Hide button initially to prevent visible jump
    backdrop.style.opacity = '0';
    backdrop.style.visibility = 'hidden';

    // Add to page
    document.body.appendChild(container);

    // Calculate position before showing button
    // Use multiple attempts to ensure accurate positioning
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop
    
    function positionAndShow() {
      updateButtonPosition(container);
      attempts++;
      
      // Check if story element exists and has valid dimensions
      const story = document.getElementById('story');
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      
      if (isMobile || (story && story.getBoundingClientRect().width > 0) || attempts >= maxAttempts) {
        // Position is valid or max attempts reached, show the button
        backdrop.style.opacity = '1';
        backdrop.style.visibility = 'visible';
      } else {
        // Story element not ready yet, try again
        requestAnimationFrame(positionAndShow);
      }
    }

    // Start positioning process
    requestAnimationFrame(function() {
      requestAnimationFrame(positionAndShow);
    });
    
    // Fallback: ensure button is visible after reasonable delay even if checks fail
    setTimeout(function() {
      if (backdrop.style.opacity === '0') {
        backdrop.style.opacity = '1';
        backdrop.style.visibility = 'visible';
      }
    }, 500);

    // Listen for UI bar state changes and inventory panel position changes
    const uiBar = document.getElementById('ui-bar');
    const invUI = document.querySelector('.inv-ui');
    const story = document.getElementById('story');
    
    // Function to update position with delay for CSS transitions
    const updatePositionDelayed = function() {
      setTimeout(function() {
        updateButtonPosition(container);
      }, 250); // Match SugarCube's 0.2s transition
    };
    
    if (uiBar) {
      // Watch for UI bar class changes (open/stowed)
      const uiBarObserver = new MutationObserver(updatePositionDelayed);
      uiBarObserver.observe(uiBar, { 
        attributes: true, 
        attributeFilter: ['class'] 
      });
      container._uiBarObserver = uiBarObserver;
    }
    
    if (story) {
      // Watch for story element style changes (margin changes when UI bar toggles)
      const storyObserver = new MutationObserver(updatePositionDelayed);
      storyObserver.observe(story, {
        attributes: true,
        attributeFilter: ['style']
      });
      container._storyObserver = storyObserver;
    }
    

    // Update position on window resize
    const resizeHandler = function() {
      updateButtonPosition(container);
    };
    window.addEventListener('resize', resizeHandler);
    
    // Store resize handler so we can clean it up later
    container._resizeHandler = resizeHandler;

    return container;
  }

  // ---- Macro Registration --------------------------------------------------

  Macro.add("backButton", {
    handler() {
      const args = this.args;
      const targetPassage = args[0] || null;
      const buttonText = args[1] || "BACK";

      // Create the button immediately
      // The macro output doesn't matter, we're adding to body directly
      createBackButton(targetPassage, buttonText);
    }
  });

  /**
   * Macro to explicitly disable back button on a passage
   * Usage: <<noBackButton>>
   * This ensures the back button is removed even if it was added elsewhere
   */
  Macro.add("noBackButton", {
    handler() {
      // Explicitly remove any back button that might exist
      removeBackButton();
    }
  });

  // ---- Cleanup on Passage Change ------------------------------------------

  // Remove back button when starting a new passage
  // The new passage will add it back if needed via the macro
  $(document).on(':passagestart', function() {
    removeBackButton();
  });

  // Update back button position after passage is rendered (including after save load)
  // This ensures the button is correctly positioned on desktop when returning to the game
  $(document).on(':passageend', function() {
    const container = document.querySelector('.back-button-container');
    if (container) {
      const backdrop = container.querySelector('.back-button-backdrop');
      if (backdrop) {
        // Hide during repositioning to prevent visible jump
        const wasVisible = backdrop.style.opacity !== '0';
        if (wasVisible) {
          backdrop.style.opacity = '0';
        }
        
        // Update position after UI bar and story element are positioned
        // Use multiple attempts to ensure accurate positioning
        function updateAndShow() {
          updateButtonPosition(container);
          
          const story = document.getElementById('story');
          const isMobile = window.matchMedia('(max-width: 768px)').matches;
          
          if (isMobile || (story && story.getBoundingClientRect().width > 0)) {
            // Position is valid, show the button if it was visible before
            if (wasVisible) {
              backdrop.style.opacity = '1';
            }
          } else {
            // Story element not ready yet, try again
            requestAnimationFrame(updateAndShow);
          }
        }
        
        // First attempt after initial render
        setTimeout(function() {
          requestAnimationFrame(updateAndShow);
        }, 50);
        
        // Second attempt after CSS transitions (UI bar animation)
        setTimeout(function() {
          requestAnimationFrame(updateAndShow);
        }, 300);
      }
    }
  });

  // ---- Public API ----------------------------------------------------------

  Skycore.Systems.BackButton = {
    create: createBackButton,
    remove: removeBackButton
  };
})();
