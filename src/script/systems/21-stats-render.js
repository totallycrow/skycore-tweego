/* =========================================================================
   MC Sheet v1: Render Functions
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  function capitalize(s) {
    return (s && s.length) ? (s[0].toUpperCase() + s.slice(1)) : s;
  }

  function formatStatName(key) {
    // Convert camelCase/snake_case to Title Case
    return capitalize(key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim());
  }

  function renderStatValue(value) {
    return String(value || 0);
  }

  function renderStatBar(value, max, label) {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    const html = '<div class="mc-stat-bar">' +
      '<div class="mc-stat-bar-label">' + label + '</div>' +
      '<div class="mc-stat-bar-value">' + renderStatValue(value) + '/' + max + '</div>' +
      '<div class="mc-stat-bar-track">' +
      '<div class="mc-stat-bar-fill" style="width: ' + percent + '%"></div>' +
      '</div>' +
      '</div>';
    return html;
  }

  function renderStatRow(label, value) {
    const html = '<div class="mc-stat-row">' +
      '<div class="mc-stat-label">' + label + '</div>' +
      '<div class="mc-stat-value">' + renderStatValue(value) + '</div>' +
      '</div>';
    return html;
  }

  function renderStatSection(title, stats, isStatusMeter) {
    isStatusMeter = isStatusMeter || false;
    let html = '<div class="mc-stat-section">';
    html += '<div class="mc-stat-section-title">' + title + '</div>';
    html += '<div class="mc-stat-section-content">';

    Object.keys(stats).forEach(function(key) {
      const value = stats[key];
      const label = formatStatName(key);
      
      if (isStatusMeter) {
        // Status meters use bars (0-100 scale)
        html += renderStatBar(value, 100, label);
      } else {
        // Attributes/skills use simple rows
        html += renderStatRow(label, value);
      }
    });

    html += '</div></div>';
    return html;
  }

  function renderStatTextRow(label, text) {
    const html = '<div class="mc-stat-row">' +
      '<div class="mc-stat-label">' + label + '</div>' +
      '</div>' +
      '<div class="mc-stat-text-row">' +
      '<div class="mc-stat-text-value">' + text + '</div>' +
      '</div>';
    return html;
  }

  function renderStats() {
    const V = State.variables;
    if (!V.mcStats) {
      return '<div class="mc-stats-error">Stats not initialized.</div>';
    }

    const attributes = V.mcStats.attributes;
    const skills = V.mcStats.skills;
    const sexSkills = V.mcStats.sexSkills;
    const status = V.mcStats.status;
    
    // Get presentation data from single source of truth
    let genderRead = "Error: Presentation read system not loaded.";
    let presentationScore = 50;
    let readAs = null;

    if (Skycore.Systems.PresentationState) {
      const presentationData = Skycore.Systems.PresentationState.get();
      presentationScore = presentationData.presentationScore || 50;
      readAs = presentationData.readAs || null;
      genderRead = presentationData.genderRead || genderRead;
    } else {
      // Fallback to direct computation if PresentationState not available
      if (Skycore.Systems.PresentationEngine && Skycore.Systems.PresentationEngine.compute) {
        const result = Skycore.Systems.PresentationEngine.compute();
        presentationScore = Math.round(result.presentationScore);
        readAs = result.readAs;
        genderRead = Skycore.Systems.PresentationEngine.getGenderRead() || genderRead;
      } else if (Skycore.Systems.PresentationRead && Skycore.Systems.PresentationRead.getGenderRead) {
        genderRead = Skycore.Systems.PresentationRead.getGenderRead();
        if (Skycore.Systems.PresentationRead.getPresentation) {
          presentationScore = Skycore.Systems.PresentationRead.getPresentation();
        }
      }
    }

    let html = '<div class="mc-stats-container" data-mc-stats-root="1">';

    // Attributes
    html += renderStatSection("Attributes", attributes);

    // Skills
    html += renderStatSection("Skills", skills);

    // Sex Skills
    html += renderStatSection("Sex Skills", sexSkills);

    // Status Meters
    html += renderStatSection("Status", status, true);

    // Derived Stats
    html += '<div class="mc-stat-section">';
    html += '<div class="mc-stat-section-title">Presentation</div>';
    html += '<div class="mc-stat-section-content">';
    html += renderStatRow("Presentation Score", presentationScore);
    if (readAs !== null) {
      html += renderStatRow("Read As", capitalize(readAs));
    }
    html += renderStatTextRow("How you're being read", genderRead);
    html += '</div></div>';

    html += '</div>';
    return html;
  }

  /**
   * Update presentation score display in MC stats UI
   * Called whenever stats or equipment changes
   */
  function updatePresentationScore() {
    const root = document.querySelector('[data-mc-stats-root="1"]');
    if (!root) return;

    // Find the presentation section (it's the last section)
    const sections = root.querySelectorAll('.mc-stat-section');
    if (sections.length === 0) return;
    
    // The presentation section is the last one
    const presentationSection = sections[sections.length - 1];
    if (!presentationSection) return;

    // Get fresh presentation data from single source of truth
    let presentationScore = 50;
    let readAs = null;
    let genderRead = "Error: Presentation read system not loaded.";

    if (Skycore.Systems.PresentationState) {
      const presentationData = Skycore.Systems.PresentationState.get();
      presentationScore = presentationData.presentationScore || 50;
      readAs = presentationData.readAs || null;
      genderRead = presentationData.genderRead || genderRead;
    } else {
      // Fallback to direct computation if PresentationState not available
      if (Skycore.Systems.PresentationEngine && Skycore.Systems.PresentationEngine.compute) {
        const result = Skycore.Systems.PresentationEngine.compute();
        presentationScore = Math.round(result.presentationScore);
        readAs = result.readAs;
        genderRead = Skycore.Systems.PresentationEngine.getGenderRead() || genderRead;
      } else if (Skycore.Systems.PresentationRead && Skycore.Systems.PresentationRead.getGenderRead) {
        genderRead = Skycore.Systems.PresentationRead.getGenderRead();
        if (Skycore.Systems.PresentationRead.getPresentation) {
          presentationScore = Skycore.Systems.PresentationRead.getPresentation();
        }
      }
    }

    // Find all presentation-related rows in the section content
    const sectionContent = presentationSection.querySelector('.mc-stat-section-content');
    if (!sectionContent) return;

    const rows = sectionContent.querySelectorAll('.mc-stat-row');
    
    // Update presentation score row (first row)
    if (rows.length > 0) {
      const scoreRow = rows[0];
      const valueEl = scoreRow.querySelector('.mc-stat-value');
      if (valueEl) {
        valueEl.textContent = renderStatValue(presentationScore);
      }
    }

    // Update read as row (second row, if exists)
    if (rows.length > 1 && readAs !== null) {
      const readAsRow = rows[1];
      const valueEl = readAsRow.querySelector('.mc-stat-value');
      if (valueEl) {
        valueEl.textContent = capitalize(readAs);
      }
    }

    // Update gender read text row (find the text row after the stat rows)
    const textRow = sectionContent.querySelector('.mc-stat-text-row');
    if (textRow) {
      const textValueEl = textRow.querySelector('.mc-stat-text-value');
      if (textValueEl) {
        textValueEl.textContent = genderRead;
      }
    }
  }

  Skycore.Systems.StatsRender = {
    renderStats,
    updatePresentationScore
  };
})();
