import "./styles.css";
import { ArchipelagoTerrainSampler } from "@gameblocks/modules/world/environment/TerrainSampler.js";
import { FlightHud } from "@gameblocks/modules/user-interface/FlightHud.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";
import { SKY_COURIER_COURSE } from "./simulation/course.js";
import { createSkyCourierGame } from "./simulation/flightGame.js";
import { createSkyCourierView } from "./render/createSkyCourierView.js";

const input = {
  left: 0,
  right: 0,
  up: 0,
  down: 0,
  yawLeft: 0,
  yawRight: 0,
  throttle: 0,
  boost: false,
};

const pressed = new Set();
const keyBindings = new Map([
  ["ArrowLeft", "left"],
  ["KeyA", "left"],
  ["ArrowRight", "right"],
  ["KeyD", "right"],
  ["ArrowUp", "up"],
  ["KeyW", "up"],
  ["ArrowDown", "down"],
  ["KeyS", "down"],
  ["KeyQ", "yawLeft"],
  ["KeyE", "yawRight"],
  ["Equal", "throttleUp"],
  ["NumpadAdd", "throttleUp"],
  ["Minus", "throttleDown"],
  ["NumpadSubtract", "throttleDown"],
  ["Space", "boost"],
  ["ShiftLeft", "boost"],
  ["ShiftRight", "boost"],
]);

function syncKeyboardInput() {
  input.left = pressed.has("left") ? 1 : 0;
  input.right = pressed.has("right") ? 1 : 0;
  input.up = pressed.has("up") ? 1 : 0;
  input.down = pressed.has("down") ? 1 : 0;
  input.yawLeft = pressed.has("yawLeft") ? 1 : 0;
  input.yawRight = pressed.has("yawRight") ? 1 : 0;
  input.throttle = (pressed.has("throttleUp") ? 1 : 0) - (pressed.has("throttleDown") ? 1 : 0);
  input.boost = pressed.has("boost");
}

function bindKeyboard() {
  window.addEventListener("keydown", (event) => {
    const binding = keyBindings.get(event.code);
    if (!binding) return;
    event.preventDefault();
    pressed.add(binding);
    syncKeyboardInput();
  });
  window.addEventListener("keyup", (event) => {
    const binding = keyBindings.get(event.code);
    if (!binding) return;
    event.preventDefault();
    pressed.delete(binding);
    syncKeyboardInput();
  });
  window.addEventListener("blur", () => {
    pressed.clear();
    syncKeyboardInput();
  });
}

function bindTouchControls() {
  const activeTouch = new Map();
  const buttons = Array.from(document.querySelectorAll("[data-input]"));
  function syncTouch() {
    input.left = pressed.has("left") || activeTouch.has("left") ? 1 : 0;
    input.right = pressed.has("right") || activeTouch.has("right") ? 1 : 0;
    input.up = pressed.has("up") || activeTouch.has("up") ? 1 : 0;
    input.down = pressed.has("down") || activeTouch.has("down") ? 1 : 0;
    input.yawLeft = pressed.has("yawLeft") ? 1 : 0;
    input.yawRight = pressed.has("yawRight") ? 1 : 0;
    input.boost = pressed.has("boost") || activeTouch.has("boost");
  }
  for (const button of buttons) {
    const name = button.dataset.input;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      activeTouch.set(name, event.pointerId);
      syncTouch();
    });
    const clear = (event) => {
      if (activeTouch.get(name) === event.pointerId) activeTouch.delete(name);
      syncTouch();
    };
    button.addEventListener("pointerup", clear);
    button.addEventListener("pointercancel", clear);
    button.addEventListener("lostpointercapture", clear);
  }
}

function renderMissionPanel(snapshot) {
  const gate = snapshot.gateIndex >= snapshot.gateCount
    ? "Course clear"
    : `Gate ${snapshot.gateIndex + 1}/${snapshot.gateCount}`;
  document.querySelector("#gate-readout").textContent = gate;
  document.querySelector("#target-readout").textContent =
    snapshot.status === "complete"
      ? `${snapshot.timeText}  score ${snapshot.score}`
      : `${Math.round(snapshot.gateDistance)} m`;
  document.body.dataset.flightStatus = snapshot.status;
}

function renderFlightHud(hud, snapshot) {
  hud.renderDashboard({
    regionName: snapshot.message,
    speed: Math.round(snapshot.speed),
    altitude: Math.round(snapshot.altitude),
    agl: Math.max(0, Math.round(snapshot.agl)),
    waveLabel: "GATE",
    waveDetail: snapshot.gateIndex >= snapshot.gateCount
      ? "CLEAR"
      : `${snapshot.gateIndex + 1}/${snapshot.gateCount}`,
    compassHeadingDegrees: snapshot.headingDegrees,
    timeText: snapshot.timeText,
    scoreText: `score ${snapshot.score}`,
    throttle: snapshot.throttle,
    pitchDegrees: snapshot.pitch * 180 / Math.PI,
    rollDegrees: snapshot.roll * 180 / Math.PI,
    weaponLabel: snapshot.isBoosting ? "BOOST" : "READY",
    lockStatus: snapshot.status === "complete"
      ? "DONE"
      : `${Math.round(snapshot.gateDistance)}M`,
    gunHeat: snapshot.boostRatio,
    pullUpWarning: snapshot.pullUpWarning,
  });
}

const basis = DEFAULT_WORLD_BASIS;
const terrainSampler = new ArchipelagoTerrainSampler({
  seed: 20260704,
  seaLevel: 0,
  shorelineBlend: 13,
  underwaterFloorDrop: 22,
  basis,
});
const game = createSkyCourierGame({
  course: SKY_COURIER_COURSE,
  terrainSampler,
  basis,
});
const view = createSkyCourierView({
  container: document.querySelector("#scene-root"),
  game,
  terrainSampler,
  basis,
});
const flightHud = new FlightHud(document.querySelector("#hud"));

bindKeyboard();
bindTouchControls();
document.querySelector("#reset-button").addEventListener("click", () => game.restart());

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = Math.min(1 / 20, (now - lastTime) / 1000 || 1 / 60);
  lastTime = now;
  game.step(input, deltaSeconds);
  const snapshot = game.getSnapshot();
  view.render(snapshot, deltaSeconds, now / 1000);
  renderMissionPanel(snapshot);
  renderFlightHud(flightHud, snapshot);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__skyCourierDebug = {
  ready: true,
  snapshot: () => game.getDebugSnapshot(),
  completeCourse: () => {
    game.debugCompleteCourse();
    return game.getDebugSnapshot();
  },
  reset: () => {
    game.restart();
    return game.getDebugSnapshot();
  },
};
