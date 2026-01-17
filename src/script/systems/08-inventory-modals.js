/* =========================================================================
   Inventory System: Modals
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { getItem, getAreaArray, getCat, getEquipSlot, isWearableClothes, findEquippedIndexBySlot, firstEmptyIndex, capitalize } = Skycore.Systems.InventoryHelpers;
  const { updateSlotEl, rerenderWardrobeGrid } = Skycore.Systems.InventoryDOM;
  const { placeInWardrobe, compactWardrobe } = Skycore.Systems.InventoryWardrobe;
  const { applyUseEffects, buildAfterUseMessage, fmtEffectLine, fmtBonusLine } = Skycore.Systems.InventoryEffects;

  // ---- ModalManager: Centralized modal handling ---------------------------
  const ModalManager = (function () {
    let currentModal = null;
    let previousFocus = null;
    let scrollY = 0;
    let escapeHandler = null;

    // Get all focusable elements within a modal
    function getFocusableElements(container) {
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(container.querySelectorAll(selector)).filter(el => {
        if (!el || el.disabled) return false;
        // Visible check that works better for fixed/overlay UIs
        return el.getClientRects && el.getClientRects().length > 0;
      });
    }

    // Trap focus inside modal
    function trapFocus(ev) {
      if (!currentModal) return;

      const focusableElements = getFocusableElements(currentModal);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (ev.key === 'Tab') {
        if (ev.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            ev.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            ev.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    // Lock body scroll (iOS Safari compatible)
    function lockBodyScroll() {
      scrollY = window.scrollY || window.pageYOffset;
      const body = document.body;
      const html = document.documentElement;

      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
      body.style.overscrollBehavior = 'none'; // Prevent bounce scroll on iOS

      html.style.overflow = 'hidden'; // Also lock html element
      html.style.touchAction = 'none'; // Prevent touch gestures on html

      body.classList.add('modal-open');
      html.classList.add('modal-open');
    }

    // Unlock body scroll
    function unlockBodyScroll() {
      const body = document.body;
      const html = document.documentElement;

      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      body.style.touchAction = '';
      body.style.overscrollBehavior = '';

      html.style.overflow = '';
      html.style.touchAction = '';

      body.classList.remove('modal-open');
      html.classList.remove('modal-open');

      window.scrollTo(0, scrollY);
    }

    // Centralized Escape handler
    function handleEscape(ev) {
      if (ev.key === 'Escape' && currentModal && currentModal.classList.contains('is-open')) {
        // Find the close function for this modal
        const closeBtn = currentModal.querySelector('.inv-modal-close');
        if (closeBtn) {
          closeBtn.click();
        }
      }
    }

    function open(overlay, initialFocusElement) {
      // Close any existing modal first (but don't restore focus; we're opening a new one)
      if (currentModal) {
        close({ restoreFocus: false });
      }

      currentModal = overlay;

      // Save currently focused element (may be body, may be null-ish)
      previousFocus = document.activeElement || null;

      // Lock scroll
      lockBodyScroll();

      // Set up focus trap
      overlay.addEventListener('keydown', trapFocus);

      // Set up centralized Escape handler (only once)
      if (!escapeHandler) {
        escapeHandler = handleEscape;
        document.addEventListener('keydown', escapeHandler);
      }

      // Show modal
      overlay.classList.add('is-open');

      // Focus initial element (or first focusable)
      const target =
        initialFocusElement ||
        (getFocusableElements(overlay)[0] || null);

      if (target && typeof target.focus === "function") {
        requestAnimationFrame(() => {
          // target is a stable reference; not affected by later variable resets
          target.focus({ preventScroll: true });
        });
      }
    }

    function close(opts) {
      if (!currentModal) return;

      const restoreFocus = !(opts && opts.restoreFocus === false);

      const modal = currentModal;
      currentModal = null;

      // Capture previousFocus NOW so rAF doesn't see it as null later
      const prev = previousFocus;
      previousFocus = null;

      // Remove focus trap
      modal.removeEventListener('keydown', trapFocus);

      // Hide modal
      modal.classList.remove('is-open');

      // Unlock scroll
      unlockBodyScroll();

      // Restore focus safely
      if (
        restoreFocus &&
        prev &&
        typeof prev.focus === "function" &&
        document.contains(prev)
      ) {
        requestAnimationFrame(() => {
          prev.focus({ preventScroll: true });
        });
      }

      // Remove escape handler if no modals remain (prevent memory leak)
      if (currentModal === null && escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
      }
    }

    return { open, close };
  })();

  // ---- Alert Modal (close only) ------------------------------------------
  const AlertModal = (function () {
    let overlay = null, titleEl = null, msgEl = null;

    function ensure() {
      if (overlay) return;

      overlay = document.createElement("div");
      overlay.className = "inv-modal-overlay";
      overlay.innerHTML = `
        <div class="inv-alert-modal" role="dialog" aria-modal="true" aria-label="Message">
          <div class="inv-modal-header">
            <h3 class="inv-modal-title"></h3>
            <button type="button" class="inv-modal-close" aria-label="Close">✕</button>
          </div>
          <div class="inv-modal-divider"></div>

          <div class="inv-alert-body">
            <div class="inv-alert-msg"></div>
          </div>

          <div class="inv-modal-divider"></div>

          <div class="inv-alert-footer">
            <button type="button" class="inv-btn inv-neutral inv-alert-close">CLOSE</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      titleEl = overlay.querySelector(".inv-modal-title");
      msgEl = overlay.querySelector(".inv-alert-msg");

      const close = () => {
        ModalManager.close();
      };

      overlay.querySelector(".inv-modal-close").addEventListener("click", close);
      overlay.querySelector(".inv-alert-close").addEventListener("click", close);
      overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });
    }

    function open({ title, message }) {
      ensure();
      titleEl.textContent = title || "Notice";
      msgEl.textContent = message || "";
      const closeBtn = overlay.querySelector(".inv-modal-close");
      ModalManager.open(overlay, closeBtn);
    }

    return { open };
  })();

  // ---- Confirm Modal (ACTION top, CLOSE bottom) ---------------------------
  const ConfirmModal = (function () {
    let overlay = null, titleEl = null, msgEl = null, btnClose = null, btnAction = null;
    let onClose = null, onAction = null;

    function ensure() {
      if (overlay) return;

      overlay = document.createElement("div");
      overlay.className = "inv-modal-overlay";
      overlay.innerHTML = `
        <div class="inv-confirm-modal" role="dialog" aria-modal="true" aria-label="Confirmation">
          <div class="inv-modal-header">
            <h3 class="inv-modal-title"></h3>
            <button type="button" class="inv-modal-close" aria-label="Close">✕</button>
          </div>
          <div class="inv-modal-divider"></div>

          <div class="inv-confirm-body">
            <div class="inv-confirm-msg"></div>
          </div>

          <div class="inv-modal-divider"></div>

          <div class="inv-confirm-footer">
            <button type="button" class="inv-btn inv-wardrobe inv-confirm-action"></button>
            <button type="button" class="inv-btn inv-neutral inv-confirm-close"></button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      titleEl = overlay.querySelector(".inv-modal-title");
      msgEl = overlay.querySelector(".inv-confirm-msg");
      btnAction = overlay.querySelector(".inv-confirm-action");
      btnClose = overlay.querySelector(".inv-confirm-close");

      const close = () => {
        ModalManager.close();
        onClose = null;
        onAction = null;
      };

      overlay.querySelector(".inv-modal-close").addEventListener("click", close);
      overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });

      btnClose.addEventListener("click", () => { const fn = onClose; close(); if (typeof fn === "function") fn(); });
      btnAction.addEventListener("click", () => { const fn = onAction; close(); if (typeof fn === "function") fn(); });
    }

    function open({ title, message, closeText, actionText, closeAction, actionAction }) {
      ensure();
      titleEl.textContent = title || "Confirm";
      msgEl.textContent = message || "";
      btnClose.textContent = closeText || "CLOSE";
      btnAction.textContent = actionText || "OK";
      onClose = closeAction || null;
      onAction = actionAction || null;

      const closeBtn = overlay.querySelector(".inv-modal-close");
      ModalManager.open(overlay, closeBtn);
    }

    return { open };
  })();

  // ---- Item Details Modal -------------------------------------------------
  const ItemModal = (function () {
    let overlay = null, titleEl = null, descEl = null, reqEl = null;
    let typeEl = null, categoryEl = null, slotEl = null, bonusesEl = null, effectsEl = null;
    let pTagsEl = null, intentEl = null, modestyEl = null, sfxEl = null;
    let primaryBtn = null, wardBtn = null, closeBtn = null;
    let scrollEl = null;
    let ctx = null;

    function ensure() {
      if (overlay) return;

      overlay = document.createElement("div");
      overlay.className = "inv-modal-overlay";
      overlay.innerHTML = `
        <div class="inv-modal" role="dialog" aria-modal="true" aria-label="Item details">
          <div class="inv-modal-header">
            <h3 class="inv-modal-title"></h3>
            <button type="button" class="inv-modal-close" aria-label="Close">✕</button>
          </div>
          <div class="inv-modal-divider"></div>

          <div class="inv-modal-body">
            <div class="inv-modal-scroll">
              <div class="inv-modal-desc"></div>
              <div class="inv-modal-subtitle">Type</div>
              <div class="inv-modal-info" data-info="type"></div>
              <div class="inv-modal-subtitle">Category</div>
              <div class="inv-modal-info" data-info="category"></div>
              <div class="inv-modal-subtitle">Slot</div>
              <div class="inv-modal-info" data-info="slot"></div>
              <div class="inv-modal-subtitle">Requirements</div>
              <ul class="inv-req-list"></ul>
              <div class="inv-modal-subtitle">Bonuses</div>
              <ul class="inv-bonus-list"></ul>
              <div class="inv-modal-subtitle">Effects</div>
              <ul class="inv-effect-list"></ul>
              <div class="inv-modal-subtitle">Perception Tags</div>
              <div class="inv-modal-info" data-info="ptags"></div>
              <div class="inv-modal-subtitle">Social Intent</div>
              <div class="inv-modal-info" data-info="intent"></div>
              <div class="inv-modal-subtitle">Modesty</div>
              <div class="inv-modal-info" data-info="modesty"></div>
              <div class="inv-modal-subtitle">Sound Effect</div>
              <div class="inv-modal-info" data-info="sfx"></div>
            </div>
          </div>

          <div class="inv-modal-divider"></div>

          <div class="inv-modal-footer">
            <button type="button" class="inv-btn inv-wear inv-primary-action"></button>
            <button type="button" class="inv-btn inv-wardrobe inv-wardrobe-action">SEND TO WARDROBE</button>
            <button type="button" class="inv-btn inv-neutral inv-close-action">CLOSE</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      titleEl = overlay.querySelector(".inv-modal-title");
      descEl = overlay.querySelector(".inv-modal-desc");
      typeEl = overlay.querySelector('[data-info="type"]');
      categoryEl = overlay.querySelector('[data-info="category"]');
      slotEl = overlay.querySelector('[data-info="slot"]');
      pTagsEl = overlay.querySelector('[data-info="ptags"]');
      intentEl = overlay.querySelector('[data-info="intent"]');
      modestyEl = overlay.querySelector('[data-info="modesty"]');
      sfxEl = overlay.querySelector('[data-info="sfx"]');
      reqEl = overlay.querySelector(".inv-req-list");
      bonusesEl = overlay.querySelector(".inv-bonus-list");
      effectsEl = overlay.querySelector(".inv-effect-list");
      scrollEl = overlay.querySelector(".inv-modal-scroll");
      primaryBtn = overlay.querySelector(".inv-primary-action");
      wardBtn = overlay.querySelector(".inv-wardrobe-action");
      closeBtn = overlay.querySelector(".inv-close-action");

      const close = () => {
        ModalManager.close();
        ctx = null;
        // Reset scroll position when closing
        if (scrollEl) {
          scrollEl.scrollTop = 0;
        }
      };

      overlay.querySelector(".inv-modal-close").addEventListener("click", close);
      closeBtn.addEventListener("click", close);

      overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });

      primaryBtn.addEventListener("click", () => {
        if (!ctx) return;

        const snap = ctx;
        const item = getItem(snap.itemId);
        if (!item) return;

        const cat = getCat(item);

        if (cat === "usable") {
          const res = doUse(snap);
          close();

          if (!res.ok) {
            AlertModal.open({ title: "Can't use", message: res.message || "That item can't be used right now." });
            return;
          }

          AlertModal.open({ title: item.name, message: buildAfterUseMessage(item) });
          return;
        }

        if (cat === "clothes") {
          const res = doWearRemove(snap);
          close();

          if (res.ok) return;

          if (res.reason === "notWearable") {
            AlertModal.open({ title: "Can't wear", message: "This item isn't wearable equipment." });
            return;
          }

          if (res.reason === "sameItem") {
            AlertModal.open({ title: "Already wearing it", message: "You're currently wearing the same item already." });
            return;
          }

          if (res.reason === "slotOccupied") {
            const newItem = getItem(res.newItemId);
            const oldItem = getItem(res.oldItemId);

            ConfirmModal.open({
              title: "Body slot occupied",
              message:
                `You're already wearing "${oldItem ? oldItem.name : res.oldItemId}" in slot "${res.slotKey}".\n\n` +
                `Replace it with "${newItem ? newItem.name : res.newItemId}"?`,
              actionText: "REPLACE",
              closeText: "CLOSE",
              closeAction: () => {},
              actionAction: () => {
                const eq = State.variables.invSys.eq;
                const fromArr = getAreaArray(res.fromArea);

                // If the user had the same item id, we would have returned "sameItem".
                eq[res.eqIndex] = res.newItemId;
                fromArr[res.fromIndex] = res.oldItemId;

                updateSlotEl(res.root, "eq", res.eqIndex);
                updateSlotEl(res.root, res.fromArea, res.fromIndex);
              }
            });
            return;
          }

          if (res.reason === "eqFull") {
            AlertModal.open({
              title: "Equipment is full",
              message: "You can't wear more items right now.\n\nUnequip something first (or use UNEQUIP ALL)."
            });
            return;
          }

          if (res.reason === "invFull") {
            ConfirmModal.open({
              title: "Inventory is full",
              message:
                "You don't have space to unequip this item.\n\n" +
                "Make some space in your inventory, or send it to wardrobe instead.",
              actionText: "SEND TO WARDROBE INSTEAD",
              closeText: "CLOSE",
              closeAction: () => {},
              actionAction: () => {
                const eq = State.variables.invSys.eq;
                const itemId = eq[res.eqIndex];
                if (!itemId) return;
                eq[res.eqIndex] = null;

                const wIndex = placeInWardrobe(itemId);
                updateSlotEl(res.root, "eq", res.eqIndex);
                rerenderWardrobeGrid(res.root);
                if (wIndex !== -1) updateSlotEl(res.root, "wardrobe", wIndex);
              }
            });
            return;
          }

          AlertModal.open({ title: "Can't do that", message: "That action isn't possible right now." });
          return;
        }

        // misc has no primary action
        AlertModal.open({ title: "No action", message: "This item can't be worn or used." });
      });

      wardBtn.addEventListener("click", () => {
        if (!ctx) return;
        const snap = ctx;
        if (snap.area === "wardrobe") {
          doSendToInventory(snap);
        } else {
          doSendToWardrobe(snap);
        }
        close();
      });
    }

    function open(nextCtx) {
      ensure();
      ctx = nextCtx;

      const item = getItem(ctx.itemId);
      if (!item) return;

      titleEl.textContent = item.name;
      descEl.textContent = item.desc || "(No description.)";

      // Type (support both new structure (subtype) and legacy (type))
      const itemSubtype = item.subtype || item.type;
      typeEl.textContent = itemSubtype ? capitalize(itemSubtype) : "—";

      // Category
      categoryEl.textContent = item.cat ? capitalize(item.cat) : "—";

      // Slot - format camelCase slot names for display (e.g., "overHead" -> "Over Head")
      let slotDisplay = "—";
      if (item.slot) {
        // Convert camelCase to "Title Case" (e.g., "overHead" -> "Over Head", "underUpper" -> "Under Upper")
        slotDisplay = item.slot.replace(/([a-z])([A-Z])/g, '$1 $2');
        // Capitalize first letter of each word
        slotDisplay = slotDisplay.split(' ').map(word => capitalize(word)).join(' ');
      }
      slotEl.textContent = slotDisplay;

      // Requirements
      reqEl.innerHTML = "";
      const stats = State.variables.stats || {};
      const reqs = Array.isArray(item.reqs) ? item.reqs : [];

      if (!reqs.length) {
        const li = document.createElement("li");
        li.textContent = "None";
        reqEl.appendChild(li);
      } else {
        reqs.forEach(r => {
          const cur = Number(stats[r.stat] ?? 0);
          const li = document.createElement("li");
          li.textContent = `${capitalize(r.stat)}: ${r.min} (Current: ${cur})`;
          reqEl.appendChild(li);
        });
      }

      // Bonuses
      bonusesEl.innerHTML = "";
      const bonuses = Array.isArray(item.bonuses) ? item.bonuses : [];
      if (!bonuses.length) {
        const li = document.createElement("li");
        li.textContent = "None";
        bonusesEl.appendChild(li);
      } else {
        bonuses.forEach(b => {
          const line = fmtBonusLine(b);
          if (line) {
            const li = document.createElement("li");
            li.textContent = line;
            bonusesEl.appendChild(li);
          }
        });
      }

      // Effects
      effectsEl.innerHTML = "";
      const effects = Array.isArray(item.effects) ? item.effects : [];
      if (!effects.length) {
        const li = document.createElement("li");
        li.textContent = "None";
        effectsEl.appendChild(li);
      } else {
        effects.forEach(e => {
          const line = fmtEffectLine(e);
          if (line) {
            const li = document.createElement("li");
            li.textContent = line;
            effectsEl.appendChild(li);
          }
        });
      }

      // Perception Tags (support both new structure and legacy)
      const tags = Array.isArray(item.tags) ? item.tags : (Array.isArray(item.p_tags) ? item.p_tags : []);
      pTagsEl.textContent = tags.length ? tags.map(t => capitalize(t)).join(", ") : "—";

      // Social Intent (support both new structure and legacy)
      const presentation = item.presentation || item.soc;
      const intent = presentation?.intent ? capitalize(presentation.intent) : "—";
      intentEl.textContent = intent;

      // Modesty (support both new structure and legacy)
      const modesty = presentation?.modesty !== undefined ? String(presentation.modesty) : "—";
      modestyEl.textContent = modesty;

      // Sound Effect
      sfxEl.textContent = item.sfx ? capitalize(item.sfx) : "—";

      const cat = getCat(item);

      // Reset
      primaryBtn.style.display = "";
      wardBtn.style.display = "";
      primaryBtn.classList.remove("inv-remove");
      primaryBtn.classList.add("inv-wear");

      const isWardrobe = (ctx.area === "wardrobe");
      wardBtn.textContent = isWardrobe ? "SEND TO INVENTORY" : "SEND TO WARDROBE";

      if (cat === "clothes") {
        const isEquipped = (ctx.area === "eq");
        primaryBtn.textContent = isEquipped ? "REMOVE" : "WEAR";
        primaryBtn.classList.toggle("inv-remove", isEquipped);
        wardBtn.style.display = "";
      } else if (cat === "usable") {
        primaryBtn.textContent = "USE";
        primaryBtn.classList.remove("inv-remove");
        wardBtn.style.display = ""; // usable: Use + Wardrobe/Inventory + Close
      } else {
        // misc: wardrobe/inventory + close only
        primaryBtn.style.display = "none";
        wardBtn.style.display = "";
      }

      // Reset scroll position to top BEFORE opening
      if (scrollEl) {
        scrollEl.scrollTop = 0;
      }

      // Ensure scroll reset before opening
      if (scrollEl) {
        scrollEl.scrollTop = 0;
      }

      const closeBtn = overlay.querySelector(".inv-modal-close");
      ModalManager.open(overlay, closeBtn);
      
      // Ensure scroll reset after modal becomes visible (double-check)
      requestAnimationFrame(() => {
        if (scrollEl && overlay.classList.contains("is-open")) {
          scrollEl.scrollTop = 0;
        }
      });
    }

    function doWearRemove(c) {
      const eq = State.variables.invSys.eq;
      const inv = State.variables.invSys.inv;

      // Wear from inv or wardrobe
      if (c.area === "inv" || c.area === "wardrobe") {
        const fromArr = getAreaArray(c.area);
        const itemId = fromArr[c.index];
        if (!itemId) return { ok: false, reason: "unknown" };
        if (!isWearableClothes(itemId)) return { ok: false, reason: "notWearable" };

        const slotKey = getEquipSlot(itemId);
        const conflictIndex = findEquippedIndexBySlot(eq, slotKey, -1);

        if (conflictIndex !== -1) {
          const oldId = eq[conflictIndex];
          if (oldId === itemId) {
            return { ok: false, reason: "sameItem" };
          }
          return {
            ok: false,
            reason: "slotOccupied",
            root: c.root,
            fromArea: c.area,
            fromIndex: c.index,
            eqIndex: conflictIndex,
            slotKey,
            newItemId: itemId,
            oldItemId: oldId
          };
        }

        const targetIndex = firstEmptyIndex(eq);
        if (targetIndex === -1) return { ok: false, reason: "eqFull" };

        fromArr[c.index] = null;
        eq[targetIndex] = itemId;

        if (c.area === "wardrobe") {
          compactWardrobe();
          rerenderWardrobeGrid(c.root);
        } else {
          updateSlotEl(c.root, c.area, c.index);
        }
        updateSlotEl(c.root, "eq", targetIndex);

        return { ok: true };
      }

      // Remove from equipped -> inventory
      const itemId = eq[c.index];
      if (!itemId) return { ok: false, reason: "unknown" };

      const targetIndex = firstEmptyIndex(inv);
      if (targetIndex === -1) return { ok: false, reason: "invFull", root: c.root, eqIndex: c.index };

      eq[c.index] = null;
      inv[targetIndex] = itemId;

      updateSlotEl(c.root, "eq", c.index);
      updateSlotEl(c.root, "inv", targetIndex);

      return { ok: true };
    }

    function doUse(c) {
      if (c.area !== "inv" && c.area !== "wardrobe") return { ok: false, message: "Use it from your Inventory or Wardrobe." };

      const arr = getAreaArray(c.area);
      const itemId = arr[c.index];
      const item = getItem(itemId);

      if (!itemId || !item) return { ok: false, message: "That item is missing." };
      if (getCat(item) !== "usable") return { ok: false, message: "That item isn't usable." };

      // Consume
      arr[c.index] = null;
      if (c.area === "wardrobe") {
        compactWardrobe();
        rerenderWardrobeGrid(c.root);
      } else {
        updateSlotEl(c.root, c.area, c.index);
      }

      applyUseEffects(item);
      return { ok: true };
    }

    function doSendToWardrobe(c) {
      // If already in wardrobe, nothing to do.
      if (c.area === "wardrobe") return;

      const arr = getAreaArray(c.area);
      const itemId = arr[c.index];
      if (!itemId) return;

      arr[c.index] = null;
      updateSlotEl(c.root, c.area, c.index);

      placeInWardrobe(itemId);
      rerenderWardrobeGrid(c.root);
    }

    function doSendToInventory(c) {
      // If not in wardrobe, nothing to do.
      if (c.area !== "wardrobe") return;

      const wardrobe = State.variables.invSys.wardrobe;
      const inv = State.variables.invSys.inv;
      const itemId = wardrobe[c.index];
      if (!itemId) return;

      const emptyIdx = firstEmptyIndex(inv);
      if (emptyIdx === -1) {
        AlertModal.open({
          title: "Inventory is full",
          message: "You don't have space in your inventory."
        });
        return;
      }

      wardrobe[c.index] = null;
      inv[emptyIdx] = itemId;

      compactWardrobe();
      updateSlotEl(c.root, "inv", emptyIdx);
      rerenderWardrobeGrid(c.root);
    }

    return { open };
  })();

  // ---- Filter Modal ---------------------------------------------------------
  const FilterModal = (function () {
    let overlay = null;
    let categoryList = null, typeList = null, slotList = null;
    let removeFilterBtn = null;
    let onFilterChange = null;

    function ensure() {
      if (overlay) return;

      overlay = document.createElement("div");
      overlay.className = "inv-modal-overlay";
      overlay.innerHTML = `
        <div class="inv-modal" role="dialog" aria-modal="true" aria-label="Filter">
          <div class="inv-modal-header">
            <h3 class="inv-modal-title">Filter</h3>
            <button type="button" class="inv-modal-close" aria-label="Close">✕</button>
          </div>
          <div class="inv-modal-divider"></div>

          <div class="inv-modal-body">
            <div class="inv-modal-scroll">
              <div class="inv-filter-columns">
                <div class="inv-filter-column">
                  <div class="inv-filter-header">Category</div>
                  <div class="inv-filter-list" data-filter-type="category"></div>
                </div>
                <div class="inv-filter-column">
                  <div class="inv-filter-header">Type</div>
                  <div class="inv-filter-list" data-filter-type="type"></div>
                </div>
                <div class="inv-filter-column">
                  <div class="inv-filter-header">Slot</div>
                  <div class="inv-filter-list" data-filter-type="slot"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="inv-modal-divider"></div>

          <div class="inv-modal-footer">
            <button type="button" class="inv-btn inv-neutral inv-filter-remove" style="display: none;">REMOVE FILTER</button>
            <button type="button" class="inv-btn inv-neutral inv-filter-close">CLOSE</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      categoryList = overlay.querySelector('[data-filter-type="category"]');
      typeList = overlay.querySelector('[data-filter-type="type"]');
      slotList = overlay.querySelector('[data-filter-type="slot"]');
      removeFilterBtn = overlay.querySelector(".inv-filter-remove");

      const close = () => {
        ModalManager.close();
      };

      overlay.querySelector(".inv-modal-close").addEventListener("click", close);
      overlay.querySelector(".inv-filter-close").addEventListener("click", close);
      removeFilterBtn.addEventListener("click", () => {
        if (typeof onFilterChange === "function") {
          onFilterChange({ category: [], type: [], slot: [] });
        }
        close();
      });

      overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });
    }

    function buildFilterOptions() {
      const db = Skycore.Systems.InventoryHelpers.itemDB();
      const categories = new Set();
      const types = new Set();
      const slots = new Set();

      Object.values(db).forEach(item => {
        // Support both new structure and legacy
        const category = item.category || item.cat;
        const subtype = item.subtype || item.type;
        if (category) categories.add(category);
        if (subtype) types.add(subtype);
        if (item.slot) slots.add(item.slot);
      });

      return {
        categories: Array.from(categories).sort(),
        types: Array.from(types).sort(),
        slots: Array.from(slots).sort()
      };
    }

    function createFilterItem(value, type, currentFilters, listElement, getCurrentFilters) {
      const isSelected = Array.isArray(currentFilters) && currentFilters.includes(value);
      const label = document.createElement("label");
      label.className = "inv-filter-item";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isSelected;
      checkbox.dataset.filterValue = value;
      checkbox.dataset.filterType = type;
      
      const span = document.createElement("span");
      span.textContent = Skycore.Systems.InventoryHelpers.capitalize(value);
      
      label.appendChild(checkbox);
      label.appendChild(span);
      
      checkbox.addEventListener("change", () => {
        // Get current state from all checkboxes in this list
        const selectedValues = [];
        listElement.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (cb.checked) {
            selectedValues.push(cb.dataset.filterValue);
          }
        });
        
        // Get all current filters and update this type
        const allFilters = getCurrentFilters();
        const newFilters = { ...allFilters, [type]: selectedValues };
        
        if (typeof onFilterChange === "function") {
          onFilterChange(newFilters);
        }
        updateFilterUI(newFilters);
      });
      
      return label;
    }

    function open(currentFilters, onChange) {
      ensure();
      onFilterChange = onChange;

      const options = buildFilterOptions();
      let filters = currentFilters || { category: [], type: [], slot: [] };
      
      // Ensure arrays
      if (!Array.isArray(filters.category)) filters.category = filters.category ? [filters.category] : [];
      if (!Array.isArray(filters.type)) filters.type = filters.type ? [filters.type] : [];
      if (!Array.isArray(filters.slot)) filters.slot = filters.slot ? [filters.slot] : [];

      // Function to get current filter state from checkboxes
      const getCurrentFilters = () => {
        const current = {
          category: [],
          type: [],
          slot: []
        };
        
        categoryList.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
          current.category.push(cb.dataset.filterValue);
        });
        
        typeList.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
          current.type.push(cb.dataset.filterValue);
        });
        
        slotList.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
          current.slot.push(cb.dataset.filterValue);
        });
        
        return current;
      };

      // Clear existing lists
      categoryList.innerHTML = "";
      typeList.innerHTML = "";
      slotList.innerHTML = "";

      // Build category list
      options.categories.forEach(cat => {
        const item = createFilterItem(cat, "category", filters.category, categoryList, getCurrentFilters);
        categoryList.appendChild(item);
      });

      // Build type list
      options.types.forEach(typ => {
        const item = createFilterItem(typ, "type", filters.type, typeList, getCurrentFilters);
        typeList.appendChild(item);
      });

      // Build slot list
      options.slots.forEach(slot => {
        const item = createFilterItem(slot, "slot", filters.slot, slotList, getCurrentFilters);
        slotList.appendChild(item);
      });

      updateFilterUI(filters);
      const closeBtn = overlay.querySelector(".inv-modal-close");
      ModalManager.open(overlay, closeBtn);
    }

    function updateFilterUI(filters) {
      const hasFilter = (Array.isArray(filters.category) && filters.category.length > 0) ||
                       (Array.isArray(filters.type) && filters.type.length > 0) ||
                       (Array.isArray(filters.slot) && filters.slot.length > 0);
      removeFilterBtn.style.display = hasFilter ? "" : "none";

      // Update checkbox states
      [categoryList, typeList, slotList].forEach((list, idx) => {
        const type = idx === 0 ? "category" : idx === 1 ? "type" : "slot";
        const filterArray = Array.isArray(filters[type]) ? filters[type] : [];
        list.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
          checkbox.checked = filterArray.includes(checkbox.dataset.filterValue);
        });
      });
    }

    return { open };
  })();

  // ---- Create Set Modal ---------------------------------------------------
  const CreateSetModal = (function () {
    let overlay = null, titleEl = null, equippedListEl = null, inputEl = null;
    let btnCreate = null, btnClose = null;
    let onCreate = null;
    let equippedItems = [];

    function renderItemsList() {
      equippedListEl.innerHTML = "";
      
      if (!equippedItems || equippedItems.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "inv-set-empty-msg";
        emptyMsg.textContent = "No items currently equipped.";
        equippedListEl.appendChild(emptyMsg);
        btnCreate.disabled = true;
      } else {
        equippedItems.forEach((itemId, index) => {
          const item = getItem(itemId);
          if (!item) return;
          
          const itemEl = document.createElement("div");
          itemEl.className = "inv-set-item-entry";
          itemEl.dataset.itemIndex = index;
          itemEl.innerHTML = `
            <span class="inv-set-item-icon">${item.icon}</span>
            <span class="inv-set-item-name">${item.name}</span>
            <button type="button" class="inv-set-item-remove" aria-label="Remove item" data-item-index="${index}">✕</button>
          `;
          equippedListEl.appendChild(itemEl);
        });
        btnCreate.disabled = false;
      }
    }

    function ensure() {
      if (overlay) return;

      overlay = document.createElement("div");
      overlay.className = "inv-modal-overlay";
      overlay.innerHTML = `
        <div class="inv-modal" role="dialog" aria-modal="true" aria-label="Create Item Set">
          <div class="inv-modal-header">
            <h3 class="inv-modal-title">CREATE SET</h3>
            <button type="button" class="inv-modal-close" aria-label="Close">✕</button>
          </div>
          <div class="inv-modal-divider"></div>

          <div class="inv-modal-body">
            <div class="inv-modal-scroll">
              <div class="inv-set-equipped-list"></div>
              <div class="inv-set-name-section">
                <label for="inv-set-name-input" class="inv-set-name-label">Set Name:</label>
                <input type="text" id="inv-set-name-input" class="inv-set-name-input" placeholder="Enter set name..." maxlength="50" />
              </div>
            </div>
          </div>

          <div class="inv-modal-divider"></div>

          <div class="inv-modal-footer">
            <button type="button" class="inv-btn inv-wardrobe inv-set-create">CREATE</button>
            <button type="button" class="inv-btn inv-neutral inv-set-close">CLOSE</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      titleEl = overlay.querySelector(".inv-modal-title");
      equippedListEl = overlay.querySelector(".inv-set-equipped-list");
      inputEl = overlay.querySelector(".inv-set-name-input");
      btnCreate = overlay.querySelector(".inv-set-create");
      btnClose = overlay.querySelector(".inv-set-close");

      const close = () => {
        ModalManager.close();
        onCreate = null;
        inputEl.value = "";
        equippedItems = [];
        equippedListEl.innerHTML = "";
      };

      overlay.querySelector(".inv-modal-close").addEventListener("click", close);
      btnClose.addEventListener("click", close);

      overlay.addEventListener("click", (ev) => { 
        if (ev.target === overlay) close();
        // Handle remove button clicks
        const removeBtn = ev.target.closest(".inv-set-item-remove");
        if (removeBtn) {
          const index = parseInt(removeBtn.dataset.itemIndex, 10);
          if (!isNaN(index) && index >= 0 && index < equippedItems.length) {
            equippedItems.splice(index, 1);
            renderItemsList();
          }
        }
      });

      // Handle Enter key in input (separate from focus trap)
      inputEl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && overlay.classList.contains("is-open")) {
          ev.preventDefault();
          btnCreate.click();
        }
      });

      btnCreate.addEventListener("click", () => {
        const name = inputEl.value.trim();
        if (!name) {
          AlertModal.open({ title: "Name required", message: "Please enter a name for this set." });
          return;
        }
        if (equippedItems.length === 0) {
          AlertModal.open({ title: "No items", message: "You need to include at least one item to create a set." });
          return;
        }
        const fn = onCreate;
        const itemsCopy = [...equippedItems]; // Copy the array
        close();
        if (typeof fn === "function") fn(name, itemsCopy);
      });
    }

    function open(items, onCreateCallback) {
      ensure();
      onCreate = onCreateCallback;
      equippedItems = items ? [...items] : []; // Copy the array so we can modify it

      renderItemsList();

      inputEl.value = "";
      ModalManager.open(overlay, inputEl);
    }

    return { open };
  })();

  Skycore.Systems.InventoryModals = {
    AlertModal,
    ConfirmModal,
    ItemModal,
    FilterModal,
    CreateSetModal
  };
})();
