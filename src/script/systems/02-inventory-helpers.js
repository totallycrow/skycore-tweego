/* =========================================================================
   Inventory System: Helper Functions
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { EQ_SIZE, INV_SIZE } = Skycore.Systems.InventoryConfig;

  function itemDB() {
    return (Skycore.Content && Skycore.Content.ItemDB) ? Skycore.Content.ItemDB : {};
  }

  function getAreaArray(area) {
    const S = State.variables.invSys;
    if (area === "eq") return S.eq;
    if (area === "inv") return S.inv;
    if (area === "wardrobe") return S.wardrobe;
    return S.inv;
  }

  function getItem(itemId) {
    const db = itemDB();
    return itemId ? db[itemId] : null;
  }

  function capitalize(s) {
    return (s && s.length) ? (s[0].toUpperCase() + s.slice(1)) : s;
  }

  function firstEmptyIndex(arr) {
    for (let i = 0; i < arr.length; i++) if (!arr[i]) return i;
    return -1;
  }

  function countEmpty(arr) {
    let n = 0;
    for (let i = 0; i < arr.length; i++) if (!arr[i]) n++;
    return n;
  }

  // ---- Slot helpers -------------------------------------------------------
  function getCat(item) {
    return (item && item.cat) ? item.cat : "clothes";
  }

  function getEquipSlot(itemId) {
    const it = getItem(itemId);
    return it && typeof it.slot === "string" && it.slot.length ? it.slot : null;
  }

  function isWearableClothes(itemId) {
    const it = getItem(itemId);
    if (!it) return false;
    return getCat(it) === "clothes" && !!getEquipSlot(itemId);
  }

  function findEquippedIndexBySlot(eqArr, slotKey, ignoreIndex) {
    for (let i = 0; i < eqArr.length; i++) {
      if (i === ignoreIndex) continue;
      const id = eqArr[i];
      if (!id) continue;
      if (getEquipSlot(id) === slotKey) return i;
    }
    return -1;
  }

  // ---- Coverage helpers -----------------------------------------------------
  // Check if an item in the given slot is covered by any equipped item
  function isSlotCovered(eqArr, slotKey) {
    for (let i = 0; i < eqArr.length; i++) {
      const itemId = eqArr[i];
      if (!itemId) continue;
      const item = getItem(itemId);
      if (!item || !Array.isArray(item.covers)) continue;
      if (item.covers.includes(slotKey)) return true;
    }
    return false;
  }

  // Get effective visibility for an item based on coverage
  function getEffectiveVisibility(itemId, eqArr) {
    const item = getItem(itemId);
    if (!item || !item.shame || typeof item.shame.visibility !== "number") {
      return null; // No shame data or invalid visibility
    }

    const slot = getEquipSlot(itemId);
    if (!slot) return item.shame.visibility;

    // Check if this slot is covered by any equipped item
    const isCovered = isSlotCovered(eqArr, slot);
    if (isCovered) {
      // If covered, visibility drops to 1
      return 1;
    }

    return item.shame.visibility;
  }

  // Get the appropriate shame message based on effective visibility
  function getShameMessage(itemId, eqArr) {
    const item = getItem(itemId);
    if (!item || !item.shame) return null;

    const effectiveVis = getEffectiveVisibility(itemId, eqArr);
    if (effectiveVis === null) return item.shame.msg || null;

    // If visibility is reduced to 1 (covered), use partially hidden message if available
    if (effectiveVis === 1 && item.shame.visibility > 1 && item.shame.partiallyHiddenMsg) {
      return item.shame.partiallyHiddenMsg;
    }

    return item.shame.msg || null;
  }

  Skycore.Systems.InventoryHelpers = {
    itemDB,
    getAreaArray,
    getItem,
    capitalize,
    firstEmptyIndex,
    countEmpty,
    getCat,
    getEquipSlot,
    isWearableClothes,
    findEquippedIndexBySlot,
    isSlotCovered,
    getEffectiveVisibility,
    getShameMessage
  };
})();
