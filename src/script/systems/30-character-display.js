/* =========================================================================
   Character Display Engine: Equipment-based sprite rendering
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  /**
   * Character Display Configuration
   * Defines base sprites, angles, and layer system for paper-doll display
   */
  const DISPLAY_CONFIG = Object.freeze({
    // Base sprite paths (relative to assets/)
    baseSprites: {
      naked: "assets/mc-naked.webp",
      "naked-selfie": "assets/mc-naked-selfie.webp",
      basic: "assets/mc-basic.webp"
    },
    
    // Default angle/view (for future expansion)
    defaultAngle: "front",
    
    // Layer system configuration (for future paper-doll expansion)
    layers: {
      // Layer order (bottom to top)
      order: [
        "base",      // Base character sprite
        "underwear", // Underwear layer
        "clothing",  // Clothing layer
        "accessories" // Accessories layer
      ],
      
      // Z-index mapping for CSS layering
      zIndex: {
        base: 1,
        underwear: 2,
        clothing: 3,
        accessories: 4
      }
    }
  });


  /**
   * Gets sprite path for an item if it has one
   * @param {string} itemId - Item ID
   * @returns {string|null} - Sprite path or null
   */
  function getItemSprite(itemId) {
    if (!itemId) return null;
    const { getItem } = Skycore.Systems.InventoryHelpers || {};
    if (!getItem) return null;
    const item = getItem(itemId);
    return (item && item.sprite) ? item.sprite : null;
  }

  /**
   * Gets all equipped item sprites in layer order
   * @param {Array} equipmentArray - Array of equipped item IDs
   * @returns {Array} - Array of sprite paths in render order
   */
  function getEquippedSprites(equipmentArray) {
    if (!Array.isArray(equipmentArray)) return [];
    
    const sprites = [];
    const slotOrder = [
      "head", "face", "neck",
      "overUpper", "upper", "underUpper",
      "hands",
      "lower", "underLower",
      "legs",
      "feet"
    ];
    
    const { getEquipSlot } = Skycore.Systems.InventoryHelpers || {};
    if (!getEquipSlot) return [];
    
    // Sort items by slot order
    const itemsBySlot = {};
    equipmentArray.forEach(itemId => {
      if (!itemId) return;
      const slot = getEquipSlot(itemId);
      if (slot && slotOrder.includes(slot)) {
        if (!itemsBySlot[slot]) itemsBySlot[slot] = [];
        itemsBySlot[slot].push(itemId);
      }
    });
    
    // Collect sprites in slot order
    slotOrder.forEach(slot => {
      if (itemsBySlot[slot]) {
        itemsBySlot[slot].forEach(itemId => {
          const sprite = getItemSprite(itemId);
          if (sprite) sprites.push(sprite);
        });
      }
    });
    
    return sprites;
  }

  /**
   * Determines which base sprite to use based on equipment state
   * @param {Array} equipmentArray - Array of equipped item IDs (can contain nulls)
   * @param {string} baseSpriteKey - Optional key for base sprite (e.g., "naked", "naked-selfie", "naked-selfie-no-arm")
   * @returns {string} - Path to the appropriate base sprite
   */
  function getBaseSprite(equipmentArray, baseSpriteKey = null) {
    if (!Array.isArray(equipmentArray)) {
      console.warn("CharacterDisplay: getBaseSprite - equipmentArray is not an array", equipmentArray);
      return DISPLAY_CONFIG.baseSprites.naked;
    }

    // If baseSpriteKey is provided, use it (if valid), otherwise default to naked
    if (baseSpriteKey && DISPLAY_CONFIG.baseSprites[baseSpriteKey]) {
      return DISPLAY_CONFIG.baseSprites[baseSpriteKey];
    }

    // Always use naked base for modular paperdoll system
    return DISPLAY_CONFIG.baseSprites.naked;
  }

  /**
   * Gets the current equipment array from state
   * @returns {Array} - Current equipment array
   */
  function getCurrentEquipment() {
    const V = State.variables;
    const eq = V.invSys?.eq || [];
    return eq;
  }

  /**
   * Gets unique tags from all equipped clothing items with occurrence counts
   * @param {Array} equipment - Equipment array (optional, uses state if not provided)
   * @returns {Array} - Array of tag label strings with counts, sorted alphabetically (e.g., ["Feminine (2)", "Cute"])
   */
  function getOutfitVibes(equipment = null) {
    const eq = equipment !== null ? equipment : getCurrentEquipment();
    if (!Array.isArray(eq)) return [];

    const { getItem } = Skycore.Systems.InventoryHelpers || {};
    if (!getItem) return [];

    const tagCounts = new Map();
    
    // Count all tags from equipped clothing items
    eq.forEach(itemId => {
      if (!itemId) return;
      const item = getItem(itemId);
      if (!item) return;
      
      // Only process clothing items
      const category = item.category || item.cat;
      if (category !== "clothes") return;
      
      // Support both new structure (tags) and legacy (p_tags)
      const tags = Array.isArray(item.tags) ? item.tags : (Array.isArray(item.p_tags) ? item.p_tags : []);
      
      tags.forEach(tag => {
        if (tag && typeof tag === "string") {
          const currentCount = tagCounts.get(tag) || 0;
          tagCounts.set(tag, currentCount + 1);
        }
      });
    });

    // Convert to array and get labels from TagCatalog, format with counts
    const tagLabels = [];
    const tagCatalog = Skycore.Content?.TagCatalog?.clothes || {};
    
    // Sort tags alphabetically
    const sortedTags = Array.from(tagCounts.keys()).sort();
    
    sortedTags.forEach(tag => {
      const count = tagCounts.get(tag);
      const tagInfo = tagCatalog[tag];
      let label;
      
      if (tagInfo && tagInfo.label) {
        label = tagInfo.label;
      } else {
        // Fallback: capitalize the tag name if not in catalog
        label = tag.charAt(0).toUpperCase() + tag.slice(1);
      }
      
      // Format with count in brackets (always show count for consistency)
      const formattedLabel = `${label} (${count})`;
      tagLabels.push(formattedLabel);
    });

    return tagLabels;
  }

  /**
   * Renders the character display HTML
   * @param {Object} options - Display options
   * @param {string} options.angle - View angle (default: "front")
   * @param {Array} options.equipment - Equipment array (optional, uses state if not provided)
   * @param {string} options.className - Additional CSS classes
   * @param {boolean} options.showPresentation - Whether to show presentation score (default: true)
   * @param {string} options.baseSpriteKey - Optional base sprite key (e.g., "naked", "naked-selfie")
   * @returns {string} - HTML string for character display
   */
  function renderCharacterDisplay(options = {}) {
    const {
      angle = DISPLAY_CONFIG.defaultAngle,
      equipment = null,
      className = "",
      showPresentation = true,
      baseSpriteKey = null
    } = options;

    // Get equipment array
    const eq = equipment !== null ? equipment : getCurrentEquipment();
    
    // Determine base sprite
    const spritePath = getBaseSprite(eq, baseSpriteKey);

    // Build CSS classes
    const classes = [
      "char-display",
      `char-display-angle-${angle}`,
      className
    ].filter(Boolean).join(" ");

    // NOTE: Presentation and vibes are now separate modules rendered outside CharacterDisplay
    // showPresentation flag is kept for backwards compatibility but does nothing
    let presentationHTML = "";

    // Get equipped item sprites
    const equippedSprites = getEquippedSprites(eq);
    
    // Build sprite layers HTML
    let spriteLayersHTML = `
      <div class="char-display-layer char-display-layer-base">
        <img src="${spritePath}" 
             alt="Character base" 
             role="img" 
             aria-label="Character base"
             class="char-display-sprite char-display-sprite-base"
             data-sprite-type="base">
      </div>
    `;
    
    // Add equipped item sprites as layers
    equippedSprites.forEach((spritePath, index) => {
      spriteLayersHTML += `
        <div class="char-display-layer char-display-layer-clothing" style="z-index: ${DISPLAY_CONFIG.layers.zIndex.clothing + index}">
          <img src="${spritePath}" 
               alt="Clothing layer ${index + 1}" 
               role="img" 
               aria-label="Clothing layer"
               class="char-display-sprite char-display-sprite-clothing"
               data-sprite-type="clothing"
               data-sprite-index="${index}">
        </div>
      `;
    });

    // Render character display
    return `
      <div class="${classes}" data-angle="${angle}">
        <div class="char-display-container">
          <div class="char-display-layers">
            ${spriteLayersHTML}
          </div>
        </div>
        ${presentationHTML}
      </div>
    `;
  }

  /**
   * Updates an existing character display element in the DOM
   * @param {HTMLElement|string} element - DOM element or selector
   * @param {Object} options - Display options (same as renderCharacterDisplay)
   */
  function updateCharacterDisplay(element, options = {}) {
    const el = typeof element === "string" 
      ? document.querySelector(element) 
      : element;

    if (!el) {
      console.warn("CharacterDisplay: Element not found", element);
      return;
    }

    // Get equipment array - use provided equipment or get from state
    const eq = (options.equipment !== undefined && options.equipment !== null) 
      ? options.equipment 
      : getCurrentEquipment();
    
    // Determine base sprite
    const baseSpriteKey = options.baseSpriteKey || null;
    const spritePath = getBaseSprite(eq, baseSpriteKey);
    
    // Get equipped item sprites
    const equippedSprites = getEquippedSprites(eq);
    
    // Find layers container
    const layersContainer = el.querySelector(".char-display-layers");
    if (!layersContainer) {
      console.warn("CharacterDisplay: Layers container not found, re-rendering");
      // Re-render the entire character display
      const rendered = renderCharacterDisplay({ 
        equipment: eq, 
        angle: options.angle, 
        showPresentation: options.showPresentation !== false 
      });
      // Replace the inner content, preserving the outer wrapper if it exists
      const outerMatch = rendered.match(/^<div[^>]*>([\s\S]*)<\/div>\s*$/);
      if (outerMatch && outerMatch[1]) {
        el.innerHTML = outerMatch[1];
      } else {
        el.innerHTML = rendered;
      }
      return;
    }
    
    // Update base sprite - ensure it exists and updates
    let baseSpriteEl = layersContainer.querySelector(".char-display-sprite-base");
    if (!baseSpriteEl) {
      // Base sprite doesn't exist, need to create it
      const baseLayer = document.createElement("div");
      baseLayer.className = "char-display-layer char-display-layer-base";
      baseSpriteEl = document.createElement("img");
      baseSpriteEl.src = spritePath;
      baseSpriteEl.alt = "Character base";
      baseSpriteEl.setAttribute("role", "img");
      baseSpriteEl.setAttribute("aria-label", "Character base");
      baseSpriteEl.className = "char-display-sprite char-display-sprite-base";
      baseSpriteEl.setAttribute("data-sprite-type", "base");
      baseLayer.appendChild(baseSpriteEl);
      layersContainer.insertBefore(baseLayer, layersContainer.firstChild);
    } else {
      // Update existing base sprite
      const currentSrc = baseSpriteEl.getAttribute("src") || baseSpriteEl.src || "";
      const newSrc = spritePath;
      
      if (currentSrc !== newSrc) {
        // Different image - simple swap
        baseSpriteEl.setAttribute("src", newSrc);
        baseSpriteEl.src = newSrc;
      }
    }
    
    // Remove existing clothing layers
    const existingClothingLayers = layersContainer.querySelectorAll(".char-display-layer-clothing");
    existingClothingLayers.forEach(layer => layer.remove());
    
    // Add new clothing layers
    equippedSprites.forEach((spritePath, index) => {
      const layerDiv = document.createElement("div");
      layerDiv.className = "char-display-layer char-display-layer-clothing";
      layerDiv.style.zIndex = DISPLAY_CONFIG.layers.zIndex.clothing + index;
      
      const img = document.createElement("img");
      img.src = spritePath;
      img.alt = `Clothing layer ${index + 1}`;
      img.setAttribute("role", "img");
      img.setAttribute("aria-label", "Clothing layer");
      img.className = "char-display-sprite char-display-sprite-clothing";
      img.setAttribute("data-sprite-type", "clothing");
      img.setAttribute("data-sprite-index", index.toString());
      
      layerDiv.appendChild(img);
      layersContainer.appendChild(layerDiv);
    });

    // Update angle if provided
    if (options.angle) {
      el.setAttribute("data-angle", options.angle);
    }

    // Update className if provided
    if (options.className !== undefined) {
      // Remove existing custom classes (preserve char-display and char-display-angle-*)
      const currentClasses = el.className.split(/\s+/).filter(Boolean);
      const baseClasses = currentClasses.filter(cls => cls === "char-display" || cls.startsWith("char-display-angle-"));
      
      // Build new class list
      let newClasses = [...baseClasses];
      
      // Add new className if provided
      if (options.className) {
        newClasses.push(options.className);
      }
      
      // Update angle class if angle is provided
      if (options.angle) {
        // Remove old angle class if present
        newClasses = newClasses.filter(cls => !cls.startsWith("char-display-angle-"));
        newClasses.push(`char-display-angle-${options.angle}`);
      }
      
      el.className = newClasses.join(" ").trim();
    } else if (options.angle) {
      // Only angle was provided, update it without touching className
      el.className = el.className
        .replace(/char-display-angle-\w+/g, "")
        .trim() + ` char-display-angle-${options.angle}`;
      el.className = el.className.trim();
    }

    // NOTE: Presentation and vibes are now separate modules rendered outside CharacterDisplay
    // Remove any existing presentation/vibes elements if they exist (migration cleanup)
    const presentationEl = el.querySelector(".char-presentation");
    if (presentationEl) presentationEl.remove();
    const vibesEl = el.querySelector(".char-outfit-vibes");
    if (vibesEl) vibesEl.remove();
  }

  /**
   * Gets the current sprite path based on equipment state
   * @param {Array} equipment - Optional equipment array (uses state if not provided)
   * @returns {string} - Path to current sprite
   */
  function getCurrentSprite(equipment = null) {
    const eq = equipment !== null ? equipment : getCurrentEquipment();
    return getBaseSprite(eq);
  }

  /**
   * Checks if character has any equipment equipped
   * @param {Array} equipment - Optional equipment array (uses state if not provided)
   * @returns {boolean} - True if at least one item is equipped
   */
  function hasEquipment(equipment = null) {
    const eq = equipment !== null ? equipment : getCurrentEquipment();
    if (!Array.isArray(eq)) return false;
    return eq.some(itemId => itemId !== null && itemId !== undefined && itemId !== "");
  }

  Skycore.Systems.CharacterDisplay = {
    render: renderCharacterDisplay,
    update: updateCharacterDisplay,
    getCurrentSprite,
    hasEquipment,
    getBaseSprite,
    getEquippedSprites,
    getItemSprite,
    getOutfitVibes,
    CONFIG: DISPLAY_CONFIG
  };
})();
