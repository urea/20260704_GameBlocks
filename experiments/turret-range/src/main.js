import "./styles.css";
import * as THREE from "three";
import { AimResolver } from "@gameblocks/modules/gameplay/AimResolver.js";
import { CombatPlay, COMBAT_STATES } from "@gameblocks/modules/gameplay/CombatPlay.js";
import { ProjectileManager } from "@gameblocks/modules/gameplay/combat/ProjectileManager.js";
import { ProjectileWeaponSystem, WEAPON_AIM_MODES, WEAPON_DECISIONS, WEAPON_TYPES } from "@gameblocks/modules/gameplay/combat/ProjectileWeaponSystem.js";
import { Clock } from "@gameblocks/modules/math/TimeUtils.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";
import { ArenaEnvironment } from "@gameblocks/modules/world/environment/ArenaEnvironment.js";
import { HealthBarView } from "@gameblocks/modules/world/object/HealthBarView.js";
import { createBulletProjectileVisual } from "@gameblocks/modules/world/object/factory/ProjectileVisualFactory.js";

const basis = DEFAULT_WORLD_BASIS;
const playerId = "turret";
const state = {
  yaw: 0,
  pitch: 0.05,
  status: "started",
  message: "Gun ready",
  elapsed: 0,
};
const keys = new Set();

const container = document.querySelector("#scene-root");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x262322);
scene.fog = new THREE.Fog(0x262322, 38, 94);

const hemi = new THREE.HemisphereLight(0xffefe0, 0x4b4240, 1.35);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffc38a, 2.6);
key.position.set(-18, 34, 24);
key.castShadow = true;
scene.add(key);

const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 180);
const turretPosition = basis.fromBasisComponents(0, 1.3, 24);

new ArenaEnvironment({
  scene,
  worldSize: 58,
  floorUp: 0,
  wallHeight: 3.4,
  groundColor: 0x4b4b42,
  wallColor: 0x2d343b,
  pillarColor: 0x7b6656,
  rampColor: 0x6b5a4c,
  basis,
}).create();

const turret = createTurretVisual();
scene.add(turret);

const clock = new Clock({ manual: true, nowMs: 0 });
const aimResolver = new AimResolver({ maxDistance: 120, recursive: true, basis });
const weapon = new ProjectileWeaponSystem({
  aimMode: WEAPON_AIM_MODES.CROSSHAIR,
  gunHeatPerShot: 0.06,
  gunCoolRatePerSecond: 0.28,
  targetAimDotMin: 0.8,
  clock,
});
weapon.updateWeaponConfig(WEAPON_TYPES.GUN, {
  ammo: Infinity,
  maxAmmo: Infinity,
  fireRate: 0.12,
  speed: 86,
  launchOffset: { up: 0.18, forward: 1.8 },
});
const projectiles = new ProjectileManager({ basis });
let combat = new CombatPlay({ maxHealth: 70, maxArmor: 0 });

const targets = [];
const targetMeshes = [];

function createTurretVisual() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.7, 0.8, 24),
    new THREE.MeshStandardMaterial({ color: 0x363b40, roughness: 0.68 })
  );
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.0, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xe3e8ed, metalness: 0.12, roughness: 0.36 })
  );
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.23, 3.2, 18),
    new THREE.MeshStandardMaterial({ color: 0xffb168, emissive: 0x3d1500, emissiveIntensity: 0.26 })
  );
  barrel.rotation.x = Math.PI * 0.5;
  barrel.position.z = -2.0;
  head.position.y = 0.9;
  base.castShadow = true;
  head.castShadow = true;
  barrel.castShadow = true;
  group.add(base, head, barrel);
  group.userData.head = head;
  group.position.copy(turretPosition);
  return group;
}

function createTarget(index) {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.2, 2),
    new THREE.MeshStandardMaterial({
      color: 0xff6868,
      emissive: 0x5a1111,
      emissiveIntensity: 0.35,
      roughness: 0.52,
    })
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.52, 0.08, 12, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.65 })
  );
  ring.rotation.x = Math.PI * 0.5;
  shell.castShadow = true;
  group.add(shell, ring);
  scene.add(group);

  const healthBar = new HealthBarView({ upOffset: 2.1, width: 2.4, basis });
  scene.add(healthBar.group);
  return {
    id: `target_${index}`,
    teamId: "enemy",
    group,
    shell,
    healthBar,
    position: group.position,
    baseRight: -18 + index * 9,
    baseForward: -16 - (index % 2) * 6,
    phase: index * 1.7,
    health: 70,
    destroyed: false,
  };
}

function resetGame() {
  state.yaw = 0;
  state.pitch = 0.05;
  state.status = "started";
  state.message = "Gun ready";
  state.elapsed = 0;
  weapon.resetAmmo();
  projectiles.clear();
  for (const target of targets) {
    scene.remove(target.group);
    scene.remove(target.healthBar.group);
  }
  targets.length = 0;
  targetMeshes.length = 0;
  combat = new CombatPlay({ maxHealth: 70, maxArmor: 0 });
  combat.addPlayer({ playerId, teamId: "player", health: 100 });
  for (let index = 0; index < 5; index += 1) {
    const target = createTarget(index);
    targets.push(target);
    targetMeshes.push(target.group);
    combat.addPlayer({ playerId: target.id, teamId: target.teamId, health: target.health });
  }
  combat.startGame();
}

function currentFrame() {
  return basis.yawPitchRollFrame(state.yaw, state.pitch, 0);
}

function updateTurret() {
  const frame = currentFrame();
  const back = frame.forward.clone().multiplyScalar(-1);
  const matrix = new THREE.Matrix4().makeBasis(frame.right, frame.up, back);
  turret.quaternion.setFromRotationMatrix(matrix);
}

function stepInput(deltaSeconds) {
  const yawInput = (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0)
    - (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
  const pitchInput = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0)
    - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  state.yaw += yawInput * 1.35 * deltaSeconds;
  state.pitch = Math.max(-0.18, Math.min(0.48, state.pitch + pitchInput * 0.9 * deltaSeconds));
}

function fire() {
  if (combat.getCombatState() !== COMBAT_STATES.STARTED) return;
  const frame = currentFrame();
  const launch = weapon.getLaunchPosition(turretPosition, frame, WEAPON_TYPES.GUN);
  const aim = aimResolver.getAimFromAimRay({
    aimOrigin: launch,
    aimDirection: frame.forward,
    launchPosition: launch,
    objects: targetMeshes,
    recursive: true,
  });
  const decision = weapon.requestFire({
    shooterPosition: turretPosition,
    shooterBodyFrame: frame,
    aimPosition: aim.hitPosition,
    weaponId: WEAPON_TYPES.GUN,
  });
  if (!decision || decision.type !== WEAPON_DECISIONS.FIRE_GUN) {
    state.message = decision?.message ?? "Blocked";
    return;
  }
  const visual = createBulletProjectileVisual();
  scene.add(visual.group);
  projectiles.spawnProjectile({
    visual,
    metadata: { damage: 24 },
    position: decision.position,
    direction: decision.direction,
    speed: decision.speed,
    lifetimeSeconds: 1.75,
    hitRadius: 1.35,
    basis,
  });
  state.message = "Fired";
}

function stepTargets(deltaSeconds) {
  for (const target of targets) {
    if (target.destroyed) continue;
    target.phase += deltaSeconds;
    const right = target.baseRight + Math.sin(target.phase * 1.2) * 5;
    const up = 3.2 + Math.sin(target.phase * 1.7) * 0.9;
    const forward = target.baseForward + Math.cos(target.phase * 0.9) * 3.5;
    target.group.position.copy(basis.fromBasisComponents(right, up, forward));
    target.group.rotation.y += deltaSeconds * 1.8;
    target.group.rotation.x += deltaSeconds * 0.7;
  }
}

function stepCombat(deltaSeconds) {
  weapon.step({
    shooterPosition: turretPosition,
    shooterBodyFrame: currentFrame(),
    aimDirection: currentFrame().forward,
    targets: targets.filter((target) => !target.destroyed),
    deltaSeconds,
  });
  const hits = projectiles.step(targets, deltaSeconds);
  for (const hit of hits) {
    const target = hit.hittedTarget;
    combat.damage({ playerId: target.id, amount: hit.metadata?.damage ?? 20, sourceId: playerId });
    const combatState = combat.getPlayer(target.id);
    target.health = combatState.health;
    if (!combatState.alive) {
      target.destroyed = true;
      target.group.visible = false;
      target.healthBar.group.visible = false;
      state.message = `${target.id} down`;
    }
  }
  const events = combat.step();
  if (events.some((event) => event.type === "combat.finished")) {
    state.status = "complete";
    state.message = "Range clear";
  }
}

function renderCamera() {
  const frame = currentFrame();
  const cameraPosition = turretPosition.clone()
    .addScaledVector(frame.forward, -4.5)
    .addScaledVector(frame.up, 1.3);
  camera.position.copy(cameraPosition);
  camera.lookAt(turretPosition.clone().addScaledVector(frame.forward, 38).addScaledVector(frame.up, 1.5));
}

function renderHealthBars() {
  for (const target of targets) {
    target.healthBar.step({
      position: target.position,
      cameraQuaternion: camera.quaternion,
      current: target.health,
      max: 70,
      visible: !target.destroyed,
    });
  }
}

function renderHud() {
  const remaining = targets.filter((target) => !target.destroyed).length;
  document.querySelector("#target-readout").textContent =
    state.status === "complete" ? "Range clear" : `${remaining} targets`;
  document.querySelector("#weapon-readout").textContent =
    `${state.message} | heat ${Math.round(weapon.gunHeat * 100)}%`;
}

function resize() {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function snapshot() {
  return {
    status: state.status,
    remaining: targets.filter((target) => !target.destroyed).length,
    projectileCount: projectiles.projectiles.length,
    heat: Number(weapon.gunHeat.toFixed(2)),
    yaw: Number(state.yaw.toFixed(2)),
    pitch: Number(state.pitch.toFixed(2)),
  };
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    fire();
  }
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});
window.addEventListener("blur", () => keys.clear());
document.querySelector("#reset-button").addEventListener("click", resetGame);

resetGame();

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000 || 1 / 60);
  lastTime = now;
  clock.advanceMs(deltaSeconds * 1000);
  state.elapsed += deltaSeconds;
  resize();
  stepInput(deltaSeconds);
  updateTurret();
  stepTargets(deltaSeconds);
  stepCombat(deltaSeconds);
  renderCamera();
  renderHealthBars();
  renderHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__turretRangeDebug = {
  ready: true,
  snapshot,
  complete: () => {
    for (const target of targets) {
      target.destroyed = true;
      target.group.visible = false;
      target.healthBar.group.visible = false;
    }
    state.status = "complete";
    state.message = "Range clear";
    return snapshot();
  },
  reset: () => {
    resetGame();
    return snapshot();
  },
};
