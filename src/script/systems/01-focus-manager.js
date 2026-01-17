/* =========================================================================
   Focus Manager: Centralized Focus Management
   
   Provides consistent focus handling across the application, especially
   important for mobile UX and accessibility.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  /**
   * Blurs the active element if it's within the given root container
   * @param {HTMLElement} root - Root container element (optional, if not provided, blurs any active interactive element)
   */
  function blurActiveIfInsideRoot(root) {
    const ae = document.activeElement;
    if (!ae || !(ae instanceof HTMLElement)) {
      return;
    }

    // If root is provided, check if active element is inside it
    if (root && root instanceof HTMLElement) {
      if (!root.contains(ae)) {
        return;
      }
    }

    // Only blur interactive controls
    const tag = ae.tagName;
    if (tag === "BUTTON" || tag === "A" || ae.classList.contains("inv-slot") || ae.classList.contains("inv-btn")) {
      ae.blur();
    }
  }

  /**
   * Resets focus by moving it away from the current element
   * Useful for preventing iOS focus stickiness after touch interactions
   */
  function resetFocus() {
    // Create a temporary invisible button, focus it, then remove it
    // This forces iOS to move focus away from the clicked button
    const temp = document.createElement("button");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    temp.style.pointerEvents = "none";
    temp.style.width = "1px";
    temp.style.height = "1px";
    temp.style.top = "-9999px";
    document.body.appendChild(temp);
    temp.focus();
    temp.click();
    setTimeout(() => {
      try {
        document.body.removeChild(temp);
      } catch (e) {
        // Ignore errors if element was already removed
      }
    }, 0);
  }

  /**
   * Blurs the active element if it's an interactive element
   * @param {HTMLElement} element - Element to blur (optional, defaults to activeElement)
   */
  function blurActive(element) {
    const target = element || document.activeElement;
    if (target && target instanceof HTMLElement && typeof target.blur === "function") {
      target.blur();
      // Double-check as fallback
      if (document.activeElement === target) {
        setTimeout(() => {
          if (document.activeElement === target) {
            document.activeElement.blur();
          }
        }, 0);
      }
    }
  }

  /**
   * Safely focuses an element with scroll prevention
   * @param {HTMLElement} element - Element to focus
   * @param {Object} options - Focus options
   */
  function safeFocus(element, options = {}) {
    if (!element || typeof element.focus !== "function") {
      return false;
    }

    const focusOptions = {
      preventScroll: true,
      ...options
    };

    requestAnimationFrame(() => {
      try {
        element.focus(focusOptions);
      } catch (e) {
        // Some browsers may not support focus options
        element.focus();
      }
    });

    return true;
  }

  Skycore.Systems.FocusManager = {
    blurActiveIfInsideRoot,
    resetFocus,
    blurActive,
    safeFocus
  };
})();
