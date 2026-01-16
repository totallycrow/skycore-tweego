/* =========================================================================
   Skycore Simple Presentation Engine (FemScore)

   Rules:
   - Naked = 0
   - Masculine clothes = 0
   - Only items with presentation.intent === "feminine" add points
   - Items hidden by covers do not count
   - Public exposure: require upper/overUpper AND lower (hard block)

   Returns:
   - presentationScore (0-100) - mapped from femScore for backward compatibility
   - readAs: "masculine" | "androgynous" | "feminine" | "passing" - mapped from readLabel
   - femScore (0-120+) - raw fem score
   - femScoreRaw - fem score before stat modifiers
   - passChance (0-1) - probability of passing
   - readLabel: "male" | "soft-male" | "androgynous" | "female-leaning" | "female" | "inappropriate"
   - isExposedPublic (boolean) - hard "can't go out" gate
   - isReadAsFemale (boolean) - binary check for NPC reactions
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};
  Skycore.Systems.PresentationEngine = Skycore.Systems.PresentationEngine || {};

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));

  const CFG = Object.freeze({
    // Base points multiplier (tweak this first)
    baseUnit: 20,

    // How important each slot is for "feminine read"
    slotWeight: {
      overHead: 0.9,  // items on top of head (tiaras, crowns) - slightly more visible than head
      head: 0.8,
      face: 0.4,
      neck: 0.6,
      hands: 0.4,
      upper: 1.2,
      overUpper: 0.6,
      lower: 1.2,
      underUpper: 0.15,  // underwear: tiny unless visible
      underLower: 0.15,  // underwear: tiny unless visible
      legs: 0.8,
      feet: 1.3
    },

    // How strong each item type is (based on your current ItemDB types)
    // Unknown types fall back to 0.6 automatically.
    typeWeight: {
      // strong fem signals
      dresses: 1.5,
      shoes: 1.3,      // heels
      wigs: 1.2,
      corsets: 1.15,
      bottoms: 1.15,   // skirts/shorts etc.

      // medium
      tops: 0.9,
      headpieces: 0.8,
      stockings: 0.8,

      // light accents
      collars: 0.6,
      neckpieces: 0.6,
      jewellery: 0.5,
      gloves: 0.5,

      // underwear (if visible; usually hidden)
      bra: 0.35,
      panties: 0.35,

      // essentially neutral for fem score
      glasses: 0.2,
      jackets: 0.2,
      belts: 0.2,

      // masculine-only types (they add 0 anyway because intent !== "fem")
      boxers: 0.0,
      socks: 0.0
    },

    // Tiny tag tweaks (optional). Kept small on purpose.
    tagBoost: {
      elegant: +0.06,
      provocative: +0.10,
      restrictive: +0.00,
      professional: -0.04,
      androgynous: -0.02,
      casual: -0.04,
      masculine: -0.10
    },

    // Small stat modifiers so outfit remains the main driver.
    // Assumes starting stats ~10, stress/shame start ~0.
    statBaseline: 10,
    statMods: {
      beauty: +0.5,
      confidence: +0.4,
      stress: -0.5,
      shame: -0.4
    },

    // Convert (femScore + statMods) into pass chance
    pass: {
      threshold: 58, // raise to make passing harder
      slope: 9       // higher = smoother curve
    },

    // Label thresholds (for readLabel)
    tiers: [
      { max: 15, label: "male" },
      { max: 35, label: "soft-male" },
      { max: 55, label: "androgynous" },
      { max: 75, label: "female-leaning" },
      { max: 9999, label: "female" }
    ],

    // Map femScore (0-120) to presentationScore (0-100) for backward compatibility
    // Simple linear mapping: presentationScore = (femScore / 120) * 100
    scoreMapping: {
      maxFemScore: 120,
      maxPresentationScore: 100
    }
  });

  function getItem(id) {
    const db = (Skycore.Content && Skycore.Content.ItemDB) ? Skycore.Content.ItemDB : null;
    return db ? db[id] : null;
  }

  function getStat(name) {
    const V = State.variables;
    const s = V.mcStats;
    if (!s) return (name === "stress" || name === "shame") ? 0 : CFG.statBaseline;

    if (s.attributes && name in s.attributes) return s.attributes[name];
    if (s.status && name in s.status) return s.status[name];
    return (name === "stress" || name === "shame") ? 0 : CFG.statBaseline;
  }

  // Accept either:
  // - equippedBySlot object: { upper:"it:011", lower:"it:m03", ... }
  // - equippedIds array: ["it:011","it:m03", ...]
  function readEquipped(input) {
    const V = State.variables;

    // 1) caller provided something
    if (input && Array.isArray(input)) return { equippedIds: input.filter(Boolean), bySlot: null };
    if (input && typeof input === "object" && !Array.isArray(input)) {
      const bySlot = input;
      const equippedIds = Object.values(bySlot).filter(Boolean);
      return { equippedIds, bySlot };
    }

    // 2) common game storage candidates (best-effort)
    // Prioritize invSys.eq (array-based) as that's the current inventory system
    if (V.invSys && Array.isArray(V.invSys.eq)) {
      return { equippedIds: V.invSys.eq.filter(Boolean), bySlot: null };
    }

    // Fallback to slot-based V.eq (legacy)
    if (V.eq && typeof V.eq === "object" && !Array.isArray(V.eq)) {
      const bySlot = V.eq;
      const equippedIds = Object.values(bySlot).filter(Boolean);
      return { equippedIds, bySlot };
    }

    return { equippedIds: [], bySlot: null };
  }

  function resolveVisibility(equippedIds) {
    const visible = new Set(equippedIds);
    const bySlot = new Map();

    // map slot -> item id
    for (const id of equippedIds) {
      const it = getItem(id);
      if (it && it.slot) bySlot.set(it.slot, id);
    }

    // apply covers: covering item hides items in covered slots
    for (const id of equippedIds) {
      const it = getItem(id);
      if (!it || !Array.isArray(it.covers)) continue;

      for (const coveredSlot of it.covers) {
        const coveredId = bySlot.get(coveredSlot);
        if (coveredId && coveredId !== id) visible.delete(coveredId);
      }
    }

    return { visible, bySlot };
  }

  function computeFemScore(context, equippedInput) {
    const ctx = context || {};
    const { equippedIds } = readEquipped(equippedInput);
    const { visible, bySlot } = resolveVisibility(equippedIds);

    // Public exposure hard gate: require upper (or overUpper) AND lower
    const isPublic = !!ctx.isPublic;
    const hasUpper = !!(bySlot.get("upper") || bySlot.get("overUpper"));
    const hasLower = !!bySlot.get("lower");
    const isExposedPublic = isPublic && (!hasUpper || !hasLower);

    let femScoreRaw = 0;

    for (const id of equippedIds) {
      if (!visible.has(id)) continue;

      const it = getItem(id);
      if (!it) continue;

      // Only feminine intent adds points (masculine/unisex => 0)
      // Support both new structure (presentation.intent) and legacy (soc.intent)
      // Also support legacy "fem" value as alias for "feminine"
      const intent = (it.presentation && it.presentation.intent) || (it.soc && it.soc.intent);
      // Skip items without intent or with non-feminine intent
      // Support both "feminine" (new) and "fem" (legacy)
      if (!intent || (intent !== "feminine" && intent !== "fem")) continue;

      const slotW = CFG.slotWeight[it.slot] ?? 0.5;
      // Support both new structure (subtype) and legacy (type)
      const itemSubtype = it.subtype || it.type;
      const typeW = CFG.typeWeight[itemSubtype] ?? 0.6;

      // small boosts from tags
      let boost = 0;
      // Support both new structure (tags) and legacy (p_tags)
      const tags = Array.isArray(it.tags) ? it.tags : (Array.isArray(it.p_tags) ? it.p_tags : []);
      for (const t of tags) boost += (CFG.tagBoost[t] ?? 0);

      // Add baseFem adjustment (defaults to 0 if not present)
      const baseFem = typeof it.baseFem === "number" ? it.baseFem : 0;

      femScoreRaw += CFG.baseUnit * slotW * typeW * (1 + boost) + baseFem;
    }

    // Small stat modifiers (keep subtle)
    const beauty = getStat("beauty");
    const confidence = getStat("confidence");
    const stress = getStat("stress");
    const shame = getStat("shame");

    const statDelta =
      (beauty - CFG.statBaseline) * CFG.statMods.beauty +
      (confidence - CFG.statBaseline) * CFG.statMods.confidence +
      (stress - 0) * CFG.statMods.stress +
      (shame - 0) * CFG.statMods.shame;

    const femScore = clamp(femScoreRaw + statDelta, 0, 120);

    // Pass chance (simple)
    const passChance = clamp(sigmoid((femScore - CFG.pass.threshold) / CFG.pass.slope), 0, 1);

    // Label
    let readLabel = "male";
    for (const t of CFG.tiers) {
      if (femScore <= t.max) { readLabel = t.label; break; }
    }
    if (isExposedPublic) readLabel = "inappropriate";

    // Map readLabel to readAs for backward compatibility
    let readAs;
    switch (readLabel) {
      case "male":
      case "soft-male":
      case "inappropriate":
        readAs = "masculine";
        break;
      case "androgynous":
        readAs = "androgynous";
        break;
      case "female-leaning":
        readAs = "feminine";
        break;
      case "female":
        readAs = "passing";
        break;
      default:
        readAs = "androgynous";
    }

    // Map femScore (0-120) to presentationScore (0-100) for backward compatibility
    const presentationScore = clamp(
      (femScore / CFG.scoreMapping.maxFemScore) * CFG.scoreMapping.maxPresentationScore,
      0,
      100
    );

    // Binary check for "read as female" (for NPC reactions)
    // Consider "female-leaning" and "female" as "read as female"
    const isReadAsFemale = readLabel === "female-leaning" || readLabel === "female";

    return {
      // New Fem Score API
      femScoreRaw,
      femScore,
      passChance,
      readLabel,
      isExposedPublic,
      isReadAsFemale,
      // Backward compatibility
      presentationScore: Math.round(presentationScore),
      readAs
    };
  }

  /**
   * Get a readable gender presentation text (backward compatibility)
   * @returns {string} Descriptive text
   */
  function getGenderRead() {
    const result = computeFemScore({}, null);
    const readLabel = result.readLabel;
    const femScore = result.femScore;
    const isExposedPublic = result.isExposedPublic;

    if (isExposedPublic) {
      return "You can't go out like this. You're not properly dressed.";
    }

    switch (readLabel) {
      case "male":
        return "No one hesitates. You're read as a guy.";
      case "soft-male":
        return "Still read as a guy, just… a little softer around the edges.";
      case "androgynous":
        return "You could be read either way—people keep guessing wrong.";
      case "female-leaning":
        return "Most people read you as a girl—until you speak or move wrong.";
      case "female":
        return "You're read as a girl, confidently and consistently.";
      default:
        return "You're in that tricky zone where people hesitate before deciding.";
    }
  }

  /**
   * Analyze current outfit and return character comment data
   * @param {Object|Array} equippedInput - Optional equipped items (slot map or array)
   * @returns {Object} { comment: string, state: string, details: Object }
   */
  function getOutfitComment(equippedInput) {
    const { equippedIds, bySlot: bySlotInput } = readEquipped(equippedInput);
    const { visible, bySlot: visibleBySlot } = resolveVisibility(equippedIds);

    // Build bySlot map if not provided (from array-based inventory)
    let bySlot = bySlotInput;
    if (!bySlot && Array.isArray(equippedIds)) {
      bySlot = new Map();
      for (const id of equippedIds) {
        const it = getItem(id);
        if (it && it.slot) bySlot.set(it.slot, id);
      }
    } else if (bySlotInput && typeof bySlotInput === "object" && !(bySlotInput instanceof Map)) {
      // Convert object to Map if needed
      bySlot = new Map(Object.entries(bySlotInput));
    } else if (bySlotInput instanceof Map) {
      bySlot = bySlotInput;
    } else {
      bySlot = new Map();
    }

    // Check outerwear slots (what's visible to others)
    const upperId = visibleBySlot.get("upper") || visibleBySlot.get("overUpper") || null;
    const lowerId = visibleBySlot.get("lower") || null;
    const hasUpper = !!upperId;
    const hasLower = !!lowerId;

    // Check underwear (check actual equipped, not just visible)
    const underUpperId = bySlot.get("underUpper") || null;
    const underLowerId = bySlot.get("underLower") || null;
    
    // Determine if underwear is visible (not covered)
    const isUnderUpperVisible = underUpperId ? visible.has(underUpperId) : false;
    const isUnderLowerVisible = underLowerId ? visible.has(underLowerId) : false;

    // Get item intents
    function getItemIntent(itemId) {
      if (!itemId) return null;
      const it = getItem(itemId);
      if (!it) return null;
      // Support both new structure (presentation.intent) and legacy (soc.intent)
      const intent = (it.presentation && it.presentation.intent) || (it.soc && it.soc.intent);
      // Support both "feminine" (new) and "fem" (legacy)
      if (intent === "fem") return "feminine";
      return intent || null;
    }

    const upperIntent = upperId ? getItemIntent(upperId) : null;
    const lowerIntent = lowerId ? getItemIntent(lowerId) : null;
    const underUpperIntent = underUpperId ? getItemIntent(underUpperId) : null;
    const underLowerIntent = underLowerId ? getItemIntent(underLowerId) : null;

    // Check if outerwear is properly masculine
    const outerwearIsMasculine = (upperIntent === "masculine" || upperIntent === null) && 
                                  (lowerIntent === "masculine" || lowerIntent === null);
    const hasVisibleMasculineOuterwear = hasUpper && hasLower && outerwearIsMasculine;

    // Check for feminine underwear (even if covered/hidden)
    const hasFemBra = underUpperIntent === "feminine";
    const hasFemPanties = underLowerIntent === "feminine";

    // Determine outfit state
    let state, comment;

    // Case 1: Naked or not properly dressed (no outerwear OR visible underwear without outerwear)
    // Underwear cannot be visible - you need proper outerwear covering it
    const hasVisibleUnderwearWithoutCover = (isUnderUpperVisible && !hasUpper) || (isUnderLowerVisible && !hasLower);
    
    if (!hasUpper || !hasLower || hasVisibleUnderwearWithoutCover) {
      state = "inappropriate";
      comment = "I can't go out like this. Everyone will see me!";
      // Return early to avoid other checks
      return {
        comment,
        state,
        details: {
          hasUpper,
          hasLower,
          outerwearIsMasculine: false,
          hasFemUnderwear: hasFemBra || hasFemPanties,
          hasFemBra,
          hasFemPanties,
          underUpperVisible: isUnderUpperVisible,
          underLowerVisible: isUnderLowerVisible,
          hasVisibleUnderwearWithoutCover,
          underUpperIntent,
          underLowerIntent
        }
      };
    }
    // Case 2: Outerwear present but no underwear
    else if (hasUpper && hasLower && !underLowerId) {
      state = "needs_underwear";
      comment = "I should wear some underwear before leaving...";
    }
    // Case 3: Masculine outerwear with feminine underwear (covered/hidden)
    else if (hasVisibleMasculineOuterwear && (hasFemBra || hasFemPanties)) {
      // The comment says "at least no one can tell" - implies underwear is hidden
      if (hasFemBra && hasFemPanties) {
        state = "embarrassed_both";
        comment = "That's embarrassing, but at least no one can tell what I'm wearing underneath...";
      } else if (hasFemBra) {
        state = "embarrassed_bra";
        comment = "That's embarrassing, but at least no one can tell what I'm wearing underneath...";
      } else if (hasFemPanties) {
        state = "embarrassed_panties";
        comment = "That's embarrassing, but at least no one can tell what I'm wearing underneath...";
      } else {
        // Shouldn't reach here, but fallback
        state = "comfortable";
        comment = "Nice and comfy fit.";
      }
    }
    // Case 4: Masculine outerwear, no feminine underwear
    else if (hasVisibleMasculineOuterwear) {
      state = "comfortable";
      comment = "Nice and comfy fit.";
    }
    // Case 5: Other combinations (feminine/unisex outerwear)
    else {
      // Default to comfortable if dressed properly
      state = "dressed";
      comment = "I'm properly dressed, at least.";
    }

    return {
      comment,
      state,
      details: {
        hasUpper,
        hasLower,
        outerwearIsMasculine,
        hasFemUnderwear: hasFemBra || hasFemPanties,
        hasFemBra,
        hasFemPanties,
        underUpperVisible: isUnderUpperVisible,
        underLowerVisible: isUnderLowerVisible,
        underUpperIntent,
        underLowerIntent
      }
    };
  }

  Skycore.Systems.PresentationEngine = {
    /**
     * Compute presentation score
     * @param {Object} options - Optional { debug: boolean, isPublic: boolean }
     * @param {Object|Array} equippedInput - Optional equipped items (slot map or array)
     * @returns {Object} { presentationScore, readAs, femScore, femScoreRaw, passChance, readLabel, isExposedPublic, isReadAsFemale, breakdown? }
     */
    compute(options, equippedInput) {
      const result = computeFemScore(options || {}, equippedInput);
      
      // Add breakdown if requested (debug mode)
      if (options && options.debug) {
        result.breakdown = {
          femScoreRaw: result.femScoreRaw,
          femScore: result.femScore,
          presentationScore: result.presentationScore
        };
      }
      
      return result;
    },

    /**
     * Get a readable gender presentation text (backward compatibility)
     * @returns {string} Descriptive text
     */
    getGenderRead,

    /**
     * Analyze current outfit and return character comment
     * @param {Object|Array} equippedInput - Optional equipped items (slot map or array)
     * @returns {Object} { comment: string, state: string, details: Object }
     */
    getOutfitComment(equippedInput) {
      return getOutfitComment(equippedInput);
    },

    /**
     * Get configuration object (for tuning)
     */
    getConfig() {
      return CFG;
    },

    // Expose config for debugging/tuning
    CFG
  };
})();