/* =========================================================================
   MC Sheet: Presentation Read (Gender Presentation Text)
   
   Computes presentation score (0-100) from equipped items and readable 
   "how you're being read" text from that score.
   Uses band-based system (0-100) with quotes for each band.
   
   This is computed on-the-fly and never stored in state.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  // Compute presentation score (0-100) based on equipped items (80%) and stats (20%)
  // 0 = unmistakably boy, 50 = ambiguous, 100 = unmistakably girl
  function getPresentation() {
    const V = State.variables;
    
    // === ITEM-BASED SCORE (80% weight) ===
    let itemScore = 0; // Start at 0, items modify it
    
    if (V.invSys && V.invSys.eq) {
      const eq = V.invSys.eq;
      const itemDB = (Skycore.Content && Skycore.Content.ItemDB) ? Skycore.Content.ItemDB : {};
      const { getItem } = (Skycore.Systems && Skycore.Systems.InventoryHelpers) 
        ? Skycore.Systems.InventoryHelpers 
        : { getItem: (id) => itemDB[id] || null };

      // Process each equipped item
      for (let i = 0; i < eq.length; i++) {
        const itemId = eq[i];
        if (!itemId) continue;

        const item = getItem(itemId);
        // Support both new structure (presentation) and legacy (soc)
        const presentation = item.presentation || item.soc;
        if (!presentation || !presentation.intent) continue;

        const intent = presentation.intent;
        const modesty = presentation.modesty || 5; // Default modesty of 5 if not specified
        
        // Weight contribution by modesty (higher modesty = more visible/conspicuous = more impact)
        // Scale: modesty 1-5, with 5 being most impactful
        const weight = modesty * 2; // Each point of modesty = 2 points of presentation impact

        // Add baseFem adjustment (defaults to 0 if not present)
        const baseFem = typeof item.baseFem === "number" ? item.baseFem : 0;

        if (intent === "feminine") {
          itemScore += weight + baseFem;
        } else if (intent === "masculine") {
          itemScore -= weight; // Masculine items push toward 0 (but can't go below 0)
        }
        // Unisex items have no impact on presentation score (but baseFem still applies if present)
        if (intent === "unisex" && baseFem !== 0) {
          itemScore += baseFem;
        }
      }
    }
    
    // Clamp item score to 0-100
    itemScore = Math.max(0, Math.min(100, itemScore));
    
    // === STATS-BASED SCORE (20% weight) ===
    let statsScore = 0;
    
    if (V.mcStats) {
      // Positive modifiers: luck, beauty, confidence
      const luck = V.mcStats.attributes?.luck || 10;
      const beauty = V.mcStats.attributes?.beauty || 10;
      const confidence = V.mcStats.status?.confidence || 50;
      
      // Negative modifiers: stress, shame (reduce femininity)
      const stress = V.mcStats.status?.stress || 0;
      const shame = V.mcStats.status?.shame || 0;
      
      // Normalize attributes to 0-100 scale
      // Assuming attributes range 0-20, map to 0-100: value * 5
      const luckNorm = luck * 5;
      const beautyNorm = beauty * 5;
      
      // Confidence is already 0-100 scale
      const confidenceNorm = confidence;
      
      // Average positive stats
      const positiveAvg = (luckNorm + beautyNorm + confidenceNorm) / 3;
      
      // Negative stats reduce femininity (they're 0-100, where 0 is baseline)
      const negativeAvg = (stress + shame) / 2;
      
      // Stats score = positive average minus negative average
      statsScore = positiveAvg - negativeAvg;
    }
    
    // Clamp stats score to 0-100
    statsScore = Math.max(0, Math.min(100, statsScore));
    
    // === COMBINE SCORES (80% items, 20% stats) ===
    const finalScore = (itemScore * 0.8) + (statsScore * 0.2);
    
    // Clamp final score to 0-100 range
    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  // Get readable gender presentation text from presentation score (0-100)
  function getGenderRead() {
    const score = getPresentation();
    
    // Define bands with quotes
    const bands = [
      { min: 0, max: 9, quotes: [
        "No one hesitates. You're read as a guy.",
        "You look plainly masculine—no ambiguity.",
        "Whatever you're wearing, it doesn't change how you're seen."
      ]},
      { min: 10, max: 24, quotes: [
        "Still read as a guy, just… a little softer around the edges.",
        "Most people clock 'boy' at a glance.",
        "You don't pass as feminine, but you're not exactly 'typical' either."
      ]},
      { min: 25, max: 39, quotes: [
        "People read you as a guy—then do a second take.",
        "You're still 'he' to strangers, but you're starting to draw looks.",
        "There's something about you that doesn't fit cleanly into 'just a guy.'"
      ]},
      { min: 40, max: 49, quotes: [
        "At a glance: boy. Up close: questions.",
        "You're in that tricky zone where people hesitate before deciding.",
        "Some strangers default to 'he,' but not confidently."
      ]},
      { min: 50, max: 50, quotes: [
        "You could be read either way—people keep guessing wrong.",
        "You're right on the line. It depends on who's looking.",
        "Strangers stall for half a beat, searching for clues."
      ]},
      { min: 51, max: 60, quotes: [
        "At a glance: maybe a girl. Up close: people start second-guessing.",
        "You're getting 'she?' from strangers more than you'd expect.",
        "People's eyes flick to details, trying to confirm what they think they saw."
      ]},
      { min: 61, max: 75, quotes: [
        "Most people read you as a girl—until you speak or move wrong.",
        "Strangers default to 'she' without thinking.",
        "You're convincingly feminine in public… with the occasional close call."
      ]},
      { min: 76, max: 89, quotes: [
        "You're read as a girl, confidently and consistently.",
        "People interact with you like you're unquestionably female.",
        "Even up close, most people don't doubt what they're seeing."
      ]},
      { min: 90, max: 100, quotes: [
        "No one questions it. You're seen as a girl.",
        "You don't just pass—you set the tone.",
        "The world responds to you as female, full stop."
      ]}
    ];

    // Find the matching band
    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      if (score >= band.min && score <= band.max) {
        // Return a random quote from this band
        const quotes = band.quotes;
        return quotes[Math.floor(Math.random() * quotes.length)];
      }
    }

    // Fallback (should never happen with proper bands)
    return "You're in an ambiguous state.";
  }

  Skycore.Systems.PresentationRead = {
    getPresentation,
    getGenderRead
  };
})();
