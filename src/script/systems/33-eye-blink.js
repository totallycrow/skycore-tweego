/* =========================================================================
   Eye Blink Animation (Modular, Mobile-first)
   - Works with any .char-display element that contains .char-display-sprite-eyes
   - Low CPU: scheduled timeouts only
   - Pauses on tab hidden, respects reduced motion
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const controllers = new WeakMap();
  const groupControllers = new Map(); // Map<blinkGroupId, { state, displays: Set<HTMLElement> }>

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getBlinkConfig() {
    // Static defaults (code-level)
    const base = (Skycore.Config?.Anim?.EyeBlink) ? Skycore.Config.Anim.EyeBlink : {};

    // SugarCube runtime overrides (in saves) - allows tweaking in-game
    const V = window.State?.variables;
    const fromVars = V?.uiBlink || V?.blink || {}; // pick one convention

    // Merge: vars override static
    return Object.assign({}, base, fromVars);
  }

  function getEyesSprites() {
    const cfg = Skycore.Systems.CharacterDisplay?.CONFIG;
    return cfg?.eyesSprites || {
      open: "assets/mc-eyes/eyes-open.webp",
      half: "assets/mc-eyes/eyes-half-closed.webp",
      closed: "assets/mc-eyes/eyes-closed.webp"
    };
  }

  function randInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function getEyesEl(charDisplayEl) {
    return charDisplayEl?.querySelector?.(".char-display-sprite-eyes") || null;
  }

  function getAllEyesInGroup(blinkGroupId) {
    if (!blinkGroupId) return [];
    const displays = document.querySelectorAll(`.char-display[data-blink-group="${blinkGroupId}"]`);
    const eyes = [];
    displays.forEach(display => {
      const eyesEl = getEyesEl(display);
      if (eyesEl) eyes.push(eyesEl);
    });
    return eyes;
  }

  function clearTimers(state) {
    if (state.nextTimer) clearTimeout(state.nextTimer);
    if (state.phaseTimer) clearTimeout(state.phaseTimer);
    state.nextTimer = null;
    state.phaseTimer = null;
  }

  function setEyesFrame(eyesEl, frameKey) {
    const sprites = getEyesSprites();
    const src = sprites[frameKey] || sprites.open;
    if (eyesEl && eyesEl.src !== src) eyesEl.src = src;
  }

  function setEyesFrameForGroup(blinkGroupId, frameKey) {
    const eyesElements = getAllEyesInGroup(blinkGroupId);
    eyesElements.forEach(eyesEl => setEyesFrame(eyesEl, frameKey));
  }

  function scheduleNext(charDisplayEl, state, blinkGroupId = null) {
    clearTimers(state);
    if (!state.enabled) return;
    if (blinkGroupId) {
      // Group mode: check if any display in group is still connected
      const displays = document.querySelectorAll(`.char-display[data-blink-group="${blinkGroupId}"]`);
      const hasConnected = Array.from(displays).some(el => el.isConnected);
      if (!hasConnected) {
        clearTimers(state);
        return;
      }
    } else {
      // Individual mode: check this display
      if (!charDisplayEl.isConnected) {
        clearTimers(state);
        return;
      }
    }

    const wait = randInt(state.minIdleMs, state.maxIdleMs);
    state.nextTimer = setTimeout(() => blinkOnce(charDisplayEl, state, blinkGroupId), wait);
  }

  function blinkOnce(charDisplayEl, state, blinkGroupId = null) {
    if (!state.enabled) return;

    // IMPORTANT: if tab hidden, stop timers so controller can restart later
    if (document.hidden) {
      clearTimers(state);
      return;
    }

    if (blinkGroupId) {
      // Group mode: check if any display in group is still connected
      const displays = document.querySelectorAll(`.char-display[data-blink-group="${blinkGroupId}"]`);
      const hasConnected = Array.from(displays).some(el => el.isConnected);

      // IMPORTANT: if nobody is connected, stop timers (prevents "dead" controller)
      if (!hasConnected) {
        clearTimers(state);
        return;
      }

      // Check if eyes elements exist in any display
      const eyesElements = getAllEyesInGroup(blinkGroupId);
      if (eyesElements.length === 0) {
        // Eyes are being re-rendered, try again later
        scheduleNext(charDisplayEl, state, blinkGroupId);
        return;
      }

      // Blink all eyes in group simultaneously
      setEyesFrameForGroup(blinkGroupId, "half");
      state.phaseTimer = setTimeout(() => {
        setEyesFrameForGroup(blinkGroupId, "closed");
        state.phaseTimer = setTimeout(() => {
          setEyesFrameForGroup(blinkGroupId, "half");
          state.phaseTimer = setTimeout(() => {
            setEyesFrameForGroup(blinkGroupId, "open");
            state.hasBlinkedOnce = true;
            scheduleNext(charDisplayEl, state, blinkGroupId);
          }, state.tHalf2Ms);
        }, state.tClosedMs);
      }, state.tHalf1Ms);
    } else {
      // Individual mode: original behavior
      if (!charDisplayEl.isConnected) {
        clearTimers(state);
        return;
      }

      const eyesEl = getEyesEl(charDisplayEl);
      if (!eyesEl) {
        // The character display is being re-rendered (e.g. applying item sets).
        // Do NOT let the blink controller die—just try again later.
        scheduleNext(charDisplayEl, state);
        return;
      }

      // half -> closed -> half -> open (delicate)
      setEyesFrame(eyesEl, "half");
      state.phaseTimer = setTimeout(() => {
        setEyesFrame(eyesEl, "closed");
        state.phaseTimer = setTimeout(() => {
          setEyesFrame(eyesEl, "half");
          state.phaseTimer = setTimeout(() => {
            setEyesFrame(eyesEl, "open");
            state.hasBlinkedOnce = true;
            scheduleNext(charDisplayEl, state);
          }, state.tHalf2Ms);
        }, state.tClosedMs);
      }, state.tHalf1Ms);
    }
  }

  function attach(charDisplayEl, options = {}) {
    if (!charDisplayEl) return;
    if (prefersReducedMotion()) return;

    const eyesEl = getEyesEl(charDisplayEl);
    if (!eyesEl) return; // eyes layer not present -> nothing to animate

    // Check if this display is part of a blink group
    const blinkGroupId = charDisplayEl.getAttribute("data-blink-group");

    // Get merged config (static + SugarCube variables)
    const cfg = getBlinkConfig();

    // Get or create state
    let state;
    let isGroupController = false;

    if (blinkGroupId) {
      // Group mode: use shared controller for this group
      let groupCtrl = groupControllers.get(blinkGroupId);
      if (!groupCtrl) {
        // Create new group controller
        state = {
          enabled: true,

          // First blink window
          firstMinMs: 450,
          firstMaxMs: 1200,

          // Subsequent blink window
          minIdleMs: 2500,
          maxIdleMs: 6500,

          // Phase timings
          tHalf1Ms: 60,
          tClosedMs: 80,
          tHalf2Ms: 60,

          // Behavior
          quickOnAttach: true,
          hasBlinkedOnce: false,

          nextTimer: null,
          phaseTimer: null
        };
        groupCtrl = { state, displays: new Set() };
        groupControllers.set(blinkGroupId, groupCtrl);
        isGroupController = true;
      } else {
        // Use existing group controller
        state = groupCtrl.state;
        isGroupController = false;
      }
      // Add this display to the group
      groupCtrl.displays.add(charDisplayEl);
    } else {
      // Individual mode: original behavior
      const existing = controllers.get(charDisplayEl);
      state = existing || {
        enabled: true,

        // First blink window
        firstMinMs: 450,
        firstMaxMs: 1200,

        // Subsequent blink window
        minIdleMs: 2500,
        maxIdleMs: 6500,

        // Phase timings
        tHalf1Ms: 60,
        tClosedMs: 80,
        tHalf2Ms: 60,

        // Behavior
        quickOnAttach: true,   // Always do quick blink on attach (great for inventory UX)
        hasBlinkedOnce: false,

        nextTimer: null,
        phaseTimer: null
      };
    }

    // ALWAYS apply config (so edits take effect even if controller already exists)
    if (typeof cfg.enabled === "boolean") state.enabled = cfg.enabled;

    if (Number.isFinite(cfg.firstMinMs)) state.firstMinMs = cfg.firstMinMs;
    if (Number.isFinite(cfg.firstMaxMs)) state.firstMaxMs = cfg.firstMaxMs;

    if (Number.isFinite(cfg.minIdleMs)) state.minIdleMs = cfg.minIdleMs;
    if (Number.isFinite(cfg.maxIdleMs)) state.maxIdleMs = cfg.maxIdleMs;

    if (Number.isFinite(cfg.tHalf1Ms)) state.tHalf1Ms = cfg.tHalf1Ms;
    if (Number.isFinite(cfg.tClosedMs)) state.tClosedMs = cfg.tClosedMs;
    if (Number.isFinite(cfg.tHalf2Ms)) state.tHalf2Ms = cfg.tHalf2Ms;

    if (typeof cfg.quickOnAttach === "boolean") state.quickOnAttach = cfg.quickOnAttach;

    // Apply per-call options last (highest priority)
    if (typeof options.enabled === "boolean") state.enabled = options.enabled;

    if (Number.isFinite(options.firstMinMs)) state.firstMinMs = options.firstMinMs;
    if (Number.isFinite(options.firstMaxMs)) state.firstMaxMs = options.firstMaxMs;

    if (Number.isFinite(options.minIdleMs)) state.minIdleMs = options.minIdleMs;
    if (Number.isFinite(options.maxIdleMs)) state.maxIdleMs = options.maxIdleMs;

    if (Number.isFinite(options.tHalf1Ms)) state.tHalf1Ms = options.tHalf1Ms;
    if (Number.isFinite(options.tClosedMs)) state.tClosedMs = options.tClosedMs;
    if (Number.isFinite(options.tHalf2Ms)) state.tHalf2Ms = options.tHalf2Ms;

    if (typeof options.quickOnAttach === "boolean") state.quickOnAttach = options.quickOnAttach;

    // Store controller (only for individual mode)
    if (!blinkGroupId) {
      controllers.set(charDisplayEl, state);
    }

    // Ensure starting frame is open
    if (blinkGroupId) {
      setEyesFrameForGroup(blinkGroupId, "open");
    } else {
      setEyesFrame(eyesEl, "open");
    }

    if (!state.enabled) return;

    if (blinkGroupId) {
      // GROUP MODE:
      // Start timers if this is the controller OR if the controller is currently not running.
      const needsStart = isGroupController || (!state.nextTimer && !state.phaseTimer);

      if (needsStart) {
        clearTimers(state);

        if (state.quickOnAttach) {
          const firstWait = randInt(state.firstMinMs, state.firstMaxMs);
          state.nextTimer = setTimeout(() => blinkOnce(charDisplayEl, state, blinkGroupId), firstWait);
        } else if (!state.hasBlinkedOnce) {
          const firstWait = randInt(state.firstMinMs, state.firstMaxMs);
          state.nextTimer = setTimeout(() => blinkOnce(charDisplayEl, state, blinkGroupId), firstWait);
        } else {
          scheduleNext(charDisplayEl, state, blinkGroupId);
        }
      }
    } else {
      // INDIVIDUAL MODE (unchanged logic)
      clearTimers(state);

      if (state.quickOnAttach) {
        const firstWait = randInt(state.firstMinMs, state.firstMaxMs);
        state.nextTimer = setTimeout(() => blinkOnce(charDisplayEl, state), firstWait);
      } else if (!state.hasBlinkedOnce) {
        const firstWait = randInt(state.firstMinMs, state.firstMaxMs);
        state.nextTimer = setTimeout(() => blinkOnce(charDisplayEl, state), firstWait);
      } else {
        scheduleNext(charDisplayEl, state);
      }
    }
  }

  function detach(charDisplayEl) {
    const blinkGroupId = charDisplayEl.getAttribute("data-blink-group");

    if (blinkGroupId) {
      // Group mode: remove from group
      const groupCtrl = groupControllers.get(blinkGroupId);
      if (groupCtrl) {
        groupCtrl.displays.delete(charDisplayEl);
        // If no displays left, clean up group controller
        if (groupCtrl.displays.size === 0) {
          clearTimers(groupCtrl.state);
          groupControllers.delete(blinkGroupId);
        }
      }
      // Reset to open if still present
      const eyesEl = getEyesEl(charDisplayEl);
      if (eyesEl) setEyesFrame(eyesEl, "open");
    } else {
      // Individual mode: original behavior
      const state = controllers.get(charDisplayEl);
      if (!state) return;

      clearTimers(state);
      controllers.delete(charDisplayEl);

      // Reset to open if still present
      const eyesEl = getEyesEl(charDisplayEl);
      if (eyesEl) setEyesFrame(eyesEl, "open");
    }
  }

  function attachAll(root) {
    const scope = root || document;
    const displays = scope.querySelectorAll(".char-display");
    displays.forEach(el => attach(el));
  }

  // Global pause/resume for mobile battery
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // stop timers + reset to open
      // Handle individual controllers
      document.querySelectorAll(".char-display").forEach(el => {
        const blinkGroupId = el.getAttribute("data-blink-group");
        if (blinkGroupId) {
          // Group mode: reset all eyes in group
          setEyesFrameForGroup(blinkGroupId, "open");
        } else {
          // Individual mode
          const state = controllers.get(el);
          if (!state) return;
          clearTimers(state);
          const eyesEl = getEyesEl(el);
          if (eyesEl) setEyesFrame(eyesEl, "open");
        }
      });
      // Clear all group controller timers
      groupControllers.forEach(groupCtrl => {
        clearTimers(groupCtrl.state);
      });
    } else {
      // resume
      // Resume group controllers (only once per group)
      const resumedGroups = new Set();
      document.querySelectorAll(".char-display").forEach(el => {
        const blinkGroupId = el.getAttribute("data-blink-group");
        if (blinkGroupId) {
          if (!resumedGroups.has(blinkGroupId)) {
            resumedGroups.add(blinkGroupId);
            const groupCtrl = groupControllers.get(blinkGroupId);
            if (groupCtrl) {
              scheduleNext(el, groupCtrl.state, blinkGroupId);
            }
          }
        } else {
          // Individual mode
          const state = controllers.get(el);
          if (!state) return;
          scheduleNext(el, state);
        }
      });
    }
  });

  Skycore.Systems.EyeBlink = {
    attach,
    detach,
    attachAll
  };

  // SugarCube: auto-attach on passage render (covers inventory macro timing)
  if (window.jQuery) {
    jQuery(document).on(":passagerender", function () {
      try {
        Skycore.Systems.EyeBlink.attachAll(document);
      } catch (e) {
        /* no-op */
      }
    });

    // Clean up group controllers on passage change to prevent memory leaks.
    // When a passage changes, displays are removed from DOM without calling detach(),
    // leaving stale entries in groupControllers Map.
    jQuery(document).on(":passagestart", function () {
      // Clear all group controller timers and remove stale entries
      groupControllers.forEach((groupCtrl) => {
        clearTimers(groupCtrl.state);
      });
      groupControllers.clear();
    });
  } else {
    // Fallback: best-effort after DOM ready
    document.addEventListener("DOMContentLoaded", () => {
      try {
        Skycore.Systems.EyeBlink.attachAll(document);
      } catch (e) {
        /* no-op */
      }
    });
  }
})();
