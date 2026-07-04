import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { BoardEnvironment } from "@gameblocks/modules/world/environment/BoardEnvironment.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";
import { createRunWorld } from "../physics/createRunWorld.js";
import { cellKey, rotationToRadians, rotationToVector } from "../simulation/parts.js";

const CELL_SIZE = 1;
const COLORS = {
  board: 0x252e2d,
  grid: 0xdceadf,
  start: 0xf1b14d,
  goal: 0xa982ff,
  fan: 0x67d9c0,
  ramp: 0xf0b95b,
  wall: 0xd86b7b,
  bumper: 0xa982ff,
  blueprint: 0x7fb6ff,
  ghostValid: 0xffffff,
  ghostInvalid: 0xff6a77,
};

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.58,
    metalness: options.metalness ?? 0.06,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.opacity != null && options.opacity < 1,
    opacity: options.opacity ?? 1,
  });
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const entry of materials) entry.dispose();
    }
  });
}

function clearGroup(group) {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}

function addEdges(mesh, color = 0xffffff, opacity = 0.2) {
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  mesh.add(lines);
  return lines;
}

function createArrow(color = 0xffffff) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.04, 0.08),
    material(color, { emissive: color, emissiveIntensity: 0.18 })
  );
  shaft.position.x = 0.08;
  group.add(shaft);
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.22, 3),
    material(color, { emissive: color, emissiveIntensity: 0.18 })
  );
  head.rotation.z = -Math.PI * 0.5;
  head.position.x = 0.36;
  group.add(head);
  return group;
}

function setWorldDirection(group, rotation) {
  group.rotation.y = rotationToRadians(rotation);
  return group;
}

export async function createContraptionView({ container, onCellSelected, onRunEvent }) {
  await RAPIER.init();

  const basis = DEFAULT_WORLD_BASIS;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#17191b");
  scene.fog = new THREE.Fog("#17191b", 14, 40);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const board = new BoardEnvironment({
    scene,
    columns: 10,
    rows: 8,
    cellSize: CELL_SIZE,
    backgroundScale: 1.1,
    boardUp: -0.1,
    gridUp: -0.067,
    groundColor: COLORS.board,
    gridColor: COLORS.grid,
    gridOpacity: 0.2,
    ambientIntensity: 0.48,
    keyLightIntensity: 1.1,
    keyLightPosition: { right: 5, up: 10, forward: 7 },
    basis,
  }).create();

  const fill = new THREE.DirectionalLight(0x8fc9ff, 0.35);
  fill.position.set(-4, 7, -6);
  scene.add(fill);

  const obstacleGroup = new THREE.Group();
  const fixedGroup = new THREE.Group();
  const placedGroup = new THREE.Group();
  const blueprintGroup = new THREE.Group();
  const ghostGroup = new THREE.Group();
  scene.add(obstacleGroup, fixedGroup, placedGroup, blueprintGroup, ghostGroup);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 36, 24),
    material(0xf8fff7, { roughness: 0.25, emissive: 0x67d9c0, emissiveIntensity: 0.45 })
  );
  ball.castShadow = true;
  const ballLight = new THREE.PointLight(0x9fffe7, 1, 3.5);
  ball.add(ballLight);
  scene.add(ball);

  const hitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitPlane.position.copy(board.cellToWorldPoint({ right: 4.5, forward: 3.5 }, 0.02));
  hitPlane.quaternion.copy(basis.threePlaneCanonicalToBasisQuaternion());
  scene.add(hitPlane);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let snapshot = null;
  let hoverCell = null;
  let renderSignature = "";
  let runWorld = null;
  let runFinished = false;
  let lastFrame = performance.now();

  function cellToPosition(cell, up = 0) {
    return board.cellToWorldPoint(cell, up);
  }

  function cellToScreen(cell) {
    const position = cellToPosition(cell, 0.2).project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((position.x + 1) * 0.5 * rect.width),
      y: rect.top + ((1 - position.y) * 0.5 * rect.height),
    };
  }

  function frameCamera(aspect = 1) {
    const portraitScale = aspect < 0.78 ? Math.min(2.05, 0.86 / Math.max(0.36, aspect)) : 1;
    camera.fov = aspect < 0.78 ? 51 : 43;
    camera.position.set(5.8 * portraitScale, 8.3 * portraitScale, 8.2 * portraitScale);
    camera.lookAt(board.center.x, 0, board.center.z);
  }

  function worldToCell(point) {
    const planar = basis.toPlanar(point, {});
    const origin = basis.toPlanar(board.origin, {});
    const right = Math.round((planar.right - origin.right) / CELL_SIZE);
    const forward = Math.round((planar.forward - origin.forward) / CELL_SIZE);
    if (!snapshot) return null;
    if (
      right < 0 ||
      right >= snapshot.level.columns ||
      forward < 0 ||
      forward >= snapshot.level.rows
    ) {
      return null;
    }
    return { right, forward };
  }

  function setPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function pickCell(event) {
    if (!snapshot?.canEdit) return null;
    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObject(hitPlane, false);
    return hit ? worldToCell(hit.point) : null;
  }

  function cellIsProtected(cell) {
    return snapshot?.protectedKeys.has(cellKey(cell)) ?? true;
  }

  function inventoryRemainingForSelected(cell) {
    const existing = snapshot.placed.find((part) => cellKey(part.cell) === cellKey(cell));
    if (existing) return true;
    return (snapshot.remaining[snapshot.selectedTool] ?? 0) > 0;
  }

  function cellIsPlaceable(cell) {
    return Boolean(snapshot?.canEdit && cell && !cellIsProtected(cell) && inventoryRemainingForSelected(cell));
  }

  function createObstacle(obstacle) {
    const height = obstacle.low ? 0.42 : 0.78;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, height, 0.88),
      material(obstacle.low ? 0x804250 : COLORS.wall, {
        emissive: obstacle.low ? 0x2b1118 : 0x321018,
        emissiveIntensity: 0.15,
      })
    );
    mesh.position.copy(cellToPosition(obstacle, height * 0.5));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addEdges(mesh, 0xffb0bd, 0.16);
    return mesh;
  }

  function createLauncher(start) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(start, 0));
    group.rotation.y = rotationToRadians(start.rotation ?? 0);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.46, 0.18, 32),
      material(COLORS.start, { emissive: 0x6a3b09, emissiveIntensity: 0.18 })
    );
    base.position.y = 0.09;
    base.castShadow = true;
    group.add(base);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.16, 0.24),
      material(0xffd98a, { emissive: 0x7a4d10, emissiveIntensity: 0.2 })
    );
    rail.position.set(0.22, 0.3, 0);
    rail.castShadow = true;
    group.add(rail);
    return group;
  }

  function createGoal(goal) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(goal, 0));

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.54, 0.16, 36),
      material(0x5940a0, { emissive: 0x241060, emissiveIntensity: 0.24 })
    );
    base.position.y = 0.08;
    base.castShadow = true;
    group.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.06, 12, 44),
      material(COLORS.goal, { emissive: 0x7d49ff, emissiveIntensity: 0.55 })
    );
    ring.position.y = 0.46;
    ring.rotation.x = Math.PI * 0.5;
    ring.castShadow = true;
    group.add(ring);
    return group;
  }

  function createFan(part, opacity = 1) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(part.cell, 0));
    setWorldDirection(group, part.rotation);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.18, 0.58),
      material(COLORS.fan, { opacity, emissive: 0x147a66, emissiveIntensity: 0.2 })
    );
    base.position.y = 0.09;
    base.castShadow = true;
    group.add(base);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.34, 16),
      material(0xc9fff3, { opacity, emissive: 0x67d9c0, emissiveIntensity: 0.2 })
    );
    mast.position.y = 0.34;
    mast.castShadow = true;
    group.add(mast);

    const fan = new THREE.Group();
    fan.position.y = 0.55;
    for (let index = 0; index < 3; index += 1) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.33, 0.035, 0.08),
        material(0xf1fffb, { opacity, emissive: 0x67d9c0, emissiveIntensity: 0.22 })
      );
      blade.position.x = 0.17;
      blade.rotation.y = index * (Math.PI * 2 / 3);
      fan.add(blade);
    }
    group.add(fan);

    const arrow = createArrow(0xeffff9);
    arrow.position.y = 0.76;
    group.add(arrow);
    return group;
  }

  function createRamp(part, opacity = 1) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(part.cell, 0.21));
    setWorldDirection(group, part.rotation);

    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.16, 0.82),
      material(COLORS.ramp, { opacity, emissive: 0x7a5414, emissiveIntensity: 0.16 })
    );
    ramp.rotation.z = -0.42;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    addEdges(ramp, 0xffefba, 0.22);
    group.add(ramp);

    const arrow = createArrow(0x3b2b0b);
    arrow.position.set(0.08, 0.19, 0);
    group.add(arrow);
    return group;
  }

  function createWall(part, opacity = 1) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(part.cell, 0.35));
    setWorldDirection(group, part.rotation);
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.7, 0.34),
      material(COLORS.wall, { opacity, emissive: 0x2e1117, emissiveIntensity: 0.18 })
    );
    wall.castShadow = true;
    wall.receiveShadow = true;
    addEdges(wall, 0xffbec9, 0.17);
    group.add(wall);
    return group;
  }

  function createBumper(part, opacity = 1) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(part.cell, 0));
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.38, 0.62, 36),
      material(COLORS.bumper, { opacity, emissive: 0x4b24a8, emissiveIntensity: 0.3 })
    );
    body.position.y = 0.31;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.035, 10, 36),
      material(0xf5eaff, { opacity, emissive: 0xa982ff, emissiveIntensity: 0.5 })
    );
    ring.position.y = 0.65;
    ring.rotation.x = Math.PI * 0.5;
    group.add(ring);
    return group;
  }

  function createPart(part, opacity = 1) {
    if (part.type === "fan") return createFan(part, opacity);
    if (part.type === "ramp") return createRamp(part, opacity);
    if (part.type === "wall") return createWall(part, opacity);
    return createBumper(part, opacity);
  }

  function createGhost(cell, valid) {
    const part = {
      type: snapshot.selectedTool,
      rotation: snapshot.selectedRotation,
      cell,
    };
    const group = createPart(part, valid ? 0.42 : 0.24);
    group.traverse((child) => {
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const entry of materials) {
          entry.color.setHex(valid ? COLORS.ghostValid : COLORS.ghostInvalid);
          entry.emissive.setHex(valid ? 0x5a7a76 : 0x5a1118);
          entry.transparent = true;
        }
      }
    });
    return group;
  }

  function rebuildStatic() {
    if (!snapshot) return;
    clearGroup(obstacleGroup);
    clearGroup(fixedGroup);
    clearGroup(placedGroup);
    clearGroup(blueprintGroup);

    for (const obstacle of snapshot.level.obstacles) {
      obstacleGroup.add(createObstacle(obstacle));
    }
    fixedGroup.add(createLauncher(snapshot.level.start));
    fixedGroup.add(createGoal(snapshot.level.goal));
    for (const part of snapshot.fixedParts) {
      fixedGroup.add(createPart(part, 1));
    }
    for (const part of snapshot.placed) {
      placedGroup.add(createPart(part, 1));
    }
    if (snapshot.blueprintVisible) {
      const occupied = new Set(snapshot.placed.map((part) => cellKey(part.cell)));
      for (const part of snapshot.blueprint) {
        if (occupied.has(cellKey(part.cell))) continue;
        blueprintGroup.add(createPart(part, 0.24));
      }
    }
  }

  function updateGhost() {
    clearGroup(ghostGroup);
    if (!hoverCell || !snapshot?.canEdit) return;
    ghostGroup.add(createGhost(hoverCell, cellIsPlaceable(hoverCell)));
  }

  function resetBallToStart() {
    if (!snapshot) return;
    ball.position.copy(cellToPosition(snapshot.level.start, 0.48));
    ball.visible = true;
  }

  function ensureRunWorld() {
    if (runWorld || !snapshot || snapshot.phase !== "running") return;
    runWorld = createRunWorld({ RAPIER, snapshot, board, basis });
    runFinished = false;
  }

  function destroyRunWorld() {
    if (!runWorld) return;
    runWorld.dispose();
    runWorld = null;
    runFinished = false;
  }

  function sync(nextSnapshot) {
    const wasRunning = snapshot?.phase === "running";
    snapshot = nextSnapshot;

    const nextSignature = JSON.stringify({
      level: snapshot.level.id,
      placed: snapshot.placed.map((part) => `${part.type}:${part.rotation}:${cellKey(part.cell)}`).sort(),
      blueprint: snapshot.blueprintVisible,
      selected: `${snapshot.selectedTool}:${snapshot.selectedRotation}`,
      phase: snapshot.phase,
    });
    if (renderSignature !== nextSignature) {
      renderSignature = nextSignature;
      rebuildStatic();
      updateGhost();
    }

    if (snapshot.phase === "running") {
      ensureRunWorld();
    } else {
      if (wasRunning) destroyRunWorld();
      resetBallToStart();
    }
  }

  function animate(now) {
    const delta = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    if (runWorld && snapshot?.phase === "running") {
      const result = runWorld.step(delta);
      const bodyPosition = runWorld.ballBody.translation();
      const bodyRotation = runWorld.ballBody.rotation();
      ball.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
      ball.quaternion.set(bodyRotation.x, bodyRotation.y, bodyRotation.z, bodyRotation.w);

      if (result.type === "tick") {
        onRunEvent?.(result);
      } else if (!runFinished) {
        runFinished = true;
        onRunEvent?.(result);
      }
    }

    const t = now * 0.001;
    ballLight.intensity = 0.8 + Math.sin(t * 5) * 0.18;
    blueprintGroup.position.y = Math.sin(t * 2.3) * 0.015;
    renderer.render(scene, camera);
  }

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    camera.aspect = width / Math.max(1, height);
    frameCamera(camera.aspect);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  renderer.domElement.addEventListener("pointermove", (event) => {
    hoverCell = pickCell(event);
    updateGhost();
  });
  renderer.domElement.addEventListener("pointerleave", () => {
    hoverCell = null;
    updateGhost();
  });
  renderer.domElement.addEventListener("pointerdown", (event) => {
    const cell = pickCell(event);
    if (cell && cellIsPlaceable(cell)) onCellSelected?.(cell);
  });

  window.addEventListener("resize", resize);
  renderer.setAnimationLoop(animate);
  resize();

  return {
    sync,
    cellToScreen,
    dispose() {
      destroyRunWorld();
      window.removeEventListener("resize", resize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
    },
  };
}
