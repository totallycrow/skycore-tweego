/* =========================================================================
   Skycore System: City Page (Hub)

   Goals:
   - Mobile-first, fast, single delegated click handler
   - Responsive layout similar to Room page
   - Links to implemented pages (Shopping Mall).
     Everything else shows a simple "Not implemented" modal.

   Usage in Twee:
     :: City
     <<city>>
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // ----------------------------- Data ------------------------------------

  const CITY_SECTIONS = [
    {
      id: "locations",
      title: "LOCATIONS",
      items: [
        { label: "UNIVERSITY", kind: "todo" },
        { label: "SHOPPING MALL", kind: "passage", passage: "Shopping Mall" },
        { label: "PUB", kind: "todo" },
        { label: "HOME", kind: "passage", passage: "Room" }
      ]
    }
  ];

  // --------------------------- Helpers -----------------------------------

  function playPassage(name) {
    if (typeof Engine !== "undefined" && Engine && typeof Engine.play === "function") {
      Engine.play(name);
      return;
    }
    // Fallback (should not happen in SugarCube)
    window.location.hash = "#" + encodeURIComponent(name);
  }

  function showNotImplemented(label) {
    const modals = Skycore.Systems.InventoryModals;
    const alertModal = modals && modals.AlertModal;

    if (alertModal && typeof alertModal.open === "function") {
      alertModal.open({
        title: "Not implemented yet",
        message: `"${label}" will be added later.`
      });
      return;
    }

    // Fallback (if Inventory modals are disabled/removed)
    window.alert(`Not implemented yet: ${label}`);
  }

  function sectionHTML(section) {
    const items = section.items
      .map((it) => {
        const attrs = [
          `class="city-link"`,
          `type="button"`,
          `data-city-kind="${it.kind}"`,
          `data-city-label="${encodeURIComponent(it.label)}"`
        ];
        if (it.kind === "passage") {
          attrs.push(`data-city-passage="${encodeURIComponent(it.passage)}"`);
        }
        return `<button ${attrs.join(" ")}>${it.label}</button>`;
      })
      .join("\n");

    return `
      <section class="city-section city-section--${section.id}" aria-label="${section.title}">
        <h3 class="city-section-title">${section.title}</h3>
        <div class="city-section-links">
          ${items}
        </div>
      </section>
    `;
  }

  function cityHTML() {
    return `
      <div class="city-page" data-city-root="1">
        <header class="city-header">
          <h2 class="city-title">CITY</h2>
          <div class="city-title-rule" aria-hidden="true"></div>
        </header>

        <div class="city-grid" aria-label="City navigation">
          ${CITY_SECTIONS.map(sectionHTML).join("\n")}
        </div>
      </div>
    `;
  }

  // ---------------------------- Macro ------------------------------------

  Macro.add("city", {
    handler() {
      const wrap = document.createElement("div");
      wrap.innerHTML = cityHTML();

      // Single delegated handler for performance.
      const root = wrap.querySelector("[data-city-root]");
      if (root) {
        root.addEventListener(
          "click",
          (ev) => {
            const btn = ev.target && ev.target.closest && ev.target.closest(".city-link");
            if (!btn || !root.contains(btn)) return;

            const kind = btn.getAttribute("data-city-kind");
            const label = decodeURIComponent(btn.getAttribute("data-city-label") || "");

            if (kind === "passage") {
              const passage = decodeURIComponent(btn.getAttribute("data-city-passage") || "");
              if (passage) playPassage(passage);
              return;
            }

            showNotImplemented(label || "This");
          },
          { passive: true }
        );
      }

      this.output.appendChild(wrap);
    }
  });

  Skycore.Systems.City = {
    sections: CITY_SECTIONS
  };
})();
