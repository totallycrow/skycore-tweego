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

  function scheduleNext(charDisplayEl, state) {
    clearTimers(state);
    if (!state.enabled) return;
    if (!charDisplayEl.isConnected) return;

    const wait = randInt(state.minIdleMs, state.maxIdleMs);
    state.nextTimer = setTimeout(() => blinkOnce(charDisplayEl, state), wait);
  }

  function blinkOnce(charDisplayEl, state) {
    if (!state.enabled) return;
    if (document.hidden) return;
    if (!charDisplayEl.isConnected) return;

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

  function attach(charDisplayEl, options = {}) {
    if (!charDisplayEl) return;
    if (prefersReducedMotion()) return;

    const eyesEl = getEyesEl(charDisplayEl);
    if (!eyesEl) return; // eyes layer not present -> nothing to animate

    // Get merged config (static + SugarCube variables)
    const cfg = getBlinkConfig();

    // Get or create state
    const existing = controllers.get(charDisplayEl);
    const state = existing || {
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

    // Store controller
    controllers.set(charDisplayEl, state);

    // Ensure starting frame is open
    setEyesFrame(eyesEl, "open");

    // Restart timers on every attach (prevents old long timers lingering)
    clearTimers(state);

    if (!state.enabled) return;

    // If quickOnAttach is on, we always do a quick "first blink window" when attached
    // (great for inventory open so player notices)
    if (state.quickOnAttach) {
      const firstWait = randInt(state.firstMinMs, state.firstMaxMs);
      state.nextTimer = setTimeout(() => blinkOnce(charDisplayEl, state), firstWait);
    } else if (!state.hasBlinkedOnce) {
      // Only quick on the very first time ever
      const firstWait = randInt(state.firstMinMs, state.firstMaxMs);
      state.nextTimer = setTimeout(() => blinkOnce(charDisplayEl, state), firstWait);
    } else {
      // Normal cadence
      scheduleNext(charDisplayEl, state);
    }
  }

  function detach(charDisplayEl) {
    const state = controllers.get(charDisplayEl);
    if (!state) return;

    clearTimers(state);
    controllers.delete(charDisplayEl);

    // Reset to open if still present
    const eyesEl = getEyesEl(charDisplayEl);
    if (eyesEl) setEyesFrame(eyesEl, "open");
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
      document.querySelectorAll(".char-display").forEach(el => {
        const state = controllers.get(el);
        if (!state) return;
        clearTimers(state);
        const eyesEl = getEyesEl(el);
        if (eyesEl) setEyesFrame(eyesEl, "open");
      });
    } else {
      // resume
      document.querySelectorAll(".char-display").forEach(el => {
        const state = controllers.get(el);
        if (!state) return;
        scheduleNext(el, state);
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
