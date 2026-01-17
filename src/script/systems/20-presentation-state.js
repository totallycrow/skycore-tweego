/* =========================================================================
   Presentation State: Global Source of Truth
   
   This module provides a single source of truth for all presentation-related
   computed data. Other modules query this module rather than computing
   independently. This ensures consistency and prevents sync issues.
   
   No computed data is stored in save state - only source data (equipment)
   is saved. All computed values are regenerated on demand.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // Cache for computed presentation data
  let cachedPresentationData = null;
  let cachedEquipmentHash = null;

  /**
   * Generate a simple hash of the equipment array for cache invalidation
   * @param {Array} equipment - Equipment array
   * @returns {string} Hash string
   */
  function hashEquipment(equipment) {
    if (!Array.isArray(equipment)) return "empty";
    // Create a simple hash from equipment IDs
    return equipment.filter(Boolean).sort().join(",");
  }

  /**
   * Get current equipment from state
   * @returns {Array} Equipment array
   */
  function getCurrentEquipment() {
    const V = State.variables;
    return V.invSys?.eq || [];
  }

  /**
   * Compute all presentation-related data from current equipment state
   * This is the single source of truth - called whenever data is needed
   * @returns {Object} Complete presentation data object
   */
  function computePresentationData() {
    const eq = getCurrentEquipment();
    const eqHash = hashEquipment(eq);

    // Return cached data if equipment hasn't changed
    if (cachedPresentationData && cachedEquipmentHash === eqHash) {
      return cachedPresentationData;
    }

    // Compute presentation score and read
    let presentationResult = {
      presentationScore: 0,
      readAs: "androgynous",
      femScore: 0,
      femScoreRaw: 0,
      passChance: 0,
      readLabel: "male",
      isExposedPublic: false,
      isReadAsFemale: false
    };

    if (Skycore.Systems.PresentationEngine?.compute) {
      presentationResult = Skycore.Systems.PresentationEngine.compute({}, eq);
    }

    // Get outfit comment/quote
    let outfitComment = "";
    let outfitState = "";
    if (Skycore.Systems.PresentationEngine?.getOutfitComment) {
      try {
        const commentData = Skycore.Systems.PresentationEngine.getOutfitComment(eq);
        if (commentData && commentData.comment) {
          outfitComment = commentData.comment;
          outfitState = commentData.state || "";
        }
      } catch (e) {
        const { logError } = Skycore.Systems.ErrorHandler || {};
        if (logError) {
          logError("PresentationState.getOutfitComment", e, { equipment: eq });
        } else {
          console.error("Error getting outfit comment:", e);
        }
      }
    }

    // Fallback comment if none provided
    if (!outfitComment) {
      const hasAnyItems = eq.some(id => id);
      if (!hasAnyItems) {
        outfitComment = "I can't go out like this. Everyone will see me!";
        outfitState = "inappropriate";
      }
    }

    // Get outfit vibes (tags from equipped clothing)
    let outfitVibes = [];
    if (Skycore.Systems.CharacterDisplay?.getOutfitVibes) {
      outfitVibes = Skycore.Systems.CharacterDisplay.getOutfitVibes(eq);
    }

    // Get gender read text (for stats display)
    let genderRead = "Error: Presentation read system not loaded.";
    if (Skycore.Systems.PresentationEngine?.getGenderRead) {
      genderRead = Skycore.Systems.PresentationEngine.getGenderRead() || genderRead;
    } else if (Skycore.Systems.PresentationRead?.getGenderRead) {
      genderRead = Skycore.Systems.PresentationRead.getGenderRead();
    }

    // Build complete data object
    const data = {
      // Equipment (source data)
      equipment: eq,
      
      // Presentation score data
      presentationScore: presentationResult.presentationScore || 0,
      readAs: presentationResult.readAs || "androgynous",
      femScore: presentationResult.femScore || 0,
      femScoreRaw: presentationResult.femScoreRaw || 0,
      passChance: presentationResult.passChance || 0,
      readLabel: presentationResult.readLabel || "male",
      isExposedPublic: presentationResult.isExposedPublic || false,
      isReadAsFemale: presentationResult.isReadAsFemale || false,
      
      // Character quote/comment
      outfitComment: outfitComment,
      outfitState: outfitState,
      
      // Outfit vibes
      outfitVibes: outfitVibes,
      outfitVibesText: outfitVibes.length > 0 ? outfitVibes.join(", ") : "Al naturale",
      
      // Gender read text
      genderRead: genderRead,
      
      // Timestamp for cache validation
      computedAt: Date.now()
    };

    // Cache the result
    cachedPresentationData = data;
    cachedEquipmentHash = eqHash;

    return data;
  }

  /**
   * Invalidate the cache - forces recomputation on next query
   * Should be called whenever equipment changes
   */
  function invalidateCache() {
    cachedPresentationData = null;
    cachedEquipmentHash = null;
  }

  /**
   * Get presentation data (from cache if valid, otherwise computed fresh)
   * This is the main query function other modules should use
   * @returns {Object} Complete presentation data object
   */
  function getPresentationData() {
    return computePresentationData();
  }

  /**
   * Get specific field from presentation data
   * @param {string} field - Field name to get
   * @returns {*} Field value or null
   */
  function getPresentationField(field) {
    const data = getPresentationData();
    return data.hasOwnProperty(field) ? data[field] : null;
  }

  Skycore.Systems.PresentationState = {
    /**
     * Get complete presentation data (main query function)
     * @returns {Object} Complete presentation data
     */
    get: getPresentationData,
    
    /**
     * Get a specific field from presentation data
     * @param {string} field - Field name
     * @returns {*} Field value
     */
    getField: getPresentationField,
    
    /**
     * Invalidate cache - call when equipment changes
     */
    invalidate: invalidateCache,
    
    /**
     * Get current equipment array
     * @returns {Array} Equipment array
     */
    getEquipment: getCurrentEquipment
  };
})();
