/* =========================================================================
   Inventory System: Tab Management
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  function normalizeTab(tab) {
    return (tab === "inventory" || tab === "itemsets") ? tab : "inventory";
  }

  function setActiveTab(root, tab) {
    const t = normalizeTab(tab);

    // ✅ IMPORTANT: drives the CSS rules that show/hide panels
    root.setAttribute("data-tab", t);

    const btns = root.querySelectorAll("[data-tab-btn]");
    btns.forEach(b => {
      const isActive = (b.dataset.tabBtn === t);
      b.setAttribute("aria-selected", String(isActive));
      b.classList.toggle("is-active", isActive); // matches .inv-tab.is-active styling
    });

    const panels = root.querySelectorAll("[data-tab-panel]");
    panels.forEach(p => {
      if (p.dataset.tabPanel === t) p.removeAttribute("hidden");
      else p.setAttribute("hidden", "hidden");
    });
  }

  Skycore.Systems.InventoryTabs = {
    normalizeTab,
    setActiveTab
  };
})();
