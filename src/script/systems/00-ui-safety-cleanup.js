/* =========================================================================
   UI Safety Cleanup (mobile)
   - Prevent stuck touch/scroll locks after navigation
   - Only runs if actually locked (conditional cleanup)
========================================================================= */
(function () {
  "use strict";

  function isLocked() {
    const body = document.body;
    const html = document.documentElement;
    return (
      body.classList.contains("inv-dragging") ||
      body.classList.contains("modal-open") ||
      html.classList.contains("modal-open") ||
      body.style.position === "fixed"
    );
  }

  function hardUnlockUI() {
    if (!isLocked()) return;

    try { window.Skycore?.Systems?.InventoryDrag?.cancelGlobalDrag?.(); } catch (e) {}
    try { window.Skycore?.Systems?.InventoryModals?.forceCloseAll?.(); } catch (e) {}

    const body = document.body;
    const html = document.documentElement;

    body.classList.remove("inv-dragging", "modal-open");
    html.classList.remove("modal-open");

    // Only clear the known lock styles
    body.style.position = "";
    body.style.top = "";
    body.style.overflow = "";
    body.style.touchAction = "";
  }

  $(document).on(":passagestart", hardUnlockUI);
  window.addEventListener("pageshow", (e) => { if (e.persisted) hardUnlockUI(); });
})();
