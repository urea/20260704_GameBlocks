import * as THREE from "three";
import { BoardEnvironment } from "@gameblocks/modules/world/environment/BoardEnvironment.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";

const CELL_SIZE = 1;
const COLORS = {
  board: 0x27312c,
  grid: 0xd4f4d8,
  obstacle: 0x44313d,
  obstacleTop: 0x8e3f55,
  relay: 0x3bd6ad,
  relayHot: 0xe7f7a0,
  start: 0xf2a23a,
  goal: 0xbe6cff,
  path: 0x89f7c4,
  plan: 0xf0c56a,
  hover: 0xffffff,
  invalid: 0xff5f72,
};

function cellKey(cell) {
  return `${cell.right}:${cell.forward}`;
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    }
  });
}

function clearGroup(group) {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}

function makeMat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.65,
    metalness: options.metalness ?? 0.05,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.opacity != null && options.opacity < 1,
    opacity: options.opacity ?? 1,
  });
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function addEdges(mesh, color = 0xffffff, opacity = 0.22) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  mesh.add(edges);
  return edges;
}

export function createGameView({ container, onCellSelected, onRunFinished }) {
  const basis = DEFAULT_WORLD_BASIS;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#181a17");
  scene.fog = new THREE.Fog("#181a17", 16, 42);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const board = new BoardEnvironment({
    scene,
    columns: 9,
    rows: 9,
    cellSize: CELL_SIZE,
    backgroundScale: 1.08,
    boardUp: -0.09,
    gridUp: -0.065,
    groundColor: COLORS.board,
    gridColor: COLORS.grid,
    gridOpacity: 0.18,
    ambientIntensity: 0.52,
    keyLightIntensity: 1.05,
    keyLightPosition: { right: 4, up: 9, forward: 6 },
    basis,
  }).create();

  function frameCamera(aspect = 1) {
    const portraitScale = aspect < 0.78 ? Math.min(2, 0.88 / Math.max(0.36, aspect)) : 1;
    camera.fov = aspect < 0.78 ? 52 : 44;
    camera.position.set(5.6 * portraitScale, 8.2 * portraitScale, 8.4 * portraitScale);
    camera.lookAt(board.center.x, 0, board.center.z);
  }

  frameCamera();

  const fillLight = new THREE.DirectionalLight(0x99d8ff, 0.35);
  fillLight.position.set(-5, 6, -5);
  scene.add(fillLight);

  const cellsGroup = new THREE.Group();
  const markersGroup = new THREE.Group();
  const pathGroup = new THREE.Group();
  const hintGroup = new THREE.Group();
  const hoverGroup = new THREE.Group();
  scene.add(cellsGroup, markersGroup, pathGroup, hintGroup, hoverGroup);

  const hitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(board.columns * CELL_SIZE, board.rows * CELL_SIZE),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitPlane.position.copy(board.cellToWorldPoint(board.centerOffset, 0.02));
  hitPlane.quaternion.copy(basis.threePlaneCanonicalToBasisQuaternion());
  scene.add(hitPlane);

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 32, 20),
    makeMat(0xf8fff3, { emissive: 0x78ffbd, emissiveIntensity: 1.25, roughness: 0.25 })
  );
  orb.castShadow = true;
  const orbLight = new THREE.PointLight(0x72ffbd, 1.3, 4);
  orb.add(orbLight);
  scene.add(orb);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let snapshot = null;
  let hoveredCell = null;
  let runStartedAt = 0;
  let runDurationMs = 0;
  let runPath = null;
  let runReported = false;

  function cellToPosition(cell, up = 0) {
    return board.cellToWorldPoint(cell, up);
  }

  function cellToScreen(cell) {
    const position = cellToPosition(cell, 0.18).project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((position.x + 1) * 0.5 * rect.width),
      y: rect.top + ((1 - position.y) * 0.5 * rect.height),
    };
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
    if (!snapshot || snapshot.status === "running") return null;
    setPointer(event);
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObject(hitPlane, false);
    return hit ? worldToCell(hit.point) : null;
  }

  function isProtected(cell) {
    return snapshot?.protectedKeys.has(cellKey(cell)) ?? true;
  }

  function isPlaced(cell) {
    return snapshot?.placedKeys.has(cellKey(cell)) ?? false;
  }

  function cellIsPlaceable(cell) {
    if (!snapshot || !cell || isProtected(cell)) return false;
    return isPlaced(cell) || snapshot.used < snapshot.budget;
  }

  function createTile(cell, color, options = {}) {
    const height = options.height ?? 0.055;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(options.size ?? 0.86, height, options.size ?? 0.86),
      makeMat(color, {
        opacity: options.opacity ?? 1,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0,
        roughness: options.roughness ?? 0.7,
      })
    );
    mesh.position.copy(cellToPosition(cell, options.up ?? height * 0.5));
    mesh.receiveShadow = true;
    mesh.castShadow = Boolean(options.castShadow);
    return mesh;
  }

  function createRelay(cell, hot = false) {
    const relay = new THREE.Group();
    relay.position.copy(cellToPosition(cell, 0));

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.3, 0.72),
      makeMat(hot ? COLORS.relayHot : COLORS.relay, {
        emissive: hot ? 0xaaff64 : 0x0f7d61,
        emissiveIntensity: hot ? 0.32 : 0.18,
        roughness: 0.42,
      })
    );
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    addEdges(base, hot ? 0xfaffd8 : 0xd8fff3, 0.28);
    relay.add(base);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.08, 0.42),
      makeMat(0xf5ffee, { emissive: 0x97ffc9, emissiveIntensity: 0.55, roughness: 0.38 })
    );
    cap.position.y = 0.36;
    cap.castShadow = true;
    relay.add(cap);
    return relay;
  }

  function createObstacle(cell) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(cell, 0));
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.8, 0.78),
      makeMat(COLORS.obstacle, { roughness: 0.78, emissive: 0x1b0d14, emissiveIntensity: 0.2 })
    );
    body.position.y = 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    addEdges(body, 0xffb0c4, 0.16);
    group.add(body);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.08, 0.46),
      makeMat(COLORS.obstacleTop, { emissive: 0x361020, emissiveIntensity: 0.25 })
    );
    top.position.y = 0.84;
    top.castShadow = true;
    group.add(top);
    return group;
  }

  function createStart(cell) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(cell, 0));
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.44, 0.16, 28),
      makeMat(COLORS.start, { emissive: 0x7a3a07, emissiveIntensity: 0.22 })
    );
    base.position.y = 0.08;
    base.castShadow = true;
    group.add(base);
    const mast = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.56, 4),
      makeMat(0xffcf72, { emissive: 0xb06010, emissiveIntensity: 0.28 })
    );
    mast.position.y = 0.44;
    mast.rotation.y = Math.PI * 0.25;
    mast.castShadow = true;
    group.add(mast);
    return group;
  }

  function createGoal(cell) {
    const group = new THREE.Group();
    group.position.copy(cellToPosition(cell, 0));
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.14, 32),
      makeMat(0x6f46b7, { emissive: 0x33106a, emissiveIntensity: 0.28 })
    );
    base.position.y = 0.07;
    base.castShadow = true;
    group.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.055, 12, 36),
      makeMat(COLORS.goal, { emissive: 0x8e40ff, emissiveIntensity: 0.55, roughness: 0.36 })
    );
    ring.position.y = 0.48;
    ring.rotation.x = Math.PI * 0.5;
    ring.castShadow = true;
    group.add(ring);
    return group;
  }

  function createPathTube(path) {
    if (!path || path.length < 2) return null;
    const points = path.map((cell) => cellToPosition(cell, 0.42));
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.05);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(16, path.length * 8), 0.045, 10, false),
      makeMat(COLORS.path, {
        emissive: 0x37ff91,
        emissiveIntensity: 0.68,
        opacity: 0.9,
        roughness: 0.3,
      })
    );
    tube.name = "ActivePath";
    return tube;
  }

  function syncStaticObjects() {
    if (!snapshot) return;
    clearGroup(cellsGroup);
    clearGroup(markersGroup);
    clearGroup(pathGroup);
    clearGroup(hintGroup);

    for (const obstacle of snapshot.level.obstacles) {
      cellsGroup.add(createObstacle(obstacle));
    }

    const pathKeys = new Set((snapshot.path ?? []).map(cellKey));
    for (const anchor of snapshot.level.anchors) {
      markersGroup.add(createRelay(anchor, true));
    }
    for (const relay of snapshot.placed) {
      markersGroup.add(createRelay(relay, pathKeys.has(cellKey(relay))));
    }

    markersGroup.add(createStart(snapshot.level.start));
    markersGroup.add(createGoal(snapshot.level.goal));

    if (snapshot.planVisible && snapshot.planPath) {
      for (const cell of snapshot.planPath) {
        if (cellKey(cell) === cellKey(snapshot.level.start)) continue;
        if (cellKey(cell) === cellKey(snapshot.level.goal)) continue;
        const alreadyBuilt = snapshot.placedKeys.has(cellKey(cell));
        hintGroup.add(createTile(cell, COLORS.plan, {
          height: 0.035,
          size: alreadyBuilt ? 0.34 : 0.48,
          opacity: alreadyBuilt ? 0.32 : 0.42,
          up: 0.035,
          emissive: 0x906b18,
          emissiveIntensity: 0.18,
        }));
      }
    }

    if (snapshot.path) {
      for (const cell of snapshot.path) {
        pathGroup.add(createTile(cell, COLORS.path, {
          height: 0.035,
          size: 0.74,
          opacity: 0.24,
          up: 0.02,
          emissive: 0x48ff9a,
          emissiveIntensity: 0.25,
        }));
      }
      const tube = createPathTube(snapshot.path);
      if (tube) pathGroup.add(tube);
    }
  }

  function updateHover() {
    clearGroup(hoverGroup);
    if (!hoveredCell || !snapshot || snapshot.status === "running") return;
    const valid = cellIsPlaceable(hoveredCell);
    hoverGroup.add(createTile(hoveredCell, valid ? COLORS.hover : COLORS.invalid, {
      height: 0.045,
      size: 0.9,
      opacity: valid ? 0.22 : 0.18,
      up: 0.05,
      emissive: valid ? 0x446666 : 0x66202b,
      emissiveIntensity: 0.12,
    }));
  }

  function updateOrb(now) {
    if (!snapshot) return;
    if (snapshot.status === "running" && runPath?.length > 1) {
      const progress = Math.min(1, (now - runStartedAt) / runDurationMs);
      const segmentValue = progress * (runPath.length - 1);
      const segmentIndex = Math.min(runPath.length - 2, Math.floor(segmentValue));
      const segmentT = easeInOut(segmentValue - segmentIndex);
      const from = cellToPosition(runPath[segmentIndex], 0.55);
      const to = cellToPosition(runPath[segmentIndex + 1], 0.55);
      orb.position.copy(from.lerp(to, segmentT));
      orb.scale.setScalar(1 + Math.sin(now * 0.015) * 0.08);
      if (progress >= 1 && !runReported) {
        runReported = true;
        window.setTimeout(() => onRunFinished?.(), 120);
      }
      return;
    }

    const idleTarget = snapshot.connected
      ? snapshot.path[0]
      : snapshot.level.start;
    const bob = Math.sin(now * 0.003) * 0.08;
    orb.position.copy(cellToPosition(idleTarget, 0.52 + bob));
    orb.scale.setScalar(snapshot.status === "complete" ? 1.22 : 1);
  }

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    camera.aspect = width / Math.max(1, height);
    frameCamera(camera.aspect);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function animate(now) {
    updateOrb(now);
    pathGroup.rotation.y = Math.sin(now * 0.0012) * 0.002;
    renderer.render(scene, camera);
  }

  function sync(nextSnapshot) {
    const previousStatus = snapshot?.status;
    const previousLevel = snapshot?.level.id;
    const previousSignature = JSON.stringify({
      level: nextSnapshot.level.id,
      placed: nextSnapshot.placed.map(cellKey).sort(),
      path: nextSnapshot.path?.map(cellKey) ?? [],
      plan: nextSnapshot.planVisible,
      status: nextSnapshot.status,
    });
    const currentSignature = snapshot?._signature;
    snapshot = { ...nextSnapshot, _signature: previousSignature };

    if (previousStatus !== "running" && snapshot.status === "running") {
      runPath = snapshot.path;
      runStartedAt = performance.now();
      runDurationMs = Math.max(900, (runPath.length - 1) * 280);
      runReported = false;
    }

    if (previousLevel !== snapshot.level.id || currentSignature !== previousSignature) {
      syncStaticObjects();
      updateHover();
    }
  }

  renderer.domElement.addEventListener("pointermove", (event) => {
    hoveredCell = pickCell(event);
    updateHover();
  });
  renderer.domElement.addEventListener("pointerleave", () => {
    hoveredCell = null;
    updateHover();
  });
  renderer.domElement.addEventListener("pointerdown", (event) => {
    const cell = pickCell(event);
    if (cell) onCellSelected?.(cell);
  });

  window.addEventListener("resize", resize);
  renderer.setAnimationLoop(animate);
  resize();

  return {
    sync,
    cellToScreen,
    dispose() {
      window.removeEventListener("resize", resize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
    },
  };
}
