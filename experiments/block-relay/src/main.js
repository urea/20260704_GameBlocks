import "./styles.css";
import { createRelayGame } from "./simulation/relayGame.js";
import { LEVELS } from "./simulation/levels.js";
import { createGameView } from "./render/createGameView.js";
import { createHud } from "./ui/hud.js";

const game = createRelayGame(LEVELS);
const view = createGameView({
  container: document.querySelector("#scene-root"),
  onCellSelected: (cell) => game.toggleRelay(cell),
  onRunFinished: () => game.finishRun(),
});
const hud = createHud({
  onRun: () => game.run(),
  onPlan: () => game.togglePlan(),
  onReset: () => game.resetLevel(),
  onNext: () => game.nextLevel(),
});

game.subscribe((snapshot) => {
  view.sync(snapshot);
  hud.render(snapshot);
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Space") {
    event.preventDefault();
    game.run();
  }
  if (event.key.toLowerCase() === "r") game.resetLevel();
  if (event.key.toLowerCase() === "h") game.togglePlan();
  if (event.key.toLowerCase() === "n") game.nextLevel();
});

game.start();

window.__relayBlocksDebug = {
  cellToScreen: view.cellToScreen,
  snapshot: game.getSnapshot,
};
