/* =========================================================================
   Skycore System: Mirror Page (Mobile-first)
   - Left: full body character display (same engine as inventory)
   - Right: zoomed "portrait" using the same sprite stack (CSS transform)
   - Independent blinking (uses its own blinkGroup "mirror")
   - Easy position control via MIRROR_PORTRAIT_CONFIG
   - Background zoom/position control via MIRROR_BACKGROUND_CONFIG
   
   Developer Controls:
   - MIRROR_PORTRAIT_CONFIG: Adjust portrait zoom/position per screen size
   - MIRROR_BACKGROUND_CONFIG: Adjust background image zoom/position per background type
     Example: To zoom in bedroom background on mobile:
       MIRROR_BACKGROUND_CONFIG.bedroom.mobile.scale = 1.5;
       MIRROR_BACKGROUND_CONFIG.bedroom.mobile.x = -10; // shift left 10%
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  /**
   * Portrait Position Configuration
   * Easy adjustment for different screen sizes
   * Values: scale (zoom), x (horizontal %), y (vertical %)
   */
  const MIRROR_PORTRAIT_CONFIG = {
    // Mobile (default, < 768px)
    mobile: {
      scale: 4.5,
      x: -1,  // negative = left, positive = right
      y: 9,   // negative = up, positive = down
    },
    // Very small mobile (≤ 420px)
    mobileSmall: {
      scale: 4.6,
      x: -1,
      y: 8
    },
    // Desktop (≥ 768px)
    desktop: {
      scale: 3.2,
      x: -1,
      y: 22,
    }
  };

  /**
   * Background Position Configuration
   * Developer control for background image zoom and position
   * Per-background, per-screen-size configuration
   * Values: scale (zoom multiplier), x (horizontal %), y (vertical %)
   */
  const MIRROR_BACKGROUND_CONFIG = {
    // Bedroom background configuration
    bedroom: {
      // Mobile (default, < 768px)
      mobile: {
        scale: 1.0,  // 1.0 = no zoom, >1.0 = zoom in, <1.0 = zoom out
        x: 0,        // 0 = center, negative = left, positive = right
        y: 0,        // 0 = center, negative = up, positive = down
      },
      // Very small mobile (≤ 420px)
      mobileSmall: {
        scale: 1.5,
        x: 15,
        y: 10,
      },
      // Desktop (≥ 768px)
      desktop: {
        scale: 1,
        x: 0,
        y: 0,
      }
    },
    // Bedroom vertical background configuration
    "bedroom-vertical": {
      // Mobile (default, < 768px)
      mobile: {
        scale: 1.0,
        x: 0,
        y: 0,
      },
      // Very small mobile (≤ 420px)
      mobileSmall: {
        scale: 1.0,
        x: 0,
        y: 0,
      },
      // Desktop (≥ 768px)
      desktop: {
        scale: 1.0,
        x: 0,
        y: 0,
      }
    },
    // Add more backgrounds here as needed
    // example: {
    //   mobile: { scale: 1.2, x: -10, y: 5 },
    //   mobileSmall: { scale: 1.3, x: -10, y: 5 },
    //   desktop: { scale: 1.1, x: -10, y: 5 },
    // }
  };

  // Requires inventory state (equipment) + character display.
  const ensureState = Skycore.Systems.InventoryState?.ensureState;
  if (!ensureState) {
    console.error("34-mirror.js requires 03-inventory-state.js (InventoryState.ensureState)");
    return;
  }

  /**
   * Applies portrait position config to CSS custom properties
   * @param {HTMLElement} portraitPanel - The portrait panel element
   */
  function applyPortraitConfig(portraitPanel) {
    if (!portraitPanel) return;

    const isMobileSmall = window.matchMedia("(max-width: 420px)").matches;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;

    let config;
    if (isMobileSmall) {
      config = MIRROR_PORTRAIT_CONFIG.mobileSmall;
    } else if (isDesktop) {
      config = MIRROR_PORTRAIT_CONFIG.desktop;
    } else {
      config = MIRROR_PORTRAIT_CONFIG.mobile;
    }

    portraitPanel.style.setProperty("--mirror-face-scale", config.scale.toString());
    portraitPanel.style.setProperty("--mirror-face-x", `${config.x}%`);
    portraitPanel.style.setProperty("--mirror-face-y", `${config.y}%`);
  }

  /**
   * Applies background position config to CSS custom properties
   * @param {HTMLElement} mirrorStage - The mirror stage element
   * @param {string} bgType - Background type (e.g., "bedroom")
   */
  function applyBackgroundConfig(mirrorStage, bgType) {
    if (!mirrorStage || !bgType) return;

    const bgConfig = MIRROR_BACKGROUND_CONFIG[bgType];
    if (!bgConfig) {
      // No config for this background, use defaults
      mirrorStage.style.setProperty("--mirror-bg-scale", "1");
      mirrorStage.style.setProperty("--mirror-bg-x", "0%");
      mirrorStage.style.setProperty("--mirror-bg-y", "0%");
      return;
    }

    const isMobileSmall = window.matchMedia("(max-width: 420px)").matches;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;

    let config;
    if (isMobileSmall) {
      config = bgConfig.mobileSmall || bgConfig.mobile;
    } else if (isDesktop) {
      config = bgConfig.desktop || bgConfig.mobile;
    } else {
      config = bgConfig.mobile;
    }

    mirrorStage.style.setProperty("--mirror-bg-scale", config.scale.toString());
    mirrorStage.style.setProperty("--mirror-bg-x", `${config.x}%`);
    mirrorStage.style.setProperty("--mirror-bg-y", `${config.y}%`);
  }

  function renderMirrorUI() {
    const canRender = Skycore.Systems.CharacterDisplay && Skycore.Systems.CharacterDisplay.render;

    // Use independent blinkGroup "mirror" (not "mc") so it doesn't sync with inventory/sidebar
    const bodyHTML = canRender
      ? Skycore.Systems.CharacterDisplay.render({
          showPresentation: false,
          className: "char-display--mirror-body",
          blinkGroup: "mirror"
        })
      : '<img src="assets/mc-naked.webp" alt="Character" style="width:100%;height:auto;">';

    const faceHTML = canRender
      ? Skycore.Systems.CharacterDisplay.render({
          showPresentation: false,
          className: "char-display--mirror-face",
          blinkGroup: "mirror"
        })
      : '<img src="assets/mc-naked.webp" alt="Character" style="width:100%;height:auto;">';

    // Get background setting from State.variables, default to "dark"
    const bgSetting = State.variables?.settings?.mirrorBg || "dark";

    // Blur setting (0..16px)
    const blurSettingRaw = State.variables?.settings?.mirrorBgBlur;
    const blurSetting = Number.isFinite(blurSettingRaw) ? blurSettingRaw : 6;
    const blurClamped = Math.max(0, Math.min(16, blurSetting));

    return `
      <div class="mirror-stage"
           data-bg="${bgSetting}"
           style="--mirror-bg-blur: ${blurClamped}px;">
        <div class="mirror-ui" data-mirror-root="1">
          <section class="mirror-left" aria-label="Character (full)">
            <div class="mirror-panel mirror-panel--body">
              ${bodyHTML}
            </div>
          </section>

          <section class="mirror-right" aria-label="Character portrait">
            <div class="mirror-panel mirror-panel--portrait">
              ${faceHTML}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  Macro.add("mirror", {
    handler() {
      ensureState();

      const wrap = document.createElement("div");
      wrap.innerHTML = renderMirrorUI();
      this.output.appendChild(wrap);

      // Get background setting to apply background config
      const bgSetting = State.variables?.settings?.mirrorBg || "dark";
      const mirrorStage = wrap.querySelector(".mirror-stage");
      if (mirrorStage) {
        applyBackgroundConfig(mirrorStage, bgSetting);

        // Update background config on resize (debounced)
        let resizeTimer;
        const updateBackgroundOnResize = () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            applyBackgroundConfig(mirrorStage, bgSetting);
          }, 150);
        };
        window.addEventListener("resize", updateBackgroundOnResize);
        // Clean up listener when passage changes
        $(document).one(":passageend", () => {
          window.removeEventListener("resize", updateBackgroundOnResize);
        });
      }

      // Apply portrait position config based on screen size
      const portraitPanel = wrap.querySelector(".mirror-panel--portrait");
      if (portraitPanel) {
        applyPortraitConfig(portraitPanel);

        // Update on resize (debounced)
        let resizeTimer;
        const updateOnResize = () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            applyPortraitConfig(portraitPanel);
          }, 150);
        };
        window.addEventListener("resize", updateOnResize);
        // Clean up listener when passage changes
        $(document).one(":passageend", () => {
          window.removeEventListener("resize", updateOnResize);
        });
      }

      // Ensure blink attaches (uses independent "mirror" group)
      Skycore.Systems.EyeBlink?.attachAll?.(wrap);
    }
  });

  // Export config for easy external adjustment
  Skycore.Systems.Mirror = {
    PORTRAIT_CONFIG: MIRROR_PORTRAIT_CONFIG,
    BACKGROUND_CONFIG: MIRROR_BACKGROUND_CONFIG
  };
})();
