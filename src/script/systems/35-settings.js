/* =========================================================================
   Skycore System: Settings Page (Mirror Background)
   - Stores values in State.variables.settings
   - Background: dark | pink | bedroom
   - Blur: 0..16px (applies via CSS var --mirror-bg-blur)
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  function ensureSettings() {
    const sv = State.variables;
    if (!sv.settings) sv.settings = {};
    if (!sv.settings.mirrorBg) sv.settings.mirrorBg = "dark";
    if (!Number.isFinite(sv.settings.mirrorBgBlur)) sv.settings.mirrorBgBlur = 6;
    sv.settings.mirrorBgBlur = Math.max(0, Math.min(16, sv.settings.mirrorBgBlur));
  }

  function settingsHTML() {
    const s = State.variables.settings;
    const bg = s.mirrorBg || "dark";
    const blur = Number.isFinite(s.mirrorBgBlur) ? s.mirrorBgBlur : 6;

    const btn = (id, label) => `
      <button type="button"
              class="set-btn ${bg === id ? "is-active" : ""}"
              data-set-bg="${id}">
        ${label}
      </button>
    `;

    return `
      <div class="settings-page" data-settings-root="1">
        <h2 class="settings-title">Settings</h2>

        <div class="settings-block">
          <div class="settings-label">Mirror background</div>
          <div class="set-btn-row" role="group" aria-label="Mirror background">
            ${btn("dark", "Dark")}
            ${btn("pink", "Pink")}
            ${btn("bedroom", "Bedroom")}
            ${btn("bedroom-vertical", "Bedroom Vertical")}
          </div>
        </div>

        <div class="settings-block">
          <div class="settings-label">
            Background blur <span class="settings-value" data-blur-value="1">${blur}px</span>
          </div>
          <input class="set-slider"
                 type="range"
                 min="0"
                 max="16"
                 step="1"
                 value="${blur}"
                 data-set-blur="1"
                 aria-label="Background blur" />
          <div class="settings-hint">Tip: blur helps readability on image backgrounds.</div>
        </div>

        <div class="settings-block">
          <div class="settings-label">Preview</div>
          <div class="mirror-stage settings-preview"
               data-bg="${bg}"
               style="--mirror-bg-blur:${blur}px;">
            <div class="settings-preview-inner">
              <div class="settings-preview-card">Full</div>
              <div class="settings-preview-card">Portrait</div>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button type="button" class="set-btn set-btn--wide" data-open-mirror="1">
            Open Mirror
          </button>
        </div>
      </div>
    `;
  }

  function wire(root) {
    root.addEventListener("click", (ev) => {
      const bgBtn = ev.target.closest("[data-set-bg]");
      if (bgBtn) {
        ensureSettings();
        State.variables.settings.mirrorBg = bgBtn.getAttribute("data-set-bg") || "dark";
        // rerender Settings to update active state + preview
        $("#passages").find("[data-settings-root]").replaceWith(settingsHTML());
        // re-wire after replace
        Skycore.Systems.Settings?.wireCurrent?.();
        return;
      }

      const openMirror = ev.target.closest("[data-open-mirror]");
      if (openMirror) {
        Engine.play("Mirror");
      }
    });

    root.addEventListener("input", (ev) => {
      const slider = ev.target.closest("[data-set-blur]");
      if (!slider) return;

      ensureSettings();
      const v = Math.max(0, Math.min(16, parseInt(slider.value, 10) || 0));
      State.variables.settings.mirrorBgBlur = v;

      const valEl = root.querySelector("[data-blur-value]");
      if (valEl) valEl.textContent = `${v}px`;

      const preview = root.querySelector(".settings-preview.mirror-stage");
      if (preview) preview.style.setProperty("--mirror-bg-blur", `${v}px`);
    });
  }

  Macro.add("settings", {
    handler() {
      ensureSettings();
      const wrap = document.createElement("div");
      wrap.innerHTML = settingsHTML();
      this.output.appendChild(wrap);
      wire(wrap);
      // helper for rerender case
      Skycore.Systems.Settings = Skycore.Systems.Settings || {};
      Skycore.Systems.Settings.wireCurrent = () => {
        const r = document.querySelector("[data-settings-root]");
        if (r) wire(r);
      };
    }
  });
})();
