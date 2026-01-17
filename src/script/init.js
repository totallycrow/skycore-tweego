/* During Development: Prevent SugarCube from loading old saves on refresh */
Config.saves.autoload = false; 
Config.history.controls = true; // Helpful for debugging

/* UI Configuration - Static (does not go into saves) */
window.Skycore = window.Skycore || {};
Skycore.Config = Skycore.Config || {};
Skycore.Config.Anim = Skycore.Config.Anim || {};

Skycore.Config.Anim.EyeBlink = {
  enabled: true,

  // First blink after attach (so player notices)
  firstMinMs: 450,
  firstMaxMs: 1200,

  // Thereafter (time between subsequent blinks)
  minIdleMs: 1500,
  maxIdleMs: 4000,

  // Blink phase timings (animation speed)
  tHalf1Ms: 60,
  tClosedMs: 80,
  tHalf2Ms: 60,

  // Behavior: if true, always do quick blink on attach (great for inventory UX)
  // If false, only quick blink on the very first time ever
  quickOnAttach: true
};

/* Static Data - Does not go into saves */
setup.characters = {
    "alice": {
        name: "Alice",
        bio: "A librarian."
    }
};

/* State Data - This goes into saves */
/* Using the StoryInit special passage via JS */
$(document).on(':storyinit', function () {
    State.variables.npcs = {
        "alice": { affection: 0 }
    };
});