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
    
    // Eye sprite paths (for blink animation)
    eyesSprites: {
      open: "assets/mc-eyes/eyes-open.webp",
      half: "assets/mc-eyes/eyes-half-closed.webp",
      closed: "assets/mc-eyes/eyes-closed.webp"
    },
    
    // Default angle/view (for future expansion)
    defaultAngle: "front",
    
    // Layer system configuration (for future paper-doll expansion)
    layers: {
      // Layer order (bottom to top)
      order: [
        "base",      // Base character sprite
        "eyes",      // Eyes layer (for blink animation)
        "underwear", // Underwear layer
        "clothing",  // Clothing layer
        "accessories" // Accessories layer
      ],
      
      // Z-index mapping for CSS layering
      zIndex: {
        base: 1,
        eyes: 2,
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
   * @param {string} options.blinkGroup - Optional blink group ID for synchronized blinking
   * @returns {string} - HTML string for character display
   */
  function renderCharacterDisplay(options = {}) {
    const {
      angle = DISPLAY_CONFIG.defaultAngle,
      equipment = null,
      className = "",
      showPresentation = true,
      baseSpriteKey = null,
      blinkGroup = null
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

    // Safe blinkGroup attribute (only if provided and non-empty)
    const safeBlinkGroup = blinkGroup && typeof blinkGroup === "string" && blinkGroup.trim() ? blinkGroup.trim() : null;

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
      <div class="char-display-layer char-display-layer-eyes">
        <img src="${DISPLAY_CONFIG.eyesSprites.open}"
             alt=""
             class="char-display-sprite char-display-sprite-eyes"
             data-sprite-type="eyes"
             draggable="false">
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
      <div class="${classes}" data-angle="${angle}"${safeBlinkGroup ? ` data-blink-group="${safeBlinkGroup}"` : ""}>
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
   * Preloads a single image and waits for it to decode
   * @param {string} src - Image source path
   * @returns {Promise} - Resolves when image is loaded/decoded
   */
  function preloadOne(src) {
    return new Promise(resolve => {
      if (!src) return resolve();
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve();
      img.onerror = () => resolve(); // don't block on missing asset
      img.src = src;

      // decode() is best but not always reliable across iOS versions
      if (img.decode) {
        img.decode().then(resolve).catch(resolve);
      }
    });
  }

  /**
   * Preloads multiple images in parallel
   * @param {Array<string>} srcList - Array of image source paths
   * @returns {Promise} - Resolves when all images are loaded/decoded
   */
  function preloadAll(srcList) {
    const unique = Array.from(new Set((srcList || []).filter(Boolean)));
    return Promise.all(unique.map(preloadOne));
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
      const { logError } = Skycore.Systems.ErrorHandler || {};
      if (logError) {
        logError("CharacterDisplay.update", `Element not found: ${element}`, { element });
      } else {
        console.warn("CharacterDisplay: Element not found", element);
      }
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
      const { logError } = Skycore.Systems.ErrorHandler || {};
      if (logError) {
        logError("CharacterDisplay.update", "Layers container not found, re-rendering", { element: el });
      } else {
        console.warn("CharacterDisplay: Layers container not found, re-rendering");
      }
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
    
    // Ensure eyes layer exists (do not overwrite current src, blink may be mid-animation)
    let eyesSpriteEl = layersContainer.querySelector(".char-display-sprite-eyes");
    if (!eyesSpriteEl) {
      const eyesLayer = document.createElement("div");
      eyesLayer.className = "char-display-layer char-display-layer-eyes";

      eyesSpriteEl = document.createElement("img");
      eyesSpriteEl.className = "char-display-sprite char-display-sprite-eyes";
      eyesSpriteEl.setAttribute("data-sprite-type", "eyes");
      eyesSpriteEl.setAttribute("draggable", "false");
      eyesSpriteEl.src = DISPLAY_CONFIG.eyesSprites.open;

      eyesLayer.appendChild(eyesSpriteEl);

      // Insert after base layer
      const baseLayer = layersContainer.querySelector(".char-display-layer-base");
      if (baseLayer && baseLayer.nextSibling) {
        layersContainer.insertBefore(eyesLayer, baseLayer.nextSibling);
      } else {
        layersContainer.appendChild(eyesLayer);
      }
    } else {
      // If src is missing for any reason, restore open
      const src = eyesSpriteEl.getAttribute("src");
      if (!src) eyesSpriteEl.src = DISPLAY_CONFIG.eyesSprites.open;
    }
    
    // --- iOS-safe clothing swap: keep old layers until new images are ready ---
    const newClothingSprites = equippedSprites.slice(); // array of paths

    // Token prevents older async swaps from "winning"
    el._clothingSwapToken = (el._clothingSwapToken || 0) + 1;
    const token = el._clothingSwapToken;

    // Preload/Decode new clothing sprites FIRST (old clothing stays visible)
    preloadAll(newClothingSprites).then(() => {
      if (!el.isConnected) return;
      if (el._clothingSwapToken !== token) return; // newer update happened

      // Snapshot old clothing layers (keep them visible until new is ready)
      const oldLayers = Array.from(layersContainer.querySelectorAll(".char-display-layer-clothing"));
      const hasOld = oldLayers.length > 0;

      // Build new clothing layers off-DOM
      const frag = document.createDocumentFragment();

      newClothingSprites.forEach((spritePath, index) => {
        const layerDiv = document.createElement("div");

        // IMPORTANT:
        // - If we have old layers, start hidden and fade in (crossfade)
        // - If we don't (equipping from naked), show immediately (no naked frame)
        layerDiv.className = hasOld
          ? "char-display-layer char-display-layer-clothing is-enter"
          : "char-display-layer char-display-layer-clothing is-visible";

        layerDiv.style.zIndex = DISPLAY_CONFIG.layers.zIndex.clothing + index;

        const img = document.createElement("img");
        img.src = spritePath;
        img.alt = `Clothing layer ${index + 1}`;
        img.setAttribute("role", "img");
        img.setAttribute("aria-label", "Clothing layer");
        img.className = "char-display-sprite char-display-sprite-clothing";
        img.setAttribute("data-sprite-type", "clothing");
        img.setAttribute("data-sprite-index", index.toString());
        img.decoding = "async";

        layerDiv.appendChild(img);
        frag.appendChild(layerDiv);
      });

      // Append new layers WITHOUT removing old yet (prevents naked flash)
      layersContainer.appendChild(frag);

      if (!hasOld) {
        // Nothing to crossfade; we're done.
        return;
      }

      // Fade in new layers next frame, then remove old layers after transition
      requestAnimationFrame(() => {
        if (!el.isConnected) return;
        if (el._clothingSwapToken !== token) return; // newer update happened

        const entering = layersContainer.querySelectorAll(".char-display-layer-clothing.is-enter");
        entering.forEach(layer => {
          layer.classList.add("is-visible");
          layer.classList.remove("is-enter");
        });

        // Remove old layers after transition duration (match CSS, add small buffer)
        const REMOVE_AFTER_MS = 110; // CSS is 80ms; buffer for iOS
        setTimeout(() => {
          if (!el.isConnected) return;
          if (el._clothingSwapToken !== token) return;

          oldLayers.forEach(layer => layer.remove());
        }, REMOVE_AFTER_MS);
      });
    });

    // Update angle if provided
    if (options.angle) {
      el.setAttribute("data-angle", options.angle);
    }

    // Update blinkGroup if provided
    if (options.blinkGroup !== undefined) {
      const safeBlinkGroup = options.blinkGroup && typeof options.blinkGroup === "string" && options.blinkGroup.trim() ? options.blinkGroup.trim() : null;
      if (safeBlinkGroup) {
        el.setAttribute("data-blink-group", safeBlinkGroup);
      } else {
        el.removeAttribute("data-blink-group");
      }
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
