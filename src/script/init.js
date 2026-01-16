/* During Development: Prevent SugarCube from loading old saves on refresh */
Config.saves.autoload = false; 
Config.history.controls = true; // Helpful for debugging


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