import "./styles.css";
import * as THREE from "three";
import { GeneralObjectModelController } from "@gameblocks/modules/actor-motion/GeneralObjectModelController.js";
import { GeneralVehicleMotionController } from "@gameblocks/modules/actor-motion/GeneralVehicleMotionController.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";
import { HeadingRelativeRadar } from "@gameblocks/modules/user-interface/HeadingRelativeRadar.js";
import { ArchipelagoTerrainSampler } from "@gameblocks/modules/world/environment/TerrainSampler.js";
import { NaturalEnvironment } from "@gameblocks/modules/world/environment/NaturalEnvironment.js";
import { PickupObject } from "@gameblocks/modules/world/object/PickupObject.js";
import { createPickupVisual } from "@gameblocks/modules/world/object/factory/PickupVisualFactory.js";

const basis = DEFAULT_WORLD_BASIS;
const bounds = { min: -54, max: 54, minUp: 5, maxUp: 28 };
const state = {
  collected: 0,
  status: "playing",
  message: "Sweep the island",
  motion: null,
};

const pickupPlan = [
  { id: "p1", right: -34, forward: -18, up: 8, type: "armor" },
  { id: "p2", right: -12, forward: 30, up: 11, type: "health" },
  { id: "p3", right: 26, forward: 22, up: 14, type: "ammo" },
  { id: "p4", right: 42, forward: -20, up: 10, type: "armor" },
  { id: "p5", right: 4, forward: -38, up: 16, type: "health" },
  { id: "p6", right: -44, forward: 18, up: 13, type: "ammo" },
  { id: "p7", right: 18, forward: -4, up: 20, type: "armor" },
];

const input = {
  forward: 0,
  backward: 0,
  left: 0,
  right: 0,
  up: 0,
  down: 0,
  rotateLeft: 0,
  rotateRight: 0,
  brake: false,
};
const keys = new Set();

const container = document.querySelector("#scene-root");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x78b9d8);
scene.fog = new THREE.FogExp2(0x96c8df, 0.012);

const hemi = new THREE.HemisphereLight(0xeaf8ff, 0x4e6c50, 1.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 3.1);
sun.position.set(-42, 64, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);
const cameraTarget = new THREE.Vector3();

const terrainSampler = new ArchipelagoTerrainSampler({
  seed: 20260704,
  seaLevel: 0,
  shorelineBlend: 12,
  basis,
});
new NaturalEnvironment({
  scene,
  terrainSampler,
  terrainSize: 132,
  terrainSegments: 112,
  treeCount: 90,
  rockCount: 24,
  grassBladeCount: 170,
  propSpawnRegions: [{ type: "inside", rightMin: -54, rightMax: 54, forwardMin: -54, forwardMax: 54 }],
  basis,
}).create();

const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.MeshStandardMaterial({ color: 0x277fa3, transparent: true, opacity: 0.72, roughness: 0.28 })
);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.02;
scene.add(sea);

const drone = createDroneVisual();
scene.add(drone);
const droneModel = new GeneralObjectModelController({
  model: drone,
  localForward: "-z",
  basis,
});
const vehicle = new GeneralVehicleMotionController({
  acceleration: 44,
  maxSpeed: 34,
  damping: 1.2,
  brakeDamping: 7,
  rotateYawRate: 2.6,
  maxForwardBackwardBank: 0.24,
  maxLeftRightBank: 0.42,
  bankLag: 0.1,
  basis,
});

const pickups = [];
const radar = new HeadingRelativeRadar({
  container: document.querySelector("#radar"),
  width: 178,
  height: 150,
  range: 70,
  playerColor: 0x84ecff,
  contactColor: 0xffe07d,
  basis,
});

function createDroneVisual() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.62, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xe6fbff, metalness: 0.18, roughness: 0.34 })
  );
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.74, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0x4fd8ff, emissive: 0x145575, emissiveIntensity: 0.5 })
  );
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.16, 0.56),
    new THREE.MeshStandardMaterial({ color: 0xffd36b, roughness: 0.48 })
  );
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 1.4, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x263947, roughness: 0.58 })
  );
  body.castShadow = true;
  wing.castShadow = true;
  core.castShadow = true;
  tail.position.set(0, 0.76, 1.42);
  group.add(body, core, wing, tail);
  return group;
}

function buildPickups() {
  for (const pickup of pickups) {
    scene.remove(pickup.group);
    pickup.dispose();
  }
  pickups.length = 0;
  for (const item of pickupPlan) {
    const visual = createPickupVisual({ type: item.type });
    const position = basis.fromBasisComponents(item.right, item.up, item.forward);
    const pickup = new PickupObject({
      id: item.id,
      type: item.type,
      pickupVisual: visual,
      position,
      floorUp: item.up - 0.5,
      scale: 1.15,
      basis,
    });
    scene.add(pickup.group);
    pickups.push(pickup);
  }
}

function resetGame() {
  state.collected = 0;
  state.status = "playing";
  state.message = "Sweep the island";
  vehicle.reset({
    position: basis.fromBasisComponents(-6, 11, 4),
    velocity: new THREE.Vector3(),
    pathYaw: -0.35,
  });
  state.motion = vehicle.reset({
    position: basis.fromBasisComponents(-6, 11, 4),
    velocity: new THREE.Vector3(),
    pathYaw: -0.35,
  });
  buildPickups();
}

function syncInput() {
  input.forward = keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
  input.backward = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
  input.left = keys.has("KeyA") ? 1 : 0;
  input.right = keys.has("KeyD") ? 1 : 0;
  input.up = keys.has("Space") ? 1 : 0;
  input.down = keys.has("ControlLeft") || keys.has("ControlRight") ? 1 : 0;
  input.rotateLeft = keys.has("KeyQ") || keys.has("ArrowLeft") ? 1 : 0;
  input.rotateRight = keys.has("KeyE") || keys.has("ArrowRight") ? 1 : 0;
  input.brake = keys.has("ShiftLeft") || keys.has("ShiftRight");
}

function clampVehicle() {
  const planar = basis.toPlanar(vehicle.position);
  planar.right = Math.max(bounds.min, Math.min(bounds.max, planar.right));
  planar.forward = Math.max(bounds.min, Math.min(bounds.max, planar.forward));
  const up = Math.max(bounds.minUp, Math.min(bounds.maxUp, basis.upComponent(vehicle.position)));
  vehicle.position.copy(basis.fromBasisComponents(planar.right, up, planar.forward));
}

function stepGame(deltaSeconds) {
  if (state.status === "playing") {
    const intent = vehicle.planMovement({
      ...input,
      deltaSeconds,
    });
    state.motion = vehicle.commitMovement(intent);
    clampVehicle();
    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      const pickup = pickups[index];
      pickup.animate(deltaSeconds);
      if (pickup.position.distanceTo(vehicle.position) > pickup.radius + 1.7) continue;
      scene.remove(pickup.group);
      pickup.dispose();
      pickups.splice(index, 1);
      state.collected += 1;
      if (state.collected >= pickupPlan.length) {
        state.status = "complete";
        state.message = "All cargo recovered";
      } else {
        state.message = `${pickupPlan.length - state.collected} signals remain`;
      }
    }
  } else {
    for (const pickup of pickups) pickup.animate(deltaSeconds);
  }
}

function renderVehicle() {
  const frame = state.motion?.bodyFrame ?? basis.yawPitchRollFrame(0);
  droneModel.step(vehicle.position, frame);
}

function renderCamera(deltaSeconds) {
  const frame = state.motion?.bodyFrame ?? basis.yawPitchRollFrame(0);
  const desired = vehicle.position.clone()
    .addScaledVector(frame.forward, -13)
    .addScaledVector(frame.up, 7)
    .addScaledVector(frame.right, 0);
  camera.position.lerp(desired, Math.min(1, deltaSeconds * 4.8));
  cameraTarget.copy(vehicle.position)
    .addScaledVector(frame.forward, 11)
    .addScaledVector(frame.up, 1.4);
  camera.lookAt(cameraTarget);
}

function renderHud() {
  document.querySelector("#cargo-readout").textContent = `${state.collected} / ${pickupPlan.length}`;
  document.querySelector("#status-readout").textContent = state.message;
  const frame = state.motion?.bodyFrame ?? basis.yawPitchRollFrame(0);
  radar.renderRadar(vehicle.position, frame.forward, pickups.map((pickup) => ({
    position: pickup.position,
    color: pickup.type === "health" ? 0xff6767 : pickup.type === "ammo" ? 0xd9e56a : 0x77a3ff,
    shape: "cross",
    size: 4,
  })));
}

function resize() {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (window.innerWidth <= 700) radar.setSize(132, 116);
  else radar.setSize(178, 150);
}

function snapshot() {
  return {
    status: state.status,
    collected: state.collected,
    total: pickupPlan.length,
    remaining: pickups.length,
    speed: Number(vehicle.velocity.length().toFixed(2)),
    position: {
      x: Number(vehicle.position.x.toFixed(2)),
      y: Number(vehicle.position.y.toFixed(2)),
      z: Number(vehicle.position.z.toFixed(2)),
    },
  };
}

window.addEventListener("keydown", (event) => {
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

resetGame();

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000 || 1 / 60);
  lastTime = now;
  resize();
  stepGame(deltaSeconds);
  renderVehicle();
  renderCamera(deltaSeconds);
  renderHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__hoverSalvageDebug = {
  ready: true,
  snapshot,
  complete: () => {
    state.collected = pickupPlan.length;
    state.status = "complete";
    state.message = "All cargo recovered";
    for (const pickup of pickups) scene.remove(pickup.group);
    pickups.length = 0;
    return snapshot();
  },
  reset: () => {
    resetGame();
    return snapshot();
  },
};
