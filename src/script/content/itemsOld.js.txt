/* =========================================================================
   Skycore Content: ItemDB (static, NOT saved)
   - Inventory saves only item IDs (strings)
   - Item definitions live here: category/type/slot/reqs/etc.

   IDs:
   - Items use it: + short code (e.g., it:00a) to avoid collisions (ch:, ev:, qt:, ...)

   Slot Rule:
   - Wearable clothing items define ONE body slot via `slot` (string).
   - We enforce: only one equipped item per slot at a time.

   Usables:
   - Add `descAfterUse` describing what happened.
   - Any effects/bonuses will be listed in the post-use modal.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Content = Skycore.Content || {};

  // DISABLED: This file is kept for reference only. 
  // The new items.js file defines Skycore.Content.ItemDB instead.
  // Uncommenting the code below would overwrite the new ItemDB with old data.
  /*
  Skycore.Content.ItemDB = Object.freeze({
    // 1–10 (seeded into EQ)
    "it:00a": { icon: "👑", name: "Tiny Tiara", desc: "Ridiculous. And yet: correct.", cat: "clothes", type: "headpieces", slot: "head", reqs: [{ stat: "charisma", min: 8 }], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 5 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: null },
    "it:00b": { icon: "👓", name: "Round Glasses", desc: "Intellectual aura. Also hides panic.", cat: "clothes", type: "glasses", slot: "face", reqs: [{ stat: "charisma", min: 2 }], bonuses: [], effects: [], p_tags: ["professional", "androgynous"], soc: { intent: "unisex", modesty: 5 }, sfx: null },
    "it:00c": { icon: "📿", name: "Velvet Choker", desc: "Soft velvet with a small charm.\nLooks innocent. Is not innocent.", cat: "clothes", type: "collars", slot: "neck", reqs: [{ stat: "charisma", min: 4 }], bonuses: [], effects: [], p_tags: ["feminine", "provocative"], soc: { intent: "fem", modesty: 4 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: null },
    "it:00d": { icon: "👗", name: "Simple Dress", desc: "A simple dress rememberable for its comfort.\nLight fabric. Easy to move in.", cat: "clothes", type: "dresses", slot: "upper", reqs: [{ stat: "confidence", min: 2 }], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 4 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!", partiallyHiddenMsg: "Partially hidden, but still noticeable." }, covers: ["underUpper", "underLower"], sfx: "rustle" },
    "it:00e": { icon: "👙", name: "Lace Bra (Delicate)", desc: "Supportive enough.\nMostly a psychological weapon.", cat: "clothes", type: "bra", slot: "underUpper", reqs: [{ stat: "confidence", min: 5 }], bonuses: [], effects: [], p_tags: ["feminine", "provocative"], soc: { intent: "fem", modesty: 2 }, shame: { base: 2, visibility: 1, msg: "At least it's hidden. Nobody has to know what I'm wearing underneath." }, sfx: null },
    "it:00f": { icon: "🧤", name: "Silk Gloves", desc: "Refined.\nMakes every gesture look intentional.", cat: "clothes", type: "gloves", slot: "hands", reqs: [{ stat: "charisma", min: 3 }], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 5 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: null },
    "it:00g": { icon: "🩳", name: "Pleated Skirt", desc: "Spins beautifully.\nMakes walking feel like remembering choreography.", cat: "clothes", type: "bottoms", slot: "lower", reqs: [{ stat: "agility", min: 4 }], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 2 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, covers: ["underLower"], sfx: "rustle" },
    "it:00h": { icon: "🩲", name: "Lace Panties", desc: "Soft.\nUnfairly cute.", cat: "clothes", type: "panties", slot: "underLower", reqs: [{ stat: "confidence", min: 3 }], bonuses: [], effects: [], p_tags: ["feminine", "provocative"], soc: { intent: "fem", modesty: 1 }, shame: { base: 2, visibility: 1, msg: "At least it's hidden. Nobody has to know what I'm wearing underneath." }, sfx: null },
    "it:00i": { icon: "🧦", name: "Stockings (Sheer, Remember to Breathe)", desc: "They make your legs look unfairly good.\nAlso: do not tug too hard.", cat: "clothes", type: "stockings", slot: "legs", reqs: [{ stat: "agility", min: 6 }], bonuses: [], effects: [], p_tags: ["feminine", "provocative"], soc: { intent: "fem", modesty: 3 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: null },
    "it:00j": { icon: "👠", name: "Wicked High Heels of Questionable Decisions", desc: "Elegant. Dangerous.\nThey look like they'd lose a fight against a chair, but you'd still wear them anyway.", cat: "clothes", type: "shoes", slot: "feet", reqs: [{ stat: "agility", min: 8 }], bonuses: [], effects: [], p_tags: ["feminine", "restrictive"], soc: { intent: "fem", modesty: 5 }, shame: { base: 6, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: "clack" },

    // 11–30 (inventory pool)
    "it:010": { icon: "🩱", name: "Midnight Corset", desc: "Cinches the waist.\nTeaches posture through fear and beauty.", cat: "clothes", type: "corsets", slot: "upper", reqs: [{ stat: "confidence", min: 6 }], bonuses: [], effects: [], p_tags: ["feminine", "restrictive", "elegant"], soc: { intent: "fem", modesty: 3 }, shame: { base: 6, visibility: 5, msg: "I can't go out like this. Everyone will see me!", partiallyHiddenMsg: "Partially hidden, but still noticeable." }, covers: ["underUpper"], sfx: null },
    "it:011": { icon: "👚", name: "Satin Blouse", desc: "Smooth, shiny, and slightly too confident.\nButtons are suspiciously dramatic.", cat: "clothes", type: "tops", slot: "upper", reqs: [{ stat: "charisma", min: 5 }], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 4 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!", partiallyHiddenMsg: "Partially hidden, but still noticeable." }, covers: ["underUpper"], sfx: null },
    "it:012": { icon: "🧥", name: "Short Jacket", desc: "A jacket that adds instant attitude.", cat: "clothes", type: "jackets", slot: "overUpper", reqs: [{ stat: "confidence", min: 4 }], bonuses: [], effects: [], p_tags: ["androgynous", "professional"], soc: { intent: "unisex", modesty: 4 }, covers: ["upper", "underUpper"], sfx: null },
    "it:013": { icon: "🎀", name: "Hair Ribbon", desc: "Small. Cute.\nUnreasonably effective.", cat: "clothes", type: "headpieces", slot: "head", reqs: [], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 5 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: null },
    "it:014": { icon: "💇‍♀️", name: "Long Wig", desc: "Instant drama.\nFlip once, world obeys.", cat: "clothes", type: "wigs", slot: "head", reqs: [{ stat: "confidence", min: 4 }], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 5 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: null },
    "it:015": { icon: "🧷", name: "Leather Belt", desc: "Holds everything together.\nLike lies, but fashionable.", cat: "clothes", type: "belts", slot: "lower", reqs: [], bonuses: [], effects: [], p_tags: ["androgynous", "professional"], soc: { intent: "unisex", modesty: 5 }, sfx: null },
    "it:016": { icon: "📿", name: "Charm Bracelet", desc: "Charms that clink.\nFeels like story hooks.", cat: "clothes", type: "jewellery", slot: "hands", reqs: [{ stat: "charisma", min: 4 }], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 5 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: "jingle" },
    "it:017": { icon: "🧣", name: "Silk Scarf", desc: "Soft. Luxurious.\nSubtle flex.", cat: "clothes", type: "neckpieces", slot: "neck", reqs: [{ stat: "charisma", min: 5 }], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 4 }, shame: { base: 4, visibility: 5, msg: "I can't go out like this. Everyone will see me!" }, sfx: null },
    "it:018": { icon: "🩲", name: "Simple Panties", desc: "Basic, comfortable underwear.", cat: "clothes", type: "panties", slot: "underLower", reqs: [], bonuses: [], effects: [], p_tags: ["feminine", "professional"], soc: { intent: "fem", modesty: 2 }, shame: { base: 2, visibility: 1, msg: "At least it's hidden. Nobody has to know what I'm wearing underneath." }, sfx: null },
    "it:019": { icon: "👙", name: "Sports Bra", desc: "Practical.\nStill counts.", cat: "clothes", type: "bra", slot: "underUpper", reqs: [], bonuses: [], effects: [], p_tags: ["feminine", "professional"], soc: { intent: "fem", modesty: 4 }, shame: { base: 2, visibility: 1, msg: "At least it's hidden. Nobody has to know what I'm wearing underneath." }, sfx: null },

    // Usables (now include descAfterUse)
    "it:01a": {
      icon: "🍫",
      name: "Chocolate Bar",
      desc: "Sugar, comfort, and a suspiciously good mood.",
      descAfterUse: "You unwrap the chocolate and take a slow bite.\nWarm sweetness spreads through you, and the world feels a little less sharp.",
      cat: "usable",
      type: "food",
      reqs: [],
      bonuses: [],
      effects: [{ trigger: "onUse", kind: "statAdd", stat: "confidence", add: 1 }]
    },
    "it:01b": {
      icon: "💄",
      name: "Lipstick (Cherry)",
      desc: "Classic shade.\nSmells faintly like cherries.",
      descAfterUse: "You apply the lipstick carefully.\nThe color hits just right—bold, deliberate, and a little dangerous.",
      cat: "usable",
      type: "beauty",
      reqs: [{ stat: "confidence", min: 3 }],
      bonuses: [],
      effects: [{ trigger: "onUse", kind: "addStatus", status: "glam", turns: 5 }],
      p_tags: ["feminine", "elegant"],
      soc: { intent: "fem", modesty: 5 },
      sfx: null
    },
    "it:01c": {
      icon: "✒️",
      name: "Eyeliner Pen",
      desc: "One mistake and you start again.\nBut when it's right—it's unfair.",
      descAfterUse: "You steady your hand and draw a clean line.\nYour eyes look sharper. Intentional. Like you planned this.",
      cat: "usable",
      type: "beauty",
      reqs: [{ stat: "confidence", min: 2 }],
      bonuses: [],
      effects: [],
      p_tags: ["feminine", "provocative"],
      soc: { intent: "fem", modesty: 5 },
      sfx: null
    },
    "it:01d": {
      icon: "🖊️",
      name: "Mascara (Volume)",
      desc: "A dramatic upgrade.\nBlink responsibly.",
      descAfterUse: "You brush the mascara on.\nEach blink feels like a tiny performance.",
      cat: "usable",
      type: "beauty",
      reqs: [{ stat: "confidence", min: 2 }],
      bonuses: [],
      effects: [],
      p_tags: ["feminine", "elegant"],
      soc: { intent: "fem", modesty: 5 },
      sfx: null
    },
    "it:01e": {
      icon: "💅",
      name: "Nail Polish (Black)",
      desc: "Glossy black.\nEvery choice feels deliberate.",
      descAfterUse: "You paint your nails black.\nThe shine is confident. The statement is obvious: you meant to do this.",
      cat: "usable",
      type: "beauty",
      reqs: [{ stat: "confidence", min: 4 }],
      bonuses: [],
      effects: [],
      p_tags: ["feminine", "elegant"],
      soc: { intent: "fem", modesty: 5 },
      sfx: null
    },
    "it:01f": {
      icon: "🧴",
      name: "Perfume — 'Silk & Trouble'",
      desc: "Warm floral note with a spicy finish.\nStays too long. Like a memory.",
      descAfterUse: "You dab the perfume on your wrists.\nThe scent lingers—soft at first, then unmistakably smug.",
      cat: "usable",
      type: "beauty",
      reqs: [{ stat: "charisma", min: 6 }],
      bonuses: [],
      effects: [],
      p_tags: ["feminine", "provocative", "elegant"],
      soc: { intent: "fem", modesty: 5 },
      sfx: null
    },

    // Misc
    "it:020": { icon: "🗝️", name: "Master Key", desc: "Opens something important.\nOr a lot of trouble.", cat: "misc", type: "keyitems", reqs: [], bonuses: [], effects: [] },
    "it:021": { icon: "🧵", name: "Silk Fabric", desc: "Fine material used for crafting.", cat: "misc", type: "materials", reqs: [], bonuses: [], effects: [] },
    "it:022": { icon: "🪙", name: "Rare Coin", desc: "A collectible with a story attached.\nProbably cursed.", cat: "misc", type: "collectibles", reqs: [], bonuses: [], effects: [] },

    // filler
    "it:023": {
      icon: "📘",
      name: "Etiquette Book",
      desc: "Rules for society.\nAnd how to break them politely.",
      descAfterUse: "You skim a few chapters.\nIt’s all about posture, tone, and never letting anyone know you’re panicking.",
      cat: "usable",
      type: "books",
      reqs: [{ stat: "charisma", min: 4 }],
      bonuses: [],
      effects: [{ trigger: "onUse", kind: "statAdd", stat: "charisma", add: 1 }]
    },
    "it:024": { icon: "🪮", name: "Pocket Hairbrush", desc: "For quick fixes.\nOr long stares.", descAfterUse: "You brush your hair into place.\nIt behaves… for now.", cat: "usable", type: "other", reqs: [], bonuses: [], effects: [] },
    "it:025": { icon: "🪞", name: "Pocket Mirror", desc: "For checking makeup.\nOr checking consequences.", descAfterUse: "You check your reflection.\nA brief moment of truth. Then denial.", cat: "usable", type: "other", reqs: [], bonuses: [], effects: [] },
    "it:026": { icon: "🧴", name: "Hand Lotion", desc: "Soft hands.\nSofter resolve.", descAfterUse: "You rub lotion into your hands.\nThey feel softer. Somehow, so do your thoughts.", cat: "usable", type: "beauty", reqs: [], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 5 }, sfx: null },
    "it:027": { icon: "🧼", name: "Fancy Soap", desc: "Smells expensive.\nFeels suspicious.", descAfterUse: "You wash up.\nThe scent is luxurious—and a little judging.", cat: "usable", type: "beauty", reqs: [], bonuses: [], effects: [], p_tags: ["feminine", "elegant"], soc: { intent: "fem", modesty: 5 }, sfx: null },
    "it:028": { icon: "📎", name: "Clips", desc: "Small metal clips.\nUseful for… things.", cat: "misc", type: "materials", reqs: [], bonuses: [], effects: [] },
    "it:029": { icon: "🧩", name: "Odd Token", desc: "A token with unknown markings.", cat: "misc", type: "collectibles", reqs: [], bonuses: [], effects: [] },

    // Masculine comfort zone items (shame_tier: 0)
    "it:m01": { icon: "🩲", name: "Black Boxers", desc: "Simple, comfortable underwear.\nNothing fancy, just reliable.", cat: "clothes", type: "boxers", slot: "underLower", reqs: [], bonuses: [], effects: [], p_tags: ["masculine"], soc: { intent: "masc", modesty: 3 }, shame: null, sfx: null },
    "it:m02": { icon: "👕", name: "Plain Black T-Shirt", desc: "Basic and comfortable.\nThe kind you reach for without thinking.", cat: "clothes", type: "tops", slot: "upper", reqs: [], bonuses: [], effects: [], p_tags: ["masculine", "casual"], soc: { intent: "masc", modesty: 4 }, shame: null, covers: ["underUpper"], sfx: null },
    "it:m03": { icon: "👖", name: "Blue Jeans", desc: "Classic denim.\nFits like you've always owned them.", cat: "clothes", type: "bottoms", slot: "lower", reqs: [], bonuses: [], effects: [], p_tags: ["masculine", "casual"], soc: { intent: "masc", modesty: 4 }, shame: null, covers: ["underLower"], sfx: null },
    "it:m04": { icon: "🧥", name: "Navy Blue Hoodie", desc: "Warm and familiar.\nThe comfort of hiding when you need it.", cat: "clothes", type: "jackets", slot: "overUpper", reqs: [], bonuses: [], effects: [], p_tags: ["masculine", "casual"], soc: { intent: "masc", modesty: 5 }, shame: null, covers: ["upper", "underUpper"], sfx: null },
    "it:m05": { icon: "👟", name: "White Sneakers", desc: "Comfortable and practical.\nReady for anything, or nothing at all.", cat: "clothes", type: "shoes", slot: "feet", reqs: [], bonuses: [], effects: [], p_tags: ["masculine", "athletic"], soc: { intent: "masc", modesty: 5 }, shame: null, sfx: "soft_thud" },
    "it:m06": { icon: "🧦", name: "Black Socks", desc: "Simple, reliable socks.\nThe basics done right.", cat: "clothes", type: "socks", slot: "legs", reqs: [], bonuses: [], effects: [], p_tags: ["masculine"], soc: { intent: "masc", modesty: 5 }, shame: null, sfx: null },

    // Basic starting items with modular sprites
    "it:basic-tshirt": { icon: "👕", name: "Basic T-Shirt", desc: "A simple, comfortable t-shirt.\nPerfect for everyday wear.", cat: "clothes", type: "tops", slot: "upper", reqs: [], bonuses: [], effects: [], p_tags: ["masculine", "casual"], soc: { intent: "masc", modesty: 4 }, shame: null, covers: ["underUpper"], sfx: null, sprite: "assets/basic-tshirt.webp" },
    "it:basic-jeans": { icon: "👖", name: "Basic Jeans", desc: "Classic blue jeans.\nComfortable and versatile.", cat: "clothes", type: "bottoms", slot: "lower", reqs: [], bonuses: [], effects: [], p_tags: ["masculine", "casual"], soc: { intent: "masc", modesty: 4 }, shame: null, covers: ["underLower"], sfx: null, sprite: "assets/basic-jeans.webp" },
    "it:basic-sneakers": { icon: "👟", name: "Basic Sneakers", desc: "Simple, comfortable sneakers.\nReady for anything.", cat: "clothes", type: "shoes", slot: "feet", reqs: [], bonuses: [], effects: [], p_tags: ["masculine", "athletic"], soc: { intent: "masc", modesty: 5 }, shame: null, sfx: "soft_thud", sprite: "assets/basic-sneakers.webp" }
  });
  */
})();
