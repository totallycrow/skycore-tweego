/* =========================================================================
   Inventory System: Use Effects
========================================================================= */

(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const { capitalize } = Skycore.Systems.InventoryHelpers;

  function fmtEffectLine(e) {
    if (!e || !e.kind) return null;
    if (e.kind === "statAdd") return `${capitalize(e.stat)} +${e.add}`;
    if (e.kind === "addStatus") return `Status: ${e.status} (${e.turns || 0} turns)`;
    if (e.kind === "removeStatus") return `Remove status: ${e.status}`;
    return `${e.kind}`;
  }

  function fmtBonusLine(b) {
    if (!b || !b.kind) return null;
    if (b.kind === "statAdd") return `${capitalize(b.stat)} +${b.add}`;
    if (b.kind === "statMul") return `${capitalize(b.stat)} ×${b.mul}`;
    return `${b.kind}`;
  }

  function applyUseEffects(item) {
    const stats = State.variables.stats || (State.variables.stats = {});
    const statuses = State.variables.statuses || (State.variables.statuses = {});
    const effects = Array.isArray(item.effects) ? item.effects : [];

    effects.forEach(e => {
      if (!e) return;
      if (e.trigger && e.trigger !== "onUse") return;

      if (e.kind === "statAdd" && e.stat) {
        const cur = Number(stats[e.stat] ?? 0);
        stats[e.stat] = cur + Number(e.add ?? 0);
      }

      if (e.kind === "addStatus" && e.status) {
        const turns = Number(e.turns ?? 0);
        statuses[e.status] = Math.max(Number(statuses[e.status] ?? 0), turns);
      }

      if (e.kind === "removeStatus" && e.status) {
        delete statuses[e.status];
      }
    });

    // Update presentation score if stats changed (affects beauty/luck)
    // Update MC stats page if visible
    if (Skycore.Systems.StatsRender && Skycore.Systems.StatsRender.updatePresentationScore) {
      Skycore.Systems.StatsRender.updatePresentationScore();
    }
    
    // Update inventory UI presentation score if inventory is open
    const invRoot = document.querySelector('[data-inv-root="1"]');
    if (invRoot && Skycore.Systems.InventoryDOM && Skycore.Systems.InventoryDOM.updatePresentationScore) {
      Skycore.Systems.InventoryDOM.updatePresentationScore(invRoot);
    }
  }

  function buildAfterUseMessage(item) {
    const lines = [];
    const base = (typeof item.descAfterUse === "string" && item.descAfterUse.trim().length)
      ? item.descAfterUse.trim()
      : "You use the item.";

    lines.push(base);

    const effLines = (Array.isArray(item.effects) ? item.effects : [])
      .filter(e => !e.trigger || e.trigger === "onUse")
      .map(fmtEffectLine)
      .filter(Boolean);

    const bonusLines = (Array.isArray(item.bonuses) ? item.bonuses : [])
      .map(fmtBonusLine)
      .filter(Boolean);

    if (effLines.length || bonusLines.length) lines.push("");

    if (effLines.length) {
      lines.push("Effects:");
      effLines.forEach(t => lines.push(`- ${t}`));
    }

    if (bonusLines.length) {
      if (effLines.length) lines.push("");
      lines.push("Bonuses:");
      bonusLines.forEach(t => lines.push(`- ${t}`));
    }

    return lines.join("\n");
  }

  Skycore.Systems.InventoryEffects = {
    fmtEffectLine,
    fmtBonusLine,
    applyUseEffects,
    buildAfterUseMessage
  };
})();
