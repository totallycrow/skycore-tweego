/* =========================================================================
   Skycore System: Room Page (Hub)

   Goals:
   - Mobile-first, fast, single delegated click handler
   - Responsive layout:
       * Mobile: stacked sections
       * Medium: 2 columns (Personal | Go) + Actions below
       * Desktop: 3 columns (Personal | Actions | Go)
   - Only links to implemented pages (Inventory, Mirror).
     Everything else shows a simple "Not implemented" modal.

   Usage in Twee:
     :: Room
     <<room>>
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // ----------------------------- Data ------------------------------------

  const ROOM_SECTIONS = [
    {
      id: "personal",
      title: "PERSONAL",
      items: [
        { label: "INVENTORY", kind: "passage", passage: "Inventory" },
        { label: "MIRROR", kind: "passage", passage: "Mirror" }
      ]
    },
    {
      id: "actions",
      title: "ACTIONS",
      items: [
        { label: "STUDY", kind: "todo" },
        { label: "FAP TIME", kind: "todo" },
        { label: "USE LAPTOP", kind: "todo" },
        { label: "PLAY VIDEO GAMES", kind: "todo" },
        { label: "CLEAN YOUR ROOM", kind: "todo" }
      ]
    },
    {
      id: "go",
      title: "GO",
      items: [
        { label: "BATHROOM", kind: "todo" },
        { label: "KITCHEN", kind: "todo" },
        { label: "LIVING ROOM", kind: "todo" },
        { label: "LEAVE HOUSE", kind: "passage", passage: "City" }
      ]
    },
    {
      id: "other",
      title: "OTHER",
      items: [
        { label: "SETTINGS", kind: "passage", passage: "Settings" }
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
          `class="room-link"`,
          `type="button"`,
          `data-room-kind="${it.kind}"`,
          `data-room-label="${encodeURIComponent(it.label)}"`
        ];
        if (it.kind === "passage") {
          attrs.push(`data-room-passage="${encodeURIComponent(it.passage)}"`);
        }
        return `<button ${attrs.join(" ")}>${it.label}</button>`;
      })
      .join("\n");

    return `
      <section class="room-section room-section--${section.id}" aria-label="${section.title}">
        <h3 class="room-section-title">${section.title}</h3>
        <div class="room-section-links">
          ${items}
        </div>
      </section>
    `;
  }

  function roomHTML() {
    return `
      <div class="room-page" data-room-root="1">
        <header class="room-header">
          <h2 class="room-title">YOUR ROOM</h2>
          <div class="room-title-rule" aria-hidden="true"></div>
        </header>

        <figure class="room-image" aria-label="Room image">
          <img
            class="room-image-img"
            src="assets/rooms/bedroom-default.webp"
            alt="Bedroom"
            loading="lazy"
            decoding="async"
          />
        </figure>

        <div class="room-grid" aria-label="Room navigation">
          ${ROOM_SECTIONS.map(sectionHTML).join("\n")}
        </div>
      </div>
    `;
  }

  // ---------------------------- Macro ------------------------------------

  Macro.add("room", {
    handler() {
      const wrap = document.createElement("div");
      wrap.innerHTML = roomHTML();

      // Single delegated handler for performance.
      const root = wrap.querySelector("[data-room-root]");
      if (root) {
        root.addEventListener(
          "click",
          (ev) => {
            const btn = ev.target && ev.target.closest && ev.target.closest(".room-link");
            if (!btn || !root.contains(btn)) return;

            const kind = btn.getAttribute("data-room-kind");
            const label = decodeURIComponent(btn.getAttribute("data-room-label") || "");

            if (kind === "passage") {
              const passage = decodeURIComponent(btn.getAttribute("data-room-passage") || "");
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

  Skycore.Systems.Room = {
    sections: ROOM_SECTIONS
  };
})();
