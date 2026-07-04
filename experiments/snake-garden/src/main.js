import "./styles.css";
import * as THREE from "three";
import { SnakeMotionController } from "@gameblocks/modules/actor-motion/SnakeMotionController.js";
import { SnakePlay, SNAKE_PLAY_EVENTS } from "@gameblocks/modules/gameplay/SnakePlay.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";
import { BoardEnvironment } from "@gameblocks/modules/world/environment/BoardEnvironment.js";

const basis = DEFAULT_WORLD_BASIS;
const columns = 15;
const rows = 15;
const targetScore = 8;
const playerId = "snake";

const state = {
  score: 0,
  status: "ready",
  message: "Press an arrow key",
  queuedDirection: null,
  tickTimer: 0,
  tickSeconds: 0.18,
};

const container = document.querySelector("#scene-root");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x183327, 1);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x183327);
scene.fog = new THREE.Fog(0x183327, 18, 46);

const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 120);
camera.position.set(7, 24, 7);
camera.lookAt(7, 0, 7);

const board = new BoardEnvironment({
  scene,
  columns,
  rows,
  cellSize: 1,
  boardUp: -0.08,
  gridUp: -0.06,
  groundColor: 0x234c36,
  gridColor: 0xb8ffcc,
  gridOpacity: 0.18,
  ambientIntensity: 0.62,
  keyLightIntensity: 1.1,
  keyLightPosition: { right: 8, up: 16, forward: 8 },
  basis,
}).create();

const snake = new SnakeMotionController({
  initialLength: 4,
  initialDirection: { right: 1, forward: 0 },
  startCell: { right: 5, forward: 7 },
});
let play = createSnakePlay();

const snakeGroup = new THREE.Group();
scene.add(snakeGroup);

const fruitMesh = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.34, 2),
  new THREE.MeshStandardMaterial({
    color: 0xff5f58,
    emissive: 0x721414,
    emissiveIntensity: 0.45,
    roughness: 0.52,
  })
);
fruitMesh.castShadow = true;
scene.add(fruitMesh);

const segmentGeometry = new THREE.BoxGeometry(0.82, 0.56, 0.82);
const headMaterial = new THREE.MeshStandardMaterial({ color: 0xd9ff72, roughness: 0.56 });
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x58d486, roughness: 0.68 });
let segmentMeshes = [];
let fruitCell = null;

function createSnakePlay() {
  const nextPlay = new SnakePlay({
    minRight: 0,
    maxRight: columns - 1,
    minForward: 0,
    maxForward: rows - 1,
  });
  nextPlay.addPlayer({ playerId, segments: snake.getSegments() });
  return nextPlay;
}

function cellKey(cell) {
  return `${cell.right}:${cell.forward}`;
}

function occupiedCells() {
  return new Set(snake.getSegments().map(cellKey));
}

function spawnFruit() {
  const occupied = occupiedCells();
  const options = [];
  for (let right = 1; right < columns - 1; right += 1) {
    for (let forward = 1; forward < rows - 1; forward += 1) {
      const cell = { right, forward };
      if (!occupied.has(cellKey(cell))) options.push(cell);
    }
  }
  fruitCell = options[(state.score * 7 + snake.length * 5 + 3) % options.length];
  play.addItem({ cell: fruitCell, growth: 1 });
  fruitMesh.position.copy(board.cellToWorldPoint(fruitCell, 0.46));
}

function resetGame() {
  state.score = 0;
  state.status = "ready";
  state.message = "Press an arrow key";
  state.queuedDirection = null;
  state.tickTimer = 0;
  snake.reset({
    initialLength: 4,
    direction: { right: 1, forward: 0 },
    startCell: { right: 5, forward: 7 },
  });
  play = createSnakePlay();
  spawnFruit();
}

function applyQueuedDirection() {
  const direction = state.queuedDirection ?? {};
  state.queuedDirection = null;
  return snake.move(direction);
}

function stepGame(deltaSeconds) {
  if (state.status !== "playing") return;
  state.tickTimer += deltaSeconds;
  while (state.tickTimer >= state.tickSeconds && state.status === "playing") {
    state.tickTimer -= state.tickSeconds;
    const motion = applyQueuedDirection();
    play.movePlayer({ playerId, segments: motion.segments });
    const events = play.step();
    for (const event of events) {
      if (event.type === SNAKE_PLAY_EVENTS.ITEM_PICKED_UP) {
        state.score += 1;
        snake.grow(event.growBy);
        play.items.clear();
        if (state.score >= targetScore) {
          state.status = "complete";
          state.message = "Garden clear";
        } else {
          spawnFruit();
        }
      }
      if (event.type === SNAKE_PLAY_EVENTS.PLAYER_DIED) {
        state.status = "failed";
        state.message = `Crashed: ${event.reason}`;
      }
    }
  }
}

function ensureSegmentMeshes(count) {
  while (segmentMeshes.length < count) {
    const mesh = new THREE.Mesh(segmentGeometry, bodyMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    snakeGroup.add(mesh);
    segmentMeshes.push(mesh);
  }
  for (let index = 0; index < segmentMeshes.length; index += 1) {
    segmentMeshes[index].visible = index < count;
  }
}

function renderSnake() {
  const segments = snake.getSegments();
  ensureSegmentMeshes(segments.length);
  segments.forEach((cell, index) => {
    const mesh = segmentMeshes[index];
    mesh.material = index === 0 ? headMaterial : bodyMaterial;
    mesh.position.copy(board.cellToWorldPoint(cell, index === 0 ? 0.44 : 0.34));
    mesh.scale.setScalar(index === 0 ? 1.08 : 1);
  });
  fruitMesh.visible = state.status === "ready" || state.status === "playing";
  fruitMesh.rotation.y += 0.035;
  fruitMesh.position.y = 0.46 + Math.sin(performance.now() * 0.006) * 0.08;
}

function renderHud() {
  document.querySelector("#score-readout").textContent = `${state.score} / ${targetScore}`;
  document.querySelector("#status-readout").textContent = state.message;
}

function resize() {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  const aspect = width / height;
  const viewSize = 18;
  camera.left = -viewSize * aspect * 0.5;
  camera.right = viewSize * aspect * 0.5;
  camera.top = viewSize * 0.5;
  camera.bottom = -viewSize * 0.5;
  camera.updateProjectionMatrix();
}

function snapshot() {
  return {
    status: state.status,
    score: state.score,
    targetScore,
    length: snake.length,
    head: snake.head,
    fruit: fruitCell,
    itemCount: play.getItemState().length,
  };
}

const keyMap = new Map([
  ["ArrowUp", { forward: true }],
  ["KeyW", { forward: true }],
  ["ArrowDown", { backward: true }],
  ["KeyS", { backward: true }],
  ["ArrowLeft", { left: true }],
  ["KeyA", { left: true }],
  ["ArrowRight", { right: true }],
  ["KeyD", { right: true }],
]);

window.addEventListener("keydown", (event) => {
  const direction = keyMap.get(event.code);
  if (!direction) return;
  event.preventDefault();
  if (state.status === "ready") {
    state.status = "playing";
    state.message = "Grow through the garden";
  }
  state.queuedDirection = direction;
});
document.querySelector("#reset-button").addEventListener("click", resetGame);

resetGame();

let lastTime = performance.now();
function frame(now) {
  const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000 || 1 / 60);
  lastTime = now;
  resize();
  stepGame(deltaSeconds);
  renderSnake();
  renderHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__snakeGardenDebug = {
  ready: true,
  snapshot,
  complete: () => {
    state.score = targetScore;
    state.status = "complete";
    state.message = "Garden clear";
    return snapshot();
  },
  reset: () => {
    resetGame();
    return snapshot();
  },
};
