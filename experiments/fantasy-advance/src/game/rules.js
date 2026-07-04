import { ELEMENT_ADVANTAGE, MAIN_ADVANTAGE, cardById } from "../data/cards.js";

export function judgeAttack(attackerId, defenderId) {
  const attacker = cardById(attackerId);
  const defender = cardById(defenderId);
  const mainAdvantage = MAIN_ADVANTAGE[attacker.main] === defender.main;
  if (!mainAdvantage) {
    return {
      outcome: "out",
      bases: 0,
      mainAdvantage,
      elementAdvantage: false,
    };
  }

  const elementAdvantage = ELEMENT_ADVANTAGE[attacker.element] === defender.element;
  return {
    outcome: elementAdvantage ? "double" : "single",
    bases: elementAdvantage ? 2 : 1,
    mainAdvantage,
    elementAdvantage,
  };
}

export function advanceBases(currentBases, batter, hitBases) {
  const nextBases = [null, null, null];
  let runs = 0;

  for (let index = 2; index >= 0; index -= 1) {
    const runner = currentBases[index];
    if (!runner) continue;
    const destination = index + hitBases;
    if (destination >= 3) runs += 1;
    else nextBases[destination] = runner;
  }

  nextBases[hitBases - 1] = batter;
  return { bases: nextBases, runs };
}
