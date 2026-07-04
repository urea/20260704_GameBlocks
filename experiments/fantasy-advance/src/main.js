import "./styles.css";
import { createFantasyAdvanceGame } from "./game/state.js";
import { renderGame } from "./ui/render.js";

const root = document.querySelector("#app");
const game = createFantasyAdvanceGame();

function paint() {
  renderGame(root, game.snapshot(), {
    onAttack: (slotIndex) => {
      game.attackSlot(slotIndex);
      paint();
    },
    onReset: () => {
      game.reset();
      paint();
    },
  });
}

paint();

window.__fantasyAdvanceDebug = {
  snapshot: () => game.snapshot(),
  attackSlot: (slotIndex) => {
    const snapshot = game.attackSlot(slotIndex);
    paint();
    return snapshot;
  },
  attackBest: () => {
    const snapshot = game.debugAttackBest();
    paint();
    return snapshot;
  },
  reset: () => {
    game.reset(20260704);
    paint();
    return game.snapshot();
  },
};
