/* =========================================================================
   Skycore System: Shopping Mall Page

   Goals:
   - Mobile-first, fast, single delegated click handler
   - Responsive layout similar to Room/City pages
   - Links to implemented shops.
     Everything else shows a simple "Not implemented" modal.

   Usage in Twee:
     :: Shopping Mall
     <<shoppingMall>>
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // ----------------------------- Data ------------------------------------

  const SHOPPING_MALL_SECTIONS = [
    {
      id: "shops",
      title: "SHOPS",
      items: [
        { label: "TEST SHOP", kind: "todo" }
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
          `class="shopping-mall-link"`,
          `type="button"`,
          `data-shopping-mall-kind="${it.kind}"`,
          `data-shopping-mall-label="${encodeURIComponent(it.label)}"`
        ];
        if (it.kind === "passage") {
          attrs.push(`data-shopping-mall-passage="${encodeURIComponent(it.passage)}"`);
        }
        return `<button ${attrs.join(" ")}>${it.label}</button>`;
      })
      .join("\n");

    return `
      <section class="shopping-mall-section shopping-mall-section--${section.id}" aria-label="${section.title}">
        <h3 class="shopping-mall-section-title">${section.title}</h3>
        <div class="shopping-mall-section-links">
          ${items}
        </div>
      </section>
    `;
  }

  function shoppingMallHTML() {
    return `
      <div class="shopping-mall-page" data-shopping-mall-root="1">
        <header class="shopping-mall-header">
          <h2 class="shopping-mall-title">SHOPPING MALL</h2>
          <div class="shopping-mall-title-rule" aria-hidden="true"></div>
        </header>

        <div class="shopping-mall-grid" aria-label="Shopping Mall navigation">
          ${SHOPPING_MALL_SECTIONS.map(sectionHTML).join("\n")}
        </div>
      </div>
    `;
  }

  // ---------------------------- Macro ------------------------------------

  Macro.add("shoppingMall", {
    handler() {
      const wrap = document.createElement("div");
      wrap.innerHTML = shoppingMallHTML();

      // Single delegated handler for performance.
      const root = wrap.querySelector("[data-shopping-mall-root]");
      if (root) {
        root.addEventListener(
          "click",
          (ev) => {
            const btn = ev.target && ev.target.closest && ev.target.closest(".shopping-mall-link");
            if (!btn || !root.contains(btn)) return;

            const kind = btn.getAttribute("data-shopping-mall-kind");
            const label = decodeURIComponent(btn.getAttribute("data-shopping-mall-label") || "");

            if (kind === "passage") {
              const passage = decodeURIComponent(btn.getAttribute("data-shopping-mall-passage") || "");
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

  Skycore.Systems.ShoppingMall = {
    sections: SHOPPING_MALL_SECTIONS
  };
})();
