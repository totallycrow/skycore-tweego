/* =========================================================================
   UI Constants: Centralized Magic Numbers and Configuration
   
   All magic numbers, z-index values, and UI constants should be defined here
   for easy maintenance and consistency across the codebase.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Config = Skycore.Config || {};
  Skycore.Config.UI = Skycore.Config.UI || {};

  // ---- Touch Target Sizes (WCAG 2.1 Level AAA minimum: 44×44px) -----------
  Skycore.Config.UI.TouchTargets = Object.freeze({
    MIN_SIZE: 44,        // Minimum touch target size (px)
    BUTTON_HEIGHT: 48,  // Standard button height (px)
    SMALL_BUTTON: 40    // Smaller interactive elements (px)
  });

  // ---- Component Heights ----------------------------------------------------
  Skycore.Config.UI.Heights = Object.freeze({
    PRESENTATION_BAR: 56,  // Presentation score bar height (px)
    VIBES_BAR: 60,         // Outfit vibes bar height (px)
    MODAL_HEADER: 56       // Modal header height (px)
  });

  // ---- Z-Index Layers (ordered from lowest to highest) ----------------------
  Skycore.Config.UI.ZIndex = Object.freeze({
    BASE: 1,
    BACK_BUTTON: 1000,
    SIDEBAR: 2000,
    DRAG_GHOST: 9999,
    MODAL: 10000
  });

  // ---- Offscreen Positioning ------------------------------------------------
  Skycore.Config.UI.Offscreen = Object.freeze({
    HIDDEN_X: -9999,  // X position for hidden elements (px)
    HIDDEN_Y: -9999   // Y position for hidden elements (px)
  });

  // ---- Responsive Breakpoints -----------------------------------------------
  Skycore.Config.UI.Breakpoints = Object.freeze({
    SMALL_PHONE: 360,   // Small phone max width (px)
    MOBILE: 600,        // Mobile max width (px)
    TABLET: 768,        // Tablet max width (px)
    DESKTOP: 1024       // Desktop min width (px)
  });

  // ---- Animation Durations (ms) ---------------------------------------------
  Skycore.Config.UI.Animation = Object.freeze({
    FAST: 80,           // Fast transitions (ms)
    NORMAL: 200,        // Normal transitions (ms)
    SLOW: 500           // Slow transitions (ms)
  });

  // ---- Slot Sizing ----------------------------------------------------------
  Skycore.Config.UI.Slots = Object.freeze({
    SMALL_PHONE_SIZE: 56  // Slot size on small phones (px)
  });
})();
