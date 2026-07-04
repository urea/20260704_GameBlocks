import "./styles.css";
import {
  BrickWall,
  CircleDot,
  DraftingCompass,
  Eraser,
  Fan,
  Play,
  RefreshCw,
  RotateCw,
  SkipForward,
  TriangleRight,
  createIcons,
} from "lucide";
import { createContraptionGame } from "./simulation/contraptionGame.js";
import { LEVELS } from "./simulation/levels.js";
import { createContraptionView } from "./render/createContraptionView.js";
import { createHud } from "./ui/hud.js";

createIcons({
  icons: {
    BrickWall,
    CircleDot,
    DraftingCompass,
    Eraser,
    Fan,
    Play,
    RefreshCw,
    RotateCw,
    SkipForward,
    TriangleRight,
  },
});

const game = createContraptionGame(LEVELS);
const view = await createContraptionView({
  container: document.querySelector("#scene-root"),
  onCellSelected: (cell) => game.placeSelectedPart(cell),
  onRunEvent: (event) => game.applyRunEvent(event),
});
const hud = createHud({
  onTool: (tool) => game.selectTool(tool),
  onRotate: () => game.rotateSelectedPart(),
  onHint: () => game.toggleBlueprint(),
  onClear: () => game.clearPlacedParts(),
  onRun: () => game.startRun(),
  onReset: () => game.resetRun(),
  onNext: () => game.nextLevel(),
});

game.subscribe((snapshot) => {
  view.sync(snapshot);
  hud.render(snapshot);
});

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === "1") game.selectTool("fan");
  if (key === "2") game.selectTool("ramp");
  if (key === "3") game.selectTool("wall");
  if (key === "4") game.selectTool("bumper");
  if (key === "r") game.rotateSelectedPart();
  if (key === "h") game.toggleBlueprint();
  if (key === "c") game.clearPlacedParts();
  if (key === "n") game.nextLevel();
  if (event.code === "Space") {
    event.preventDefault();
    game.startRun();
  }
});

game.start();

window.__contraptionLabDebug = {
  cellToScreen: view.cellToScreen,
  placeSolution: game.placeSolution,
  run: game.startRun,
  snapshot: game.getSnapshot,
};
