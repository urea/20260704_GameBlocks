import "./styles.css";
import * as THREE from "three";
import { ArcadeCarMotionController } from "@gameblocks/modules/actor-motion/ground-vehicle/ArcadeCarMotionController.js";
import { CarModelController } from "@gameblocks/modules/actor-motion/ground-vehicle/CarModelController.js";
import { RaceCheckpointLapPlay, RACE_STATES } from "@gameblocks/modules/gameplay/RaceCheckpointLapPlay.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";
import { RaceMinimap } from "@gameblocks/modules/user-interface/RaceMinimap.js";
import { RaceTrackEnvironment } from "@gameblocks/modules/world/environment/RaceTrackEnvironment.js";
import { createCarVisual } from "@gameblocks/modules/world/object/factory/CarVisualFactory.js";

const basis = DEFAULT_WORLD_BASIS;
const playerId = "driver";
const trackPoints = [
  { right: -32, forward: -26 },
  { right: 12, forward: -34 },
  { right: 36, forward: -10 },
  { right: 28, forward: 26 },
  { right: -18, forward: 34 },
  { right: -42, forward: 4 },
];

const input = {
  throttle: 0,
  reverse: 0,
  left: 0,
  right: 0,
  boost: false,
};
const keys = new Set();

const container = document.querySelector("#scene-root");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7aa7c9);
scene.fog = new THREE.FogExp2(0x8db6cf, 0.014);

const hemi = new THREE.HemisphereLight(0xeaf8ff, 0x5b6e49, 1.65);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 3.2);
sun.position.set(-36, 58, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);
const cameraTarget = new THREE.Vector3();

const track = new RaceTrackEnvironment({
  scene,
  trackPlanarPoints: trackPoints,
  checkpointRadius: 7,
  naturalEnvironmentConfig: {
    terrainSize: 116,
    terrainSegments: 96,
    treeCount: 74,
    rockCount: 18,
    grassBladeCount: 150,
  },
  roadTerrainSamplerConfig: {
    seed: 20260704,
    roadHalfWidth: 6.2,
    roadHeight: 0,
    largeWaveAmp: 0.65,
    midNoiseAmp: 0.42,
  },
  basis,
}).create();

const race = new RaceCheckpointLapPlay({
  checkpoints: track.checkpoints,
  lapCount: 1,
});

const spawn = track.spawnPose(0, true, 8, 0, 0.55);
const carMotion = new ArcadeCarMotionController({
  maxForwardSpeed: 62,
  throttleAccel: 68,
  engineBrake: 1.25,
  steerLag: 0.08,
  steerAngleMax: 0.62,
  boostMultiplier: 1.32,
  basis,
});
carMotion.reset(spawn.position, spawn.yaw);

const carVisual = createCarVisual({
  paintColor: 0xf06b3d,
  cabinColor: 0xe9fbff,
  arrowColor: 0xffe88a,
});
scene.add(carVisual.group);
const carModel = new CarModelController({
  vehicleModel: carVisual.group,
  wheels: carVisual.wheels,
  wheelPivots: carVisual.wheelPivots,
});

race.addPlayer({ playerId, position: carMotion.position });
race.startGame();

const minimap = new RaceMinimap({
  planarBounds: { minRight: -56, maxRight: 56, minForward: -52, maxForward: 52 },
  width: 152,
  height: 152,
  padding: 10,
  canvas: document.querySelector("#minimap"),
});
minimap.syncResolution();

function syncInput() {
  input.throttle = keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
  input.reverse = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
  input.left = keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0;
  input.right = keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0;
  input.boost = keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("Space");
}

function resetGame() {
  const nextSpawn = track.spawnPose(0, true, 8, 0, 0.55);
  carMotion.reset(nextSpawn.position, nextSpawn.yaw);
  race.reset();
  race.startGame();
}

function stepGame(deltaSeconds) {
  if (race.raceState !== RACE_STATES.FINISHED) {
    const intent = carMotion.planMovement({
      ...input,
      deltaSeconds,
      terrain: track.terrainSampler,
    });
    const committed = carMotion.commitMovement(intent, null, track.terrainSampler);
    race.updatePlayer(playerId, carMotion.position);
    race.step(deltaSeconds);
    carModel.step({
      position: committed.position,
      bodyFrame: committed.bodyFrame,
      velocity: committed.velocity,
      steeringAngle: committed.steeringAngle,
      deltaSeconds,
    });
  }
}

function renderCamera(deltaSeconds) {
  const frame = carMotion.bodyFrame;
  const desired = carMotion.position.clone()
    .addScaledVector(frame.forward, -12)
    .addScaledVector(frame.up, 7)
    .addScaledVector(frame.right, 0);
  camera.position.lerp(desired, Math.min(1, deltaSeconds * 5.2));
  cameraTarget.copy(carMotion.position)
    .addScaledVector(frame.forward, 12)
    .addScaledVector(frame.up, 1.5);
  camera.lookAt(cameraTarget);
}

function renderHud() {
  const player = race.getPlayer(playerId);
  const checkpoint = player.nextCheckpointIndex + 1;
  const speed = Math.round(carMotion.velocity.length() * 3.6);
  document.querySelector("#lap-readout").textContent =
    race.raceState === RACE_STATES.FINISHED
      ? "Finish"
      : `CP ${checkpoint}/${track.checkpoints.length}`;
  document.querySelector("#speed-readout").textContent =
    race.raceState === RACE_STATES.FINISHED
      ? `${race.elapsedSeconds.toFixed(1)} seconds`
      : `${speed} km/h`;
  minimap.render(track.checkpoints, {
    position: carMotion.position,
    bodyFrame: carMotion.bodyFrame,
  }, player, []);
}

function resize() {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const miniSize = window.innerWidth <= 700 ? 116 : 152;
  minimap.setViewport(miniSize, miniSize, 10);
  minimap.syncResolution();
}

function snapshot() {
  const player = race.getPlayer(playerId);
  return {
    raceState: race.raceState,
    elapsed: Number(race.elapsedSeconds.toFixed(2)),
    nextCheckpointIndex: player.nextCheckpointIndex,
    completedLaps: player.completedLaps,
    speed: Number(carMotion.velocity.length().toFixed(2)),
    position: {
      x: Number(carMotion.position.x.toFixed(2)),
      y: Number(carMotion.position.y.toFixed(2)),
      z: Number(carMotion.position.z.toFixed(2)),
    },
  };
}

window.addEventListener("keydown", (event) => {
  if (!event.code.startsWith("Key") && !event.code.startsWith("Arrow") && !event.code.startsWith("Shift") && event.code !== "Space") return;
  keys.add(event.code);
  syncInput();
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  syncInput();
});
window.addEventListener("blur", () => {
  keys.clear();
  syncInput();
});
document.querySelector("#reset-button").addEventListener("click", resetGame);

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000 || 1 / 60);
  lastTime = now;
  resize();
  stepGame(deltaSeconds);
  renderCamera(deltaSeconds);
  renderHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__circuitDashDebug = {
  ready: true,
  snapshot,
  complete: () => {
    const player = race._getPlayer(playerId);
    player.completedLaps = 1;
    player.finished = true;
    player.finishOrder = 1;
    race.raceState = RACE_STATES.FINISHED;
    return snapshot();
  },
  reset: () => {
    resetGame();
    return snapshot();
  },
};
