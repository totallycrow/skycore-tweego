/* =========================================================================
   MC Sheet v1: State Management
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  function ensureState() {
    const V = State.variables;

    if (!V.mcStats) {
      V.mcStats = {
        // Attributes (base) - all set to 10
        attributes: {
          strength: 10,
          dexterity: 10,
          endurance: 10,
          intelligence: 10,
          charisma: 10,
          willpower: 10,
          luck: 10,
          beauty: 10
        },
        // Skills - all set to 10
        skills: {
          deception: 10,
          athletics: 10
        },
        // Sex Skills (base) - all set to 10
        sexSkills: {
          oral: 10,
          hands: 10,
          anal: 10,
          penis: 10,
          seduction: 10,
          humiliation: 10
        },
        // Status (meters) - internal state
        status: {
          stress: 0,
          confidence: 50,
          shame: 0,
          arousal: 0,
          fatigue: 0
        },
        _initialized: false
      };
    }

    // Ensure all required structures exist (migration safety)
    if (!V.mcStats.attributes) {
      V.mcStats.attributes = {
        strength: 10,
        dexterity: 10,
        endurance: 10,
        intelligence: 10,
        charisma: 10,
        willpower: 10,
        luck: 10,
        beauty: 10
      };
    }

    if (!V.mcStats.skills) {
      V.mcStats.skills = {
        deception: 10,
        athletics: 10
      };
    }

    if (!V.mcStats.sexSkills) {
      V.mcStats.sexSkills = {
        oral: 10,
        hands: 10,
        anal: 10,
        penis: 10,
        seduction: 10,
        humiliation: 10
      };
    }

    if (!V.mcStats.status) {
      V.mcStats.status = {
        stress: 0,
        confidence: 50,
        shame: 0,
        arousal: 0,
        fatigue: 0
      };
    }

    // Initialize all fixed stats to 10 if not already set
    if (!V.mcStats._initialized) {
      // Ensure all attributes are 10
      const attrDefaults = {
        strength: 10,
        dexterity: 10,
        endurance: 10,
        intelligence: 10,
        charisma: 10,
        willpower: 10,
        luck: 10,
        beauty: 10
      };
      Object.keys(attrDefaults).forEach(key => {
        if (V.mcStats.attributes[key] === undefined) {
          V.mcStats.attributes[key] = attrDefaults[key];
        }
      });

      // Ensure all skills are 10
      const skillDefaults = {
        deception: 10,
        athletics: 10
      };
      Object.keys(skillDefaults).forEach(key => {
        if (V.mcStats.skills[key] === undefined) {
          V.mcStats.skills[key] = skillDefaults[key];
        }
      });

      // Ensure all sex skills are 10
      const sexSkillDefaults = {
        oral: 10,
        hands: 10,
        anal: 10,
        penis: 10,
        seduction: 10,
        humiliation: 10
      };
      Object.keys(sexSkillDefaults).forEach(key => {
        if (V.mcStats.sexSkills[key] === undefined) {
          V.mcStats.sexSkills[key] = sexSkillDefaults[key];
        }
      });

      V.mcStats._initialized = true;
    }
  }

  Skycore.Systems.StatsState = {
    ensureState
  };
})();
