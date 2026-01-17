/* =========================================================================
   Skycore System: Settings Pages (Nested)
   - Settings Home: Main menu
   - Settings - Backgrounds: Background controls with sync toggle
   - Uses BackgroundThemes system for unified background management
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const PRESETS = ["dark", "pink", "bedroom", "bedroom-vertical"];

  function presetLabel(preset) {
    const labels = {
      dark: "Dark",
      pink: "Pink",
      bedroom: "Bedroom",
      "bedroom-vertical": "Bedroom Vertical"
    };
    return labels[preset] || preset;
  }

  function settingsHomeHTML() {
    return `
      <div class="settings-page">
        <h2 class="settings-title">Settings</h2>

        <div class="settings-block">
          <div class="settings-label">Appearance</div>
          <button type="button" class="set-btn set-btn--wide" data-goto="Settings - Backgrounds">
            Backgrounds
          </button>
        </div>
      </div>
    `;
  }

  function settingsBackgroundsHTML() {
    if (!Skycore.Systems.BackgroundThemes) {
      return '<div class="settings-page"><p>BackgroundThemes system not loaded.</p></div>';
    }

    Skycore.Systems.BackgroundThemes.ensureSettings();
    const s = State.variables.settings;
    const sync = s.bgSync !== false; // default true

    // Get current configs
    const globalCfg = sync ? s.bg : { preset: s.bg?.preset || "dark", blur: s.bg?.blur || 6 };
    const mirrorCfg = s.bgMirror || { preset: "dark", blur: 6 };
    const invCfg = s.bgInventory || { preset: "dark", blur: 6 };
    const sidebarCfg = s.bgSidebar || { preset: "dark", blur: 6 };

    const btn = (id, label, active) => `
      <button type="button"
              class="set-btn ${active === id ? "is-active" : ""}"
              data-set-preset="${id}">
        ${label}
      </button>
    `;

    const presetRow = (presets, activePreset, dataArea) => `
      <div class="set-btn-row" role="group" aria-label="Background preset">
        ${presets.map(p => btn(p, presetLabel(p), activePreset)).join("")}
      </div>
    `;

    const blurSlider = (blur, dataArea) => `
      <input class="set-slider"
             type="range"
             min="0"
             max="16"
             step="1"
             value="${blur}"
             data-set-blur="${dataArea}"
             aria-label="Background blur" />
    `;

    const areaSection = (area, cfg, label) => {
      const areaId = area === "mirror" ? "mirror" : area === "inventory" ? "inventory" : "sidebar";
      return `
        <div class="settings-block">
          <div class="settings-label">${label}</div>
          ${presetRow(PRESETS, cfg.preset, areaId)}
          <div class="settings-label" style="margin-top: 12px;">
            Blur <span class="settings-value" data-blur-value="${areaId}">${cfg.blur}px</span>
          </div>
          ${blurSlider(cfg.blur, areaId)}
        </div>
      `;
    };

    return `
      <div class="settings-page" data-settings-root="1">
        <h2 class="settings-title">Backgrounds</h2>

        <div class="settings-block">
          <div class="settings-label">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" 
                     ${sync ? "checked" : ""} 
                     data-sync-toggle="1"
                     style="width: 20px; height: 20px; cursor: pointer;" />
              <span>Sync all backgrounds</span>
            </label>
          </div>
          <div class="settings-hint">When enabled, all areas use the same background and blur.</div>
        </div>

        ${sync ? `
          <div class="settings-block">
            <div class="settings-label">Background</div>
            ${presetRow(PRESETS, globalCfg.preset, "global")}
            <div class="settings-label" style="margin-top: 12px;">
              Blur <span class="settings-value" data-blur-value="global">${globalCfg.blur}px</span>
            </div>
            ${blurSlider(globalCfg.blur, "global")}
          </div>
        ` : `
          ${areaSection("mirror", mirrorCfg, "Mirror")}
          ${areaSection("inventory", invCfg, "Inventory")}
          ${areaSection("sidebar", sidebarCfg, "Sidebar")}
        `}

        <div class="settings-block">
          <div class="settings-label">Preview</div>
          <div class="settings-preview-grid">
            <div class="settings-preview-item">
              <div class="settings-preview-label">Mirror</div>
              <div class="stage settings-preview stage--mirror-preview" data-stage-preview="mirror">
                <div class="settings-preview-card">M</div>
              </div>
            </div>
            <div class="settings-preview-item">
              <div class="settings-preview-label">Inventory</div>
              <div class="stage settings-preview stage--inventory-preview" data-stage-preview="inventory">
                <div class="settings-preview-card">I</div>
              </div>
            </div>
            <div class="settings-preview-item">
              <div class="settings-preview-label">Sidebar</div>
              <div class="stage settings-preview stage--sidebar-preview" data-stage-preview="sidebar">
                <div class="settings-preview-card">S</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function updatePreviews(root) {
    if (!Skycore.Systems.BackgroundThemes) return;
    ["mirror", "inventory", "sidebar"].forEach(area => {
      const preview = root.querySelector(`[data-stage-preview="${area}"]`);
      if (preview) {
        Skycore.Systems.BackgroundThemes.applyStage(preview, area);
      }
    });
  }

  function wireBackgrounds(root) {
    // Sync toggle
    root.addEventListener("change", (ev) => {
      const syncToggle = ev.target.closest("[data-sync-toggle]");
      if (syncToggle) {
        Skycore.Systems.BackgroundThemes.ensureSettings();
        const s = State.variables.settings;
        const newSync = syncToggle.checked;

        if (newSync) {
          // Turning sync ON: copy current Mirror settings to global
          s.bgSync = true;
          s.bg = { ...s.bgMirror };
        } else {
          // Turning sync OFF: copy global to all areas
          s.bgSync = false;
          const global = s.bg || { preset: "dark", blur: 6 };
          s.bgMirror = { ...global };
          s.bgInventory = { ...global };
          s.bgSidebar = { ...global };
        }

        // Notify all stages to refresh
        Skycore.Systems.BackgroundThemes.notifyChanged?.();

        // Rerender to show/hide per-area controls
        $("#passages").find("[data-settings-root]").replaceWith(settingsBackgroundsHTML());
        Skycore.Systems.Settings?.wireCurrent?.();
        return;
      }
    });

    // Preset buttons
    root.addEventListener("click", (ev) => {
      const presetBtn = ev.target.closest("[data-set-preset]");
      if (presetBtn) {
        Skycore.Systems.BackgroundThemes.ensureSettings();
        const s = State.variables.settings;
        const preset = presetBtn.getAttribute("data-set-preset");
        // Find which area this button belongs to by looking for nearby blur slider
        const block = presetBtn.closest(".settings-block");
        const blurSlider = block?.querySelector("[data-set-blur]");
        const area = blurSlider?.getAttribute("data-set-blur") || "global";

        if (s.bgSync || area === "global") {
          if (!s.bg) s.bg = {};
          s.bg.preset = preset;
          
          // If switching to bedroom and blur is still 0, apply tasteful default
          if (preset === "bedroom" || preset === "bedroom-vertical") {
            if (!Number.isFinite(s.bg.blur) || s.bg.blur === 0) {
              s.bg.blur = 6;
            }
          }
        } else {
          const areaKey = area === "mirror" ? "bgMirror" : area === "inventory" ? "bgInventory" : "bgSidebar";
          if (!s[areaKey]) s[areaKey] = {};
          s[areaKey].preset = preset;
          
          // If switching to bedroom and blur is still 0, apply tasteful default
          if (preset === "bedroom" || preset === "bedroom-vertical") {
            const cfg = Skycore.Systems.BackgroundThemes.getBgConfig?.(area);
            if (cfg && (cfg.blur === 0 || !Number.isFinite(cfg.blur))) {
              s[areaKey].blur = 6;
            }
          }
        }

        // Notify all stages to refresh
        Skycore.Systems.BackgroundThemes.notifyChanged?.();

        // Rerender to update active state + previews
        $("#passages").find("[data-settings-root]").replaceWith(settingsBackgroundsHTML());
        Skycore.Systems.Settings?.wireCurrent?.();
        return;
      }
    });

    // Blur sliders
    root.addEventListener("input", (ev) => {
      const slider = ev.target.closest("[data-set-blur]");
      if (!slider) return;

      Skycore.Systems.BackgroundThemes.ensureSettings();
      const s = State.variables.settings;
      const area = slider.getAttribute("data-set-blur");
      const v = Math.max(0, Math.min(16, parseInt(slider.value, 10) || 0));

      if (s.bgSync || area === "global") {
        if (!s.bg) s.bg = {};
        s.bg.blur = v;
      } else {
        const areaKey = area === "mirror" ? "bgMirror" : area === "inventory" ? "bgInventory" : "bgSidebar";
        if (!s[areaKey]) s[areaKey] = {};
        s[areaKey].blur = v;
      }

      // Update blur value display
      const valEl = root.querySelector(`[data-blur-value="${area}"]`);
      if (valEl) valEl.textContent = `${v}px`;

      // Notify all stages to refresh
      Skycore.Systems.BackgroundThemes.notifyChanged?.();

      // Update previews
      updatePreviews(root);
    });

    // Initial preview update
    updatePreviews(root);
  }

  Macro.add("settingsHome", {
    handler() {
      const wrap = document.createElement("div");
      wrap.innerHTML = settingsHomeHTML();
      this.output.appendChild(wrap);

      wrap.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-goto]");
        if (btn) {
          Engine.play(btn.getAttribute("data-goto"));
        }
      });
    }
  });

  Macro.add("settingsBackgrounds", {
    handler() {
      if (!Skycore.Systems.BackgroundThemes) {
        console.error("BackgroundThemes system required for settingsBackgrounds");
        return;
      }

      Skycore.Systems.BackgroundThemes.ensureSettings();
      const wrap = document.createElement("div");
      wrap.innerHTML = settingsBackgroundsHTML();
      this.output.appendChild(wrap);
      wireBackgrounds(wrap);

      // Helper for rerender case
      Skycore.Systems.Settings = Skycore.Systems.Settings || {};
      Skycore.Systems.Settings.wireCurrent = () => {
        const r = document.querySelector("[data-settings-root]");
        if (r) wireBackgrounds(r);
      };
    }
  });

  // Backward compat: old <<settings>> macro
  Macro.add("settings", {
    handler() {
      // Redirect to backgrounds page for backward compatibility
      Engine.play("Settings - Backgrounds");
    }
  });
})();
