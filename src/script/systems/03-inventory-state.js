/* =========================================================================
   Inventory System: State Management
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { EQ_SIZE, INV_SIZE, WARD_MIN_SIZE } = Skycore.Systems.InventoryConfig;
  const { itemDB, firstEmptyIndex, getEquipSlot } = Skycore.Systems.InventoryHelpers;

  function ensureState() {
    const V = State.variables;

    if (!V.stats) V.stats = { strength: 12, agility: 9, confidence: 7, charisma: 6 };
    if (!V.statuses) V.statuses = {};

    if (!V.invSys) {
      V.invSys = {
        eq: Array(EQ_SIZE).fill(null),
        inv: Array(INV_SIZE).fill(null),
        wardrobe: Array(WARD_MIN_SIZE).fill(null),
        sets: [],
        _seeded: false,
        filter: { category: [], type: [], slot: [] }
      };
    }

    // Ensure sets array exists
    if (!Array.isArray(V.invSys.sets)) {
      V.invSys.sets = [];
    }

    // Seed reference test sets for presentation engine balancing (only if they don't exist)
    if (!V.invSys._testSetsSeeded) {
      seedTestSets(V.invSys.sets);
      V.invSys._testSetsSeeded = true;
    }

    // Ensure filter state exists (arrays for multiple selection)
    if (!V.invSys.filter) {
      V.invSys.filter = { category: [], type: [], slot: [] };
    }
    // Migrate old filter format (single values) to arrays
    if (V.invSys.filter && !Array.isArray(V.invSys.filter.category)) {
      const old = V.invSys.filter;
      V.invSys.filter = {
        category: old.category ? [old.category] : [],
        type: old.type ? [old.type] : [],
        slot: old.slot ? [old.slot] : []
      };
    }

    if (!Array.isArray(V.invSys.eq)) V.invSys.eq = Array(EQ_SIZE).fill(null);
    if (!Array.isArray(V.invSys.inv)) V.invSys.inv = Array(INV_SIZE).fill(null);

    // Wardrobe migration: old builds used { id: count }
    if (!Array.isArray(V.invSys.wardrobe)) {
      const old = V.invSys.wardrobe;
      const arr = [];
      if (old && typeof old === "object") {
        Object.keys(old).forEach(id => {
          const n = Math.max(0, Number(old[id] || 0));
          for (let i = 0; i < n; i++) arr.push(id);
        });
      }
      V.invSys.wardrobe = arr;
    }

    V.invSys.eq.length = EQ_SIZE;
    V.invSys.inv.length = INV_SIZE;

    if (Skycore.Systems.InventoryWardrobe) {
      Skycore.Systems.InventoryWardrobe.ensureWardrobeCapacity(WARD_MIN_SIZE);
    }

    if (!V.invSys._seeded) {
      const db = itemDB();
      const allIds = Object.keys(db);

      // Clear equipment array
      for (let i = 0; i < EQ_SIZE; i++) V.invSys.eq[i] = null;

      // Equip basic starting items in specific slots, ordered from top to bottom (same as cleanup)
      const slotOrder = [
        "head", "face", "neck",
        "overUpper", "upper", "underUpper",
        "hands",
        "lower", "underLower",
        "legs",
        "feet"
      ];

      const startingItems = {
        upper: "it:basic-tshirt",
        lower: "it:basic-jeans",
        feet: "it:basic-sneakers"
      };

      // Place items in slot order (top to bottom)
      let eqIndex = 0;
      for (const slot of slotOrder) {
        const itemId = startingItems[slot];
        if (itemId && db[itemId] && getEquipSlot(itemId) === slot) {
          V.invSys.eq[eqIndex] = itemId;
          eqIndex++;
        }
      }

      // Clear inventory and set only chocolate bar
      for (let i = 0; i < INV_SIZE; i++) V.invSys.inv[i] = null;
      if (db["it:01a"]) {
        V.invSys.inv[0] = "it:01a";
      }

      // Collect all feminine items and old masculine items, place in wardrobe
      // Support both new structure (tags) and legacy (p_tags)
      const feminineItems = allIds.filter(id => {
        const item = db[id];
        const tags = Array.isArray(item.tags) ? item.tags : (Array.isArray(item.p_tags) ? item.p_tags : []);
        return item && tags.includes("feminine");
      });

      // Add old masculine starting items to wardrobe
      const oldMascItems = ["it:m01", "it:m02", "it:m03", "it:m04", "it:m05", "it:m06"];
      const itemsForWardrobe = [...feminineItems, ...oldMascItems];

      // Clear wardrobe
      V.invSys.wardrobe.length = 0;

      // Ensure wardrobe has enough capacity for all items
      if (Skycore.Systems.InventoryWardrobe) {
        Skycore.Systems.InventoryWardrobe.ensureWardrobeCapacity(Math.max(WARD_MIN_SIZE, itemsForWardrobe.length));
      }

      // Place items in wardrobe
      for (let i = 0; i < itemsForWardrobe.length; i++) {
        V.invSys.wardrobe[i] = itemsForWardrobe[i];
      }

      V.invSys._seeded = true;
    }
  }

  /**
   * Seed reference test sets for presentation engine balancing
   * These are predefined test outfits for tuning the presentation score
   * @param {Array} setsArray - The sets array to populate
   */
  function seedTestSets(setsArray) {
    // Check if test sets already exist (by name)
    const existingNames = new Set(setsArray.map(s => s.name));
    
    // 1. Full masculine baseline
    if (!existingNames.has("Test: Full Masculine")) {
      setsArray.push({
        id: "set:test_masc",
        name: "Test: Full Masculine",
        items: ["it:m01", "it:m02", "it:m03", "it:m04", "it:m05", "it:m06"]
        // Target score: 10-25
      });
    }

    // 2. Mixed / ambiguous
    if (!existingNames.has("Test: Mixed Ambiguous")) {
      setsArray.push({
        id: "set:test_mixed",
        name: "Test: Mixed Ambiguous",
        items: ["it:m03", "it:011", "it:m05"]
        // jeans + blouse + sneakers
        // Target score: 35-55
      });
    }

    // 3. Clearly feminine
    if (!existingNames.has("Test: Clearly Feminine")) {
      setsArray.push({
        id: "set:test_fem",
        name: "Test: Clearly Feminine",
        items: ["it:00d", "it:014", "it:00j", "it:00i"]
        // dress + wig + heels + stockings
        // Target score: 65-85
      });
    }

    // 4. Passing attempt (requires hairFemValue=+8, walkFemValue=+6, and optionally face/neck accessories)
    if (!existingNames.has("Test: Passing Attempt")) {
      setsArray.push({
        id: "set:test_passing",
        name: "Test: Passing Attempt",
        items: ["it:00d", "it:014", "it:00j", "it:00i", "it:00b", "it:017"]
        // dress + wig + heels + stockings + glasses + scarf
        // Note: Also set playerStyle.hairFemValue=+8 and walkFemValue=+6 for full test
        // Target score: 80-95
      });
    }
  }

  Skycore.Systems.InventoryState = {
    ensureState
  };
})();
