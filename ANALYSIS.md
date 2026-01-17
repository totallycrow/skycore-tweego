# Codebase Analysis: Bugs, Code Clashes, Best Practices, Mobile-Friendliness, and Modularity

## Executive Summary

This analysis identifies critical issues, potential bugs, code organization problems, mobile UX concerns, and modularity improvements needed for a robust, scalable game system.

---

## 🔴 CRITICAL BUGS

### 1. **Memory Leak: Modal Escape Handler Never Removed**
**Location:** `src/script/systems/08-inventory-modals.js:124`

**Issue:** The escape handler is attached to `document` but never removed, causing memory leaks and potential duplicate handlers.

```javascript
// Line 124: Handler attached
document.addEventListener('keydown', escapeHandler);

// Problem: Never removed when modal closes
// Line 176: Escape handler stays attached (comment says "stays attached")
```

**Fix:** Remove handler when no modals are open:
```javascript
function close(opts) {
  // ... existing code ...
  
  // Remove escape handler if no modals remain
  if (currentModal === null && escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
}
```

### 2. **Race Condition: Filter Migration Runs Every ensureState Call**
**Location:** `src/script/systems/03-inventory-state.js:46-54`

**Issue:** Filter migration logic runs on every `ensureState()` call, even after migration is complete. This is inefficient and could cause issues.

**Fix:** Add a migration flag:
```javascript
if (!V.invSys._filterMigrated) {
  // Migrate old filter format
  if (V.invSys.filter && !Array.isArray(V.invSys.filter.category)) {
    const old = V.invSys.filter;
    V.invSys.filter = {
      category: old.category ? [old.category] : [],
      type: old.type ? [old.type] : [],
      slot: old.slot ? [old.slot] : []
    };
  }
  V.invSys._filterMigrated = true;
}
```

### 3. **Array Length Manipulation Risk**
**Location:** Multiple files (`03-inventory-state.js:72-73`, `09-inventory-actions.js:48,62`)

**Issue:** Direct `array.length = N` manipulation can cause issues if arrays are referenced elsewhere or if length is set incorrectly.

**Current code:**
```javascript
V.invSys.eq.length = EQ_SIZE;
V.invSys.inv.length = INV_SIZE;
```

**Better approach:** Use explicit resizing with null fills:
```javascript
function resizeArray(arr, targetSize, fillValue = null) {
  const current = arr.length;
  if (current < targetSize) {
    arr.push(...Array(targetSize - current).fill(fillValue));
  } else if (current > targetSize) {
    arr.length = targetSize;
  }
}
```

### 4. **Missing Input Validation in Drag System**
**Location:** `src/script/systems/11-inventory-drag.js:717-748`

**Issue:** `pointerdown` handler doesn't validate that `getAreaArray()` returns a valid array before accessing indices.

**Fix:** Add validation:
```javascript
root.addEventListener("pointerdown", (ev) => {
  const slot = ev.target.closest(".inv-slot");
  if (!slot) return;
  if (slot.hasAttribute("data-filter-hidden")) return;

  const area = slot.dataset.area;
  const index = Number(slot.dataset.index);
  const arr = getAreaArray(area);
  
  // ADD VALIDATION
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    console.warn(`Invalid slot access: area=${area}, index=${index}`);
    return;
  }
  
  const itemId = arr[index];
  // ... rest of code
});
```

---

## 🟡 CODE CLASHES & CONFLICTS

### 5. **Circular Dependency Risk: InventoryDOM ↔ InventoryRender**
**Location:** `src/script/systems/07-inventory-dom.js:12` and `06-inventory-render.js`

**Issue:** `InventoryDOM` imports from `InventoryRender`, but `InventoryRender` may need to call DOM update functions. This creates tight coupling.

**Recommendation:** Create a clear dependency hierarchy:
- **Config** → **Helpers** → **State** → **Wardrobe** → **Effects** → **Render** → **DOM** → **Modals** → **Actions** → **Tabs** → **Drag** → **Main**

**Current violation:** DOM imports Render, but Render should not import DOM.

### 6. **Multiple Systems Accessing State Without Validation**
**Location:** Throughout codebase

**Issue:** Many systems access `State.variables.invSys` without checking if it exists first, even though `ensureState()` should be called.

**Example:** `src/script/systems/11-inventory-drag.js:393`
```javascript
const eq = State.variables.invSys.eq; // No null check
```

**Fix:** Add defensive checks or ensure `ensureState()` is always called first:
```javascript
const invSys = State.variables.invSys;
if (!invSys || !Array.isArray(invSys.eq)) {
  console.error('Inventory state not initialized');
  return;
}
const eq = invSys.eq;
```

### 7. **Touch Action Conflicts**
**Location:** `src/style/components/inventory.css:99,482,615,772`

**Issue:** Multiple `touch-action` declarations on same elements can conflict:
- `.eq-charBox`: `touch-action: pan-y;`
- `.inv-grid`: `touch-action: pan-y;`
- `.inv-slot.is-filled`: `touch-action: none;`
- `.inv-ward-slot`: `touch-action: pan-y;`

**Problem:** When dragging starts, `body.inv-dragging` sets `touch-action: none`, but individual elements may override this.

**Fix:** Ensure consistent touch-action hierarchy:
```css
/* Base: allow vertical scroll */
.inv-grid { touch-action: pan-y; }

/* During drag: lock everything */
body.inv-dragging .inv-grid,
body.inv-dragging .inv-slot {
  touch-action: none !important;
}

/* Filled slots: no scroll (ready for drag) */
.inv-slot.is-filled {
  touch-action: none;
}
```

---

## 🟢 BEST PRACTICES VIOLATIONS

### 8. **Inconsistent Error Handling**
**Location:** Throughout codebase

**Issue:** Some functions silently fail, others throw errors, others return `{ok: false}`. No consistent pattern.

**Examples:**
- `doWearRemove()` returns `{ok: false, reason: "..."}`
- `doUse()` returns `{ok: false, message: "..."}`
- `getItem()` returns `null` on error
- Some functions throw errors

**Recommendation:** Standardize error handling:
```javascript
// Option 1: Result objects (current pattern, but make consistent)
function doAction() {
  try {
    // ... logic
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Option 2: Throw errors and catch at UI layer
function doAction() {
  if (!condition) throw new Error('Action failed: reason');
  return result;
}
```

### 9. **Magic Numbers Without Constants**
**Location:** Multiple files

**Issue:** Hard-coded values scattered throughout code:
- `min-height: 44px` (thumb-friendly size) - appears multiple times
- `z-index: 10000` (modals), `z-index: 9999` (ghost), `z-index: 2000` (sidebar)
- `threshold: 10px` (drag start)

**Fix:** Centralize in config:
```javascript
Skycore.Config.UI = {
  MIN_TOUCH_TARGET: 44, // px
  Z_INDEX: {
    MODAL: 10000,
    GHOST: 9999,
    SIDEBAR: 2000,
    BACK_BUTTON: 1000
  },
  DRAG_THRESHOLD: 10 // px
};
```

### 10. **Duplicate Code: Filter State Checks**
**Location:** Multiple files

**Issue:** Filter active check is duplicated in many places:
```javascript
// Pattern repeated 10+ times:
const hasFilter = filter && (
  (Array.isArray(filter.category) && filter.category.length > 0) ||
  (Array.isArray(filter.type) && filter.type.length > 0) ||
  (Array.isArray(filter.slot) && filter.slot.length > 0)
);
```

**Fix:** Create helper function:
```javascript
// In InventoryHelpers
function isFilterActive(filter) {
  if (!filter) return false;
  return (
    (Array.isArray(filter.category) && filter.category.length > 0) ||
    (Array.isArray(filter.type) && filter.type.length > 0) ||
    (Array.isArray(filter.slot) && filter.slot.length > 0)
  );
}
```

### 11. **Inconsistent Optional Chaining**
**Location:** Throughout codebase

**Issue:** Mix of `?.` optional chaining and explicit checks:
```javascript
// Sometimes:
Skycore.Systems.EyeBlink?.attachAll?.(wrap);

// Other times:
if (Skycore.Systems.EyeBlink && Skycore.Systems.EyeBlink.attachAll) {
  Skycore.Systems.EyeBlink.attachAll(wrap);
}
```

**Recommendation:** Use optional chaining consistently for cleaner code.

---

## 📱 MOBILE-FRIENDLINESS ISSUES

### 12. **Modal Scroll Lock May Not Work on All Mobile Browsers**
**Location:** `src/script/systems/08-inventory-modals.js:60-91`

**Issue:** iOS Safari has quirks with `position: fixed` and scroll locking. Current implementation may not work reliably.

**Current code:**
```javascript
body.style.position = 'fixed';
body.style.top = `-${scrollY}px`;
```

**Better approach:** Use `overscroll-behavior` and ensure iOS compatibility:
```javascript
function lockBodyScroll() {
  scrollY = window.scrollY || window.pageYOffset;
  const body = document.body;
  const html = document.documentElement;

  // iOS Safari fix: use both methods
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  body.style.touchAction = 'none';
  body.style.overscrollBehavior = 'none'; // ADD THIS
  
  html.style.overflow = 'hidden'; // ADD THIS
  html.style.touchAction = 'none'; // ADD THIS
  
  body.classList.add('modal-open');
  html.classList.add('modal-open');
}
```

### 13. **Focus Management on iOS**
**Location:** `src/script/systems/11-inventory-drag.js:236-286`

**Issue:** Multiple blur attempts and focus resets may cause iOS Safari to behave unpredictably.

**Current:** Aggressive blurring on every interaction.

**Recommendation:** Consolidate focus management:
```javascript
// Create single focus manager
const FocusManager = {
  blurActive(root) {
    const ae = document.activeElement;
    if (ae && root.contains(ae) && (ae.tagName === 'BUTTON' || ae.tagName === 'A')) {
      ae.blur();
    }
  },
  
  resetFocus() {
    // Single, reliable method
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }
};
```

### 14. **Viewport Units May Cause Issues on Mobile Keyboards**
**Location:** `src/style/components/inventory.css:54-55`

**Issue:** Using `vh` units can cause layout shifts when mobile keyboards appear.

**Current:**
```css
--eqGridH: calc(var(--slot-size) * 5 + var(--slot-gap) * 4);
```

**Fix:** Use fixed pixel values or `dvh` (dynamic viewport height) where supported:
```css
--eqGridH: calc(var(--slot-size) * 5 + var(--slot-gap) * 4);
/* Add fallback for older browsers */
height: var(--eqGridH);
max-height: 100vh; /* Fallback */
```

### 15. **Touch Target Sizes**
**Location:** Multiple CSS files

**Issue:** Some interactive elements may be smaller than 44px minimum touch target.

**Check:** Ensure all buttons, links, and interactive elements meet WCAG 2.1 Level AAA (44×44px minimum).

**Current:** Most buttons use `min-height: 44px`, but some links may be smaller.

---

## 🧩 MODULARITY CONCERNS

### 16. **Tight Coupling Between Systems**
**Location:** Throughout codebase

**Issue:** Systems directly access other systems' internals instead of using public APIs.

**Example:** `11-inventory-drag.js` directly accesses multiple systems:
```javascript
const { updateSlotEl, rerenderWardrobeGrid, clearDropTargets } = Skycore.Systems.InventoryDOM;
const { placeInWardrobe, compactWardrobe } = Skycore.Systems.InventoryWardrobe;
// ... 10+ more imports
```

**Recommendation:** Create a facade/mediator pattern:
```javascript
// Create InventoryFacade
Skycore.Systems.InventoryFacade = {
  updateSlot(root, area, index) {
    return Skycore.Systems.InventoryDOM.updateSlotEl(root, area, index);
  },
  
  moveToWardrobe(itemId) {
    return Skycore.Systems.InventoryWardrobe.placeInWardrobe(itemId);
  },
  
  // ... other common operations
};
```

### 17. **No Clear Module Boundaries**
**Location:** System files

**Issue:** It's unclear what each module should own. Some modules do too much (e.g., `InventoryDOM` handles rendering, updates, and state synchronization).

**Recommendation:** Define clear responsibilities:
- **Config**: Constants only
- **Helpers**: Pure utility functions
- **State**: State management only
- **Render**: HTML generation only
- **DOM**: DOM manipulation only
- **Modals**: Modal UI only
- **Actions**: Business logic only

### 18. **Hard-Coded Dependencies**
**Location:** `src/script/systems/12-inventory.js:59-102`

**Issue:** Main inventory file has hard-coded dependency checks that fail loudly but don't provide graceful degradation.

**Current:**
```javascript
if (!Skycore.Systems.InventoryConfig) {
  console.error("inventory-config.js must be loaded before inventory.js");
  return;
}
```

**Better:** Provide fallbacks or lazy loading:
```javascript
function ensureDependency(name, factory) {
  if (!Skycore.Systems[name]) {
    console.warn(`Dependency ${name} not loaded, attempting to initialize...`);
    if (typeof factory === 'function') {
      factory();
    } else {
      throw new Error(`Required dependency ${name} not available`);
    }
  }
}
```

### 19. **Global Namespace Pollution**
**Location:** All system files

**Issue:** Everything is attached to `window.Skycore`, making it hard to track what's public vs private.

**Recommendation:** Use module pattern with explicit exports:
```javascript
(function() {
  'use strict';
  
  // Private
  const privateVar = {};
  
  // Public API
  const InventorySystem = {
    publicMethod() { /* ... */ }
  };
  
  // Export only what's needed
  window.Skycore = window.Skycore || {};
  window.Skycore.Systems = window.Skycore.Systems || {};
  window.Skycore.Systems.Inventory = InventorySystem;
})();
```

### 20. **No Dependency Injection**
**Location:** All system files

**Issue:** Systems directly reference `State.variables` and `Skycore.Systems.*` instead of receiving dependencies.

**Current:**
```javascript
const eq = State.variables.invSys.eq;
```

**Better:**
```javascript
function InventoryDrag(dependencies) {
  const { state, helpers, dom, wardrobe } = dependencies;
  
  return {
    bindInteractions(root) {
      const eq = state.getEquipped();
      // ...
    }
  };
}
```

---

## 🔧 RECOMMENDED FIXES PRIORITY

### **P0 - Critical (Fix Immediately)**
1. Modal escape handler memory leak (#1)
2. Filter migration running every call (#2)
3. Input validation in drag system (#4)

### **P1 - High (Fix Soon)**
4. Array length manipulation safety (#3)
5. Touch action conflicts (#7)
6. Modal scroll lock iOS fix (#12)
7. State access validation (#6)

### **P2 - Medium (Fix When Possible)**
8. Circular dependency refactoring (#5)
9. Error handling standardization (#8)
10. Focus management consolidation (#13)
11. Magic numbers extraction (#9)

### **P3 - Low (Nice to Have)**
12. Code deduplication (#10)
13. Optional chaining consistency (#11)
14. Viewport unit fixes (#14)
15. Modularity improvements (#16-20)

---

## 📋 CHECKLIST FOR IMPLEMENTATION

- [ ] Fix modal escape handler cleanup
- [ ] Add filter migration flag
- [ ] Add input validation to drag handlers
- [ ] Create array resize utility function
- [ ] Fix touch-action conflicts
- [ ] Improve iOS scroll lock
- [ ] Add state validation checks
- [ ] Extract magic numbers to config
- [ ] Create filter helper function
- [ ] Standardize error handling pattern
- [ ] Consolidate focus management
- [ ] Review all touch target sizes
- [ ] Document module boundaries
- [ ] Create dependency injection pattern
- [ ] Add unit tests for critical paths

---

## 🎯 MOBILE-SPECIFIC RECOMMENDATIONS

1. **Test on real devices:** iOS Safari, Chrome Android, Samsung Internet
2. **Use `dvh` units** where supported for better keyboard handling
3. **Implement proper viewport meta tag** (check `index.html`)
4. **Add safe-area-inset support** for notched devices
5. **Test with keyboard open/closed** on mobile
6. **Verify touch targets** meet 44px minimum
7. **Test drag-and-drop** on various screen sizes
8. **Verify modal behavior** on landscape orientation

---

## 📚 ADDITIONAL NOTES

- Codebase is generally well-organized with clear file structure
- Good use of IIFEs for module isolation
- Numbered file prefixes ensure load order (smart!)
- Good mobile-first CSS approach
- Comprehensive comments and documentation

**Overall Assessment:** The codebase is solid but needs cleanup in memory management, error handling, and mobile edge cases. The modular structure is good but could benefit from clearer boundaries and dependency management.
