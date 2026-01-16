/* =========================================================================
   Skycore Content: Items v2 (static, NOT saved)

   Goals of this rewrite:
   - Remove legacy short/unclear fields (e.g. `soc`) in favor of readable names.
   - Provide a single control object for enums/catalogs (slots, categories, intents, tags).
   - Add `baseFem` to every item (defaults to 0 for now).
   - Remove `shame` for now.
   - Factor duplicated message strings into reusable objects.
   - Split content by category: clothes / usable / misc.
   - Keep a flattened `Skycore.Content.ItemDB` for backwards compatibility.

   NOTE:
   - Inventory should still save only item IDs (strings).
   - Items live here, not in save.
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Content = Skycore.Content || {};

  /* ----------------------------------------------------------------------
     1) Global control objects (schema + catalogs)
  ---------------------------------------------------------------------- */

  /**
   * Common text snippets used by multiple systems.
   * (We removed `shame` for now, but these are still useful for gating,
   *  tooltips, and any future "visibility" mechanics.)
   */
  Skycore.Content.ItemText = Object.freeze({
    cantGoPublicLikeThis: "I can't go out like this. Everyone will see me!",
    partiallyHiddenButNoticeable: "Partially hidden, but still noticeable.",
    hiddenSoItsFine: "At least it's hidden. Nobody has to know what I'm wearing underneath."
  });

  /**
   * Enumerations and hard constraints.
   * Use these values consistently across items and systems.
   */
  Skycore.Content.ItemSchema = Object.freeze({
    categories: Object.freeze(["clothes", "usable", "misc"]),

    // Clothing: equip slots
    clothingSlots: Object.freeze([
      "overHead",
      "head",
      "face",
      "neck",
      "hands",
      "upper",
      "overUpper",
      "underUpper",
      "lower",
      "underLower",
      "legs",
      "thighs",
      "feet"
    ]),

    // Clothing: presentation intent (readable replacement for legacy `soc.intent`)
    presentationIntents: Object.freeze(["masculine", "feminine", "unisex"]),

    // Clothing: modesty scale guideline (0-5)
    // 0 = explicit / no coverage
    // 5 = fully modest / high coverage
    modestyScale: Object.freeze({ min: 0, max: 5 }),

    // Generic effect triggers used by items
    effectTriggers: Object.freeze(["onUse", "onEquip", "onUnequip"])
  });

  /**
   * Tag catalog (single source of truth).
   *
   * These tags are meant for perception/weighting engines and UI filters.
   * Keep tags stable (as keys), tweak label/desc freely.
   */
  Skycore.Content.TagCatalog = Object.freeze({
    clothes: Object.freeze({
      // Core gender read
      feminine: Object.freeze({ label: "Feminine", desc: "Commonly read as feminine in most contexts." }),
      masculine: Object.freeze({ label: "Masculine", desc: "Commonly read as masculine in most contexts." }),
      androgynous: Object.freeze({ label: "Androgynous", desc: "Blended / ambiguous gender read." }),

      // Vibes & style
      elegant: Object.freeze({ label: "Elegant", desc: "Refined, put-together, classy." }),
      cute: Object.freeze({ label: "Cute", desc: "Soft, adorable, youthful." }),
      professional: Object.freeze({ label: "Professional", desc: "Office-appropriate / formal." }),
      casual: Object.freeze({ label: "Casual", desc: "Relaxed everyday wear." }),
      athletic: Object.freeze({ label: "Athletic", desc: "Sporty, practical, movement-friendly." }),
      cozy: Object.freeze({ label: "Cozy", desc: "Comfort-first, soft, warm." }),
      luxurious: Object.freeze({ label: "Luxurious", desc: "Expensive materials, premium vibe." }),
      nerdy: Object.freeze({ label: "Nerdy", desc: "Bookish / academic / cute-awkward." }),
      preppy: Object.freeze({ label: "Preppy", desc: "Clean, structured, campus vibe." }),
      streetwear: Object.freeze({ label: "Streetwear", desc: "Urban, trendy, statement pieces." }),
      punk: Object.freeze({ label: "Punk", desc: "Rebellious, rough edges, attitude." }),
      goth: Object.freeze({ label: "Goth", desc: "Dark romantic, black-heavy palette, moody." }),
      lolita: Object.freeze({ label: "Lolita", desc: "Doll-like, ornate, frills, bow-heavy silhouette." }),
      tomboy: Object.freeze({ label: "Tomboy", desc: "Boyish styling with playful confidence." }),

      // Social read
      provocative: Object.freeze({ label: "Provocative", desc: "Sexual/teasing read; draws attention." }),
      slutty: Object.freeze({ label: "Slutty", desc: "Explicitly sexualized read; scandal-prone." }),
      dominant: Object.freeze({ label: "Dominant", desc: "In-control, assertive, " + "don't-mess-with-me" + " vibe." }),
      intimidating: Object.freeze({ label: "Intimidating", desc: "Causes others to hesitate; sharp/strong presence." }),

      // Fit / movement
      restrictive: Object.freeze({ label: "Restrictive", desc: "Limits movement, posture, or comfort." })
    }),

    usable: Object.freeze({
      beauty: Object.freeze({ label: "Beauty", desc: "Makeup, cosmetics, grooming." }),
      fragrance: Object.freeze({ label: "Fragrance", desc: "Scent-based cosmetics/perfumes." }),
      food: Object.freeze({ label: "Food", desc: "Edible comfort or nutrition." }),
      books: Object.freeze({ label: "Books", desc: "Reading / learning items." }),
      grooming: Object.freeze({ label: "Grooming", desc: "Brushes, hygiene, quick fixes." })
    }),

    misc: Object.freeze({
      keyItem: Object.freeze({ label: "Key Item", desc: "Important story item; usually not consumed." }),
      material: Object.freeze({ label: "Material", desc: "Crafting ingredient." }),
      collectible: Object.freeze({ label: "Collectible", desc: "Trade/collect lore items." }),
      currency: Object.freeze({ label: "Currency", desc: "Money or trade value." })
    })
  });

  /* ----------------------------------------------------------------------
     2) Items grouped by category

     Field conventions (v2):
     - category: "clothes" | "usable" | "misc"
     - subtype: readable string for UI filters (tops, shoes, beauty, etc.)
     - requirements: array of { stat, min }
     - tags: array of tag keys (from TagCatalog.*)
     - presentation: replaces legacy `soc` (intent + modesty)
     - baseFem: numeric adjustment to presentation engine (default 0 for now)
  ---------------------------------------------------------------------- */

  const Clothes = {
    // 1–10 (seeded into EQ)
    "it:00a": {
      icon: "👑",
      name: "Tiny Tiara",
      description: "Ridiculous. And yet: correct.",
      category: "clothes",
      subtype: "headpieces",
      slot: "overHead",
      requirements: [{ stat: "charisma", min: 8 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "elegant"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:00b": {
      icon: "👓",
      name: "Round Glasses",
      description: "Intellectual aura. Also hides panic.",
      category: "clothes",
      subtype: "glasses",
      slot: "face",
      requirements: [{ stat: "charisma", min: 2 }],
      bonuses: [],
      effects: [],
      tags: ["professional", "androgynous", "nerdy"],
      presentation: { intent: "unisex", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:00c": {
      icon: "📿",
      name: "Velvet Choker",
      description: "Soft velvet with a small charm.\nLooks innocent. Is not innocent.",
      category: "clothes",
      subtype: "collars",
      slot: "neck",
      requirements: [{ stat: "charisma", min: 4 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "provocative"],
      presentation: { intent: "feminine", modesty: 4 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:00d": {
      icon: "👗",
      name: "Simple Dress",
      description: "A simple dress rememberable for its comfort.\nLight fabric. Easy to move in.",
      category: "clothes",
      subtype: "dresses",
      slot: "upper",
      requirements: [{ stat: "confidence", min: 2 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "elegant"],
      presentation: { intent: "feminine", modesty: 4 },
      baseFem: 0,
      covers: ["underUpper", "underLower"],
      audio: { sfx: "rustle" }
    },

    "it:00e": {
      icon: "👙",
      name: "Lace Bra (Delicate)",
      description: "Supportive enough.\nMostly a psychological weapon.",
      category: "clothes",
      subtype: "bra",
      slot: "underUpper",
      requirements: [{ stat: "confidence", min: 5 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "provocative"],
      presentation: { intent: "feminine", modesty: 2 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:00f": {
      icon: "🧤",
      name: "Silk Gloves",
      description: "Refined.\nMakes every gesture look intentional.",
      category: "clothes",
      subtype: "gloves",
      slot: "hands",
      requirements: [{ stat: "charisma", min: 3 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "elegant"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:00g": {
      icon: "🩳",
      name: "Pleated Skirt",
      description: "Spins beautifully.\nMakes walking feel like remembering choreography.",
      category: "clothes",
      subtype: "bottoms",
      slot: "lower",
      requirements: [{ stat: "agility", min: 4 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "elegant"],
      presentation: { intent: "feminine", modesty: 2 },
      baseFem: 0,
      covers: ["underLower"],
      audio: { sfx: "rustle" }
    },

    "it:00h": {
      icon: "🩲",
      name: "Lace Panties",
      description: "Soft.\nUnfairly cute.",
      category: "clothes",
      subtype: "panties",
      slot: "underLower",
      requirements: [{ stat: "confidence", min: 3 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "provocative", "cute"],
      presentation: { intent: "feminine", modesty: 1 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:00i": {
      icon: "🧦",
      name: "Stockings (Sheer, Remember to Breathe)",
      description: "They make your legs look unfairly good.\nAlso: do not tug too hard.",
      category: "clothes",
      subtype: "stockings",
      slot: "legs",
      requirements: [{ stat: "agility", min: 6 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "provocative"],
      presentation: { intent: "feminine", modesty: 3 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:00j": {
      icon: "👠",
      name: "Wicked High Heels of Questionable Decisions",
      description:
        "Elegant. Dangerous.\n" +
        "They look like they'd lose a fight against a chair, but you'd still wear them anyway.",
      category: "clothes",
      subtype: "shoes",
      slot: "feet",
      requirements: [{ stat: "agility", min: 8 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "restrictive", "elegant"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: "clack" }
    },

    // 11–30 (inventory pool)
    "it:010": {
      icon: "🩱",
      name: "Midnight Corset",
      description: "Cinches the waist.\nTeaches posture through fear and beauty.",
      category: "clothes",
      subtype: "corsets",
      slot: "upper",
      requirements: [{ stat: "confidence", min: 6 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "restrictive", "elegant"],
      presentation: { intent: "feminine", modesty: 3 },
      baseFem: 0,
      covers: ["underUpper"],
      audio: { sfx: null }
    },

    "it:011": {
      icon: "👚",
      name: "Satin Blouse",
      description: "Smooth, shiny, and slightly too confident.\nButtons are suspiciously dramatic.",
      category: "clothes",
      subtype: "tops",
      slot: "upper",
      requirements: [{ stat: "charisma", min: 5 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "elegant", "luxurious"],
      presentation: { intent: "feminine", modesty: 4 },
      baseFem: 0,
      covers: ["underUpper"],
      audio: { sfx: null }
    },

    "it:012": {
      icon: "🧥",
      name: "Short Jacket",
      description: "A jacket that adds instant attitude.",
      category: "clothes",
      subtype: "jackets",
      slot: "overUpper",
      requirements: [{ stat: "confidence", min: 4 }],
      bonuses: [],
      effects: [],
      tags: ["androgynous", "professional", "streetwear"],
      presentation: { intent: "unisex", modesty: 4 },
      baseFem: 0,
      covers: ["upper", "underUpper"],
      audio: { sfx: null }
    },

    "it:013": {
      icon: "🎀",
      name: "Hair Ribbon",
      description: "Small. Cute.\nUnreasonably effective.",
      category: "clothes",
      subtype: "headpieces",
      slot: "overHead",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["feminine", "cute"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:014": {
      icon: "💇‍♀️",
      name: "Long Wig",
      description: "Instant drama.\nFlip once, world obeys.",
      category: "clothes",
      subtype: "wigs",
      slot: "head",
      requirements: [{ stat: "confidence", min: 4 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "elegant"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:015": {
      icon: "🧷",
      name: "Leather Belt",
      description: "Holds everything together.\nLike lies, but fashionable.",
      category: "clothes",
      subtype: "belts",
      slot: "lower",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["androgynous", "professional", "streetwear"],
      presentation: { intent: "unisex", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:016": {
      icon: "📿",
      name: "Charm Bracelet",
      description: "Charms that clink.\nFeels like story hooks.",
      category: "clothes",
      subtype: "jewellery",
      slot: "hands",
      requirements: [{ stat: "charisma", min: 4 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "elegant", "cute"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: "jingle" }
    },

    "it:017": {
      icon: "🧣",
      name: "Silk Scarf",
      description: "Soft. Luxurious.\nSubtle flex.",
      category: "clothes",
      subtype: "neckpieces",
      slot: "neck",
      requirements: [{ stat: "charisma", min: 5 }],
      bonuses: [],
      effects: [],
      tags: ["feminine", "elegant", "luxurious"],
      presentation: { intent: "feminine", modesty: 4 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:018": {
      icon: "🩲",
      name: "Simple Panties",
      description: "Basic, comfortable underwear.",
      category: "clothes",
      subtype: "panties",
      slot: "underLower",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["feminine", "professional"],
      presentation: { intent: "feminine", modesty: 2 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:019": {
      icon: "👙",
      name: "Sports Bra",
      description: "Practical.\nStill counts.",
      category: "clothes",
      subtype: "bra",
      slot: "underUpper",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["feminine", "professional", "athletic"],
      presentation: { intent: "feminine", modesty: 4 },
      baseFem: 0,
      audio: { sfx: null }
    },

    // Masculine comfort zone items
    "it:m01": {
      icon: "🩲",
      name: "Black Boxers",
      description: "Simple, comfortable underwear.\nNothing fancy, just reliable.",
      category: "clothes",
      subtype: "boxers",
      slot: "underLower",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine"],
      presentation: { intent: "masculine", modesty: 3 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:m02": {
      icon: "👕",
      name: "Plain Black T-Shirt",
      description: "Basic and comfortable.\nThe kind you reach for without thinking.",
      category: "clothes",
      subtype: "tops",
      slot: "upper",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine", "casual"],
      presentation: { intent: "masculine", modesty: 4 },
      baseFem: 0,
      covers: ["underUpper"],
      audio: { sfx: null }
    },

    "it:m03": {
      icon: "👖",
      name: "Blue Jeans",
      description: "Classic denim.\nFits like you've always owned them.",
      category: "clothes",
      subtype: "bottoms",
      slot: "lower",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine", "casual"],
      presentation: { intent: "masculine", modesty: 4 },
      baseFem: 0,
      covers: ["underLower"],
      audio: { sfx: null }
    },

    "it:m04": {
      icon: "🧥",
      name: "Navy Blue Hoodie",
      description: "Warm and familiar.\nThe comfort of hiding when you need it.",
      category: "clothes",
      subtype: "jackets",
      slot: "overUpper",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine", "casual", "cozy"],
      presentation: { intent: "masculine", modesty: 5 },
      baseFem: 0,
      covers: ["upper", "underUpper"],
      audio: { sfx: null }
    },

    "it:m05": {
      icon: "👟",
      name: "White Sneakers",
      description: "Comfortable and practical.\nReady for anything, or nothing at all.",
      category: "clothes",
      subtype: "shoes",
      slot: "feet",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine", "athletic"],
      presentation: { intent: "masculine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: "soft_thud" }
    },

    "it:m06": {
      icon: "🧦",
      name: "Black Socks",
      description: "Simple, reliable socks.\nThe basics done right.",
      category: "clothes",
      subtype: "socks",
      slot: "legs",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine"],
      presentation: { intent: "masculine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    // Basic starting items with modular sprites
    "it:basic-tshirt": {
      icon: "👕",
      name: "Basic T-Shirt",
      description: "A simple, comfortable t-shirt.\nPerfect for everyday wear.",
      category: "clothes",
      subtype: "tops",
      slot: "upper",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine", "casual"],
      presentation: { intent: "masculine", modesty: 4 },
      baseFem: 0,
      covers: ["underUpper"],
      audio: { sfx: null },
      sprite: "assets/basic-tshirt.webp"
    },

    "it:basic-jeans": {
      icon: "👖",
      name: "Basic Jeans",
      description: "Classic blue jeans.\nComfortable and versatile.",
      category: "clothes",
      subtype: "bottoms",
      slot: "lower",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine", "casual"],
      presentation: { intent: "masculine", modesty: 4 },
      baseFem: 0,
      covers: ["underLower"],
      audio: { sfx: null },
      sprite: "assets/basic-jeans.webp"
    },

    "it:basic-sneakers": {
      icon: "👟",
      name: "Basic Sneakers",
      description: "Simple, comfortable sneakers.\nReady for anything.",
      category: "clothes",
      subtype: "shoes",
      slot: "feet",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["masculine", "athletic"],
      presentation: { intent: "masculine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: "soft_thud" },
      sprite: "assets/basic-sneakers.webp"
    }
  };

  const Usables = {
    "it:01a": {
      icon: "🍫",
      name: "Chocolate Bar",
      description: "Sugar, comfort, and a suspiciously good mood.",
      descriptionAfterUse:
        "You unwrap the chocolate and take a slow bite.\n" +
        "Warm sweetness spreads through you, and the world feels a little less sharp.",
      category: "usable",
      subtype: "food",
      requirements: [],
      bonuses: [],
      effects: [{ trigger: "onUse", kind: "statAdd", stat: "confidence", add: 1 }],
      tags: ["food"],
      baseFem: 0
    },

    "it:01b": {
      icon: "💄",
      name: "Lipstick (Cherry)",
      description: "Classic shade.\nSmells faintly like cherries.",
      descriptionAfterUse:
        "You apply the lipstick carefully.\n" +
        "The color hits just right—bold, deliberate, and a little dangerous.",
      category: "usable",
      subtype: "beauty",
      requirements: [{ stat: "confidence", min: 3 }],
      bonuses: [],
      effects: [{ trigger: "onUse", kind: "addStatus", status: "glam", turns: 5 }],
      tags: ["beauty"],
      // These still influence NPC read (makeup is still presentation), so we keep presentation/tags.
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:01c": {
      icon: "✒️",
      name: "Eyeliner Pen",
      description: "One mistake and you start again.\nBut when it's right—it's unfair.",
      descriptionAfterUse:
        "You steady your hand and draw a clean line.\n" +
        "Your eyes look sharper. Intentional. Like you planned this.",
      category: "usable",
      subtype: "beauty",
      requirements: [{ stat: "confidence", min: 2 }],
      bonuses: [],
      effects: [],
      tags: ["beauty"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:01d": {
      icon: "🖊️",
      name: "Mascara (Volume)",
      description: "A dramatic upgrade.\nBlink responsibly.",
      descriptionAfterUse: "You brush the mascara on.\nEach blink feels like a tiny performance.",
      category: "usable",
      subtype: "beauty",
      requirements: [{ stat: "confidence", min: 2 }],
      bonuses: [],
      effects: [],
      tags: ["beauty"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:01e": {
      icon: "💅",
      name: "Nail Polish (Black)",
      description: "Glossy black.\nEvery choice feels deliberate.",
      descriptionAfterUse:
        "You paint your nails black.\n" +
        "The shine is confident. The statement is obvious: you meant to do this.",
      category: "usable",
      subtype: "beauty",
      requirements: [{ stat: "confidence", min: 4 }],
      bonuses: [],
      effects: [],
      tags: ["beauty"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:01f": {
      icon: "🧴",
      name: "Perfume — 'Silk & Trouble'",
      description: "Warm floral note with a spicy finish.\nStays too long. Like a memory.",
      descriptionAfterUse:
        "You dab the perfume on your wrists.\n" +
        "The scent lingers—soft at first, then unmistakably smug.",
      category: "usable",
      subtype: "beauty",
      requirements: [{ stat: "charisma", min: 6 }],
      bonuses: [],
      effects: [],
      tags: ["fragrance"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:023": {
      icon: "📘",
      name: "Etiquette Book",
      description: "Rules for society.\nAnd how to break them politely.",
      descriptionAfterUse:
        "You skim a few chapters.\n" +
        "It’s all about posture, tone, and never letting anyone know you’re panicking.",
      category: "usable",
      subtype: "books",
      requirements: [{ stat: "charisma", min: 4 }],
      bonuses: [],
      effects: [{ trigger: "onUse", kind: "statAdd", stat: "charisma", add: 1 }],
      tags: ["books"],
      baseFem: 0
    },

    "it:024": {
      icon: "🪮",
      name: "Pocket Hairbrush",
      description: "For quick fixes.\nOr long stares.",
      descriptionAfterUse: "You brush your hair into place.\nIt behaves… for now.",
      category: "usable",
      subtype: "grooming",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["grooming"],
      baseFem: 0
    },

    "it:025": {
      icon: "🪞",
      name: "Pocket Mirror",
      description: "For checking makeup.\nOr checking consequences.",
      descriptionAfterUse: "You check your reflection.\nA brief moment of truth. Then denial.",
      category: "usable",
      subtype: "grooming",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["grooming"],
      baseFem: 0
    },

    "it:026": {
      icon: "🧴",
      name: "Hand Lotion",
      description: "Soft hands.\nSofter resolve.",
      descriptionAfterUse:
        "You rub lotion into your hands.\n" +
        "They feel softer. Somehow, so do your thoughts.",
      category: "usable",
      subtype: "beauty",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["beauty"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    },

    "it:027": {
      icon: "🧼",
      name: "Fancy Soap",
      description: "Smells expensive.\nFeels suspicious.",
      descriptionAfterUse: "You wash up.\nThe scent is luxurious—and a little judging.",
      category: "usable",
      subtype: "beauty",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["beauty"],
      presentation: { intent: "feminine", modesty: 5 },
      baseFem: 0,
      audio: { sfx: null }
    }
  };

  const Misc = {
    "it:020": {
      icon: "🗝️",
      name: "Master Key",
      description: "Opens something important.\nOr a lot of trouble.",
      category: "misc",
      subtype: "keyItem",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["keyItem"],
      baseFem: 0
    },

    "it:021": {
      icon: "🧵",
      name: "Silk Fabric",
      description: "Fine material used for crafting.",
      category: "misc",
      subtype: "material",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["material"],
      baseFem: 0
    },

    "it:022": {
      icon: "🪙",
      name: "Rare Coin",
      description: "A collectible with a story attached.\nProbably cursed.",
      category: "misc",
      subtype: "collectible",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["collectible"],
      baseFem: 0
    },

    "it:028": {
      icon: "📎",
      name: "Clips",
      description: "Small metal clips.\nUseful for… things.",
      category: "misc",
      subtype: "material",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["material"],
      baseFem: 0
    },

    "it:029": {
      icon: "🧩",
      name: "Odd Token",
      description: "A token with unknown markings.",
      category: "misc",
      subtype: "collectible",
      requirements: [],
      bonuses: [],
      effects: [],
      tags: ["collectible"],
      baseFem: 0
    }
  };

  /* ----------------------------------------------------------------------
     3) Export grouped + flattened DB
  ---------------------------------------------------------------------- */

  Skycore.Content.Items = Object.freeze({
    clothes: Object.freeze(Clothes),
    usable: Object.freeze(Usables),
    misc: Object.freeze(Misc)
  });

  // Flatten for backwards compatibility (existing systems likely use ItemDB[id]).
  const FlatDB = Object.assign({}, Clothes, Usables, Misc);

  // Backwards-compat + safety normalization.
  Object.keys(FlatDB).forEach(function (id) {
    var item = FlatDB[id];

    // 1) baseFem exists on every item
    if (typeof item.baseFem !== "number") {
      item.baseFem = 0;
    }

    // 2) Legacy aliases (so existing UI/systems keep working while we migrate)
    //    Canonical fields going forward are:
    //    - category, subtype, description, requirements, tags, presentation, audio
    if (typeof item.desc !== "string" && typeof item.description === "string") {
      item.desc = item.description;
    }
    if (typeof item.cat !== "string" && typeof item.category === "string") {
      item.cat = item.category;
    }
    if (typeof item.type !== "string" && typeof item.subtype === "string") {
      item.type = item.subtype;
    }
    if (!Array.isArray(item.reqs) && Array.isArray(item.requirements)) {
      item.reqs = item.requirements;
    }
    if (!Array.isArray(item.p_tags) && Array.isArray(item.tags)) {
      item.p_tags = item.tags;
    }
    if (typeof item.descAfterUse !== "string" && typeof item.descriptionAfterUse === "string") {
      item.descAfterUse = item.descriptionAfterUse;
    }
    if (item.audio && item.sfx === undefined) {
      item.sfx = item.audio.sfx || null;
    }
  });

  Skycore.Content.ItemDB = Object.freeze(FlatDB);
})();
