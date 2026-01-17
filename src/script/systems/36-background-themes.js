/* =========================================================================
   BackgroundThemes: unified background presets + sync logic
   Areas: mirror | inventory | sidebar
========================================================================= */
(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const DEFAULT_PRESET = "dark";
  const DEFAULT_BLUR = 0;

  function clampBlur(v) {
    // If v is undefined/null/NaN, return 0 (not DEFAULT_BLUR) to avoid auto-blurring
    const n = Number.isFinite(v) ? v : 0;
    return Math.max(0, Math.min(16, n));
  }

  function ensureSettings() {
    const sv = State.variables;
    if (!sv.settings) sv.settings = {};
    const s = sv.settings;

    if (typeof s.bgSync !== "boolean") s.bgSync = true;

    // global synced settings
    if (!s.bg) s.bg = {};
    if (!s.bg.preset) s.bg.preset = DEFAULT_PRESET;
    // Only clamp if blur is explicitly set (don't default to non-zero)
    if (Number.isFinite(s.bg.blur)) {
      s.bg.blur = clampBlur(s.bg.blur);
    } else {
      s.bg.blur = 0;
    }

    // per-area settings
    if (!s.bgMirror) s.bgMirror = {};
    if (!s.bgInventory) s.bgInventory = {};
    if (!s.bgSidebar) s.bgSidebar = {};

    for (const key of ["bgMirror", "bgInventory", "bgSidebar"]) {
      if (!s[key].preset) s[key].preset = DEFAULT_PRESET;
      // Only clamp if blur is explicitly set (don't default to non-zero)
      if (Number.isFinite(s[key].blur)) {
        s[key].blur = clampBlur(s[key].blur);
      } else {
        s[key].blur = 0;
      }
    }

    // Backward compat (your existing mirrorBg/mirrorBgBlur)
    if (s.mirrorBg && !s.bgMirror.preset) s.bgMirror.preset = s.mirrorBg;
    if (Number.isFinite(s.mirrorBgBlur) && !Number.isFinite(s.bgMirror.blur)) s.bgMirror.blur = clampBlur(s.mirrorBgBlur);

    return s;
  }

  function getBgConfig(area) {
    const s = ensureSettings();
    if (s.bgSync) {
      return { preset: s.bg.preset, blur: clampBlur(s.bg.blur) };
    }
    if (area === "mirror") return { preset: s.bgMirror.preset, blur: clampBlur(s.bgMirror.blur) };
    if (area === "inventory") return { preset: s.bgInventory.preset, blur: clampBlur(s.bgInventory.blur) };
    if (area === "sidebar") return { preset: s.bgSidebar.preset, blur: clampBlur(s.bgSidebar.blur) };
    return { preset: DEFAULT_PRESET, blur: DEFAULT_BLUR };
  }

  function applyStage(stageEl, area) {
    if (!stageEl) return;
    const cfg = getBgConfig(area);
    stageEl.setAttribute("data-bg", cfg.preset);
    
    // Set both blur vars for backward compatibility
    const blurPx = `${cfg.blur}px`;
    stageEl.style.setProperty("--stage-bg-blur", blurPx);
    stageEl.style.setProperty("--mirror-bg-blur", blurPx); // legacy support
  }

  function notifyChanged() {
    document.dispatchEvent(new CustomEvent("skycore:backgrounds-changed"));
  }

  Skycore.Systems.BackgroundThemes = {
    ensureSettings,
    getBgConfig,
    applyStage,
    notifyChanged
  };
})();
