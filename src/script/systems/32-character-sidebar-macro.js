/* =========================================================================
   Character Display Sidebar: Macro/Widget + UI Bar Integration
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // Ensure dependencies are loaded
  if (!Skycore.Systems.CharacterSidebar) {
    console.error("31-character-sidebar.js must be loaded before 32-character-sidebar-macro.js");
    return;
  }

  const { render: renderCharacterSidebar, update: updateCharacterSidebar } = Skycore.Systems.CharacterSidebar;

  // ---- Macro --------------------------------------------------------------
  Macro.add("charSidebar", {
    handler() {
      const wrap = document.createElement("div");
      wrap.innerHTML = renderCharacterSidebar();
      this.output.appendChild(wrap);
      
      // Attach blink to character display
      Skycore.Systems.EyeBlink?.attachAll?.(wrap);
    }
  });

  // ---- UI Bar Scroll Lock on Mobile ---------------------------------------
  /**
   * Lock/unlock body scrolling based on UI bar state (mobile only)
   * Prevents background scrolling when sidebar menu is open
   */
  let scrollPosition = 0;

  function handleScrollLock() {
    // Only apply on mobile
    if (window.matchMedia && !window.matchMedia('(max-width: 768px)').matches) {
      // Desktop: always allow scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      return;
    }

    const uiBar = document.getElementById('ui-bar');
    if (!uiBar) return;

    const isStowed = uiBar.classList.contains('stowed');
    
    if (isStowed) {
      // Sidebar is closed - restore scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      
      // Restore scroll position if we saved it
      if (scrollPosition) {
        window.scrollTo(0, scrollPosition);
        scrollPosition = 0;
      }
    } else {
      // Sidebar is open - lock scrolling
      // Save current scroll position
      scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      // Lock body scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollPosition}px`;
    }
  }

  // Watch for UI bar state changes
  function initScrollLock() {
    const uiBar = document.getElementById('ui-bar');
    if (!uiBar) {
      setTimeout(initScrollLock, 100);
      return;
    }

    // Initial state
    handleScrollLock();

    // Watch for class changes (open/stowed)
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          handleScrollLock();
        }
      });
    });

    observer.observe(uiBar, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also handle resize to mobile/desktop transitions
    window.addEventListener('resize', handleScrollLock);
  }

  /**
   * Close sidebar on mobile when navigating to new page
   * Only applies on mobile devices
   */
  function closeSidebarOnNavigation() {
    // Only close on mobile
    if (window.matchMedia && !window.matchMedia('(max-width: 768px)').matches) {
      return;
    }

    const uiBar = document.getElementById('ui-bar');
    if (!uiBar) return;

    // Close sidebar if it's open (not stowed)
    if (!uiBar.classList.contains('stowed')) {
      // Toggle the stowed class to close the sidebar
      uiBar.classList.add('stowed');
    }
  }

  // ---- UI Bar Integration -------------------------------------------------
  /**
   * Initialize character sidebar in SugarCube UI bar
   * Called when DOM is ready and equipment state is initialized
   */
  function initUIBarSidebar() {
    // Wait for UI bar to be available
    const uiBarBody = document.getElementById('ui-bar-body');
    if (!uiBarBody) {
      // Try again after a short delay if UI bar isn't ready yet
      setTimeout(initUIBarSidebar, 100);
      return;
    }

    // Check if sidebar already exists
    if (uiBarBody.querySelector('[data-char-sidebar="1"]')) {
      return;
    }

    // Ensure inventory state is initialized (equipment seeded)
    if (Skycore.Systems.InventoryState && Skycore.Systems.InventoryState.ensureState) {
      Skycore.Systems.InventoryState.ensureState();
    }

    // Invalidate presentation state cache to ensure fresh data on initial render
    if (Skycore.Systems.PresentationState && Skycore.Systems.PresentationState.invalidate) {
      Skycore.Systems.PresentationState.invalidate();
    }

    // Create container for character sidebar
    const sidebarContainer = document.createElement("div");
    sidebarContainer.id = "char-sidebar-ui-bar-container";
    sidebarContainer.innerHTML = renderCharacterSidebar();
    
    // Insert after any existing content (below SAVES/RESTART buttons)
    uiBarBody.appendChild(sidebarContainer);

    // Bind event handlers for sidebar buttons
    const sidebarEl = sidebarContainer.querySelector('[data-char-sidebar="1"]');
    if (sidebarEl && Skycore.Systems.CharacterSidebar && Skycore.Systems.CharacterSidebar.bindActions) {
      Skycore.Systems.CharacterSidebar.bindActions(sidebarEl);
    }
    
    // Attach blink to character display in sidebar
    Skycore.Systems.EyeBlink?.attachAll?.(sidebarContainer);
  }

  // Close sidebar on passage navigation (mobile only)
  $(document).on(":passagestart", function() {
    closeSidebarOnNavigation();
  });

  // Initialize when DOM is ready - wait for story initialization
  $(document).one(":storyready", function() {
    // Small delay to ensure equipment is seeded
    setTimeout(function() {
      initUIBarSidebar();
      initScrollLock();
    }, 50);
  });

  // Also try on DOMContentLoaded as fallback
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      setTimeout(function() {
        initUIBarSidebar();
        initScrollLock();
      }, 150);
    });
  } else {
    // DOM already loaded, try immediately but with delay for state init
    setTimeout(function() {
      initUIBarSidebar();
      initScrollLock();
    }, 150);
  }

  Skycore.Systems.CharacterSidebarMacro = {
    initUIBarSidebar
  };
})();
