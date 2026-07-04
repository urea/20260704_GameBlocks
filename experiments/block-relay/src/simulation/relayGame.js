import { GridPathPlanner, gridCellKey } from "@gameblocks/modules/behavior/GridPathPlanner.js";

const NAVIGATION = Object.freeze({
  vectors: Object.freeze({
    east: Object.freeze({ right: 1, forward: 0 }),
    south: Object.freeze({ right: 0, forward: 1 }),
    west: Object.freeze({ right: -1, forward: 0 }),
    north: Object.freeze({ right: 0, forward: -1 }),
  }),
  neighborOrder: Object.freeze(["east", "south", "west", "north"]),
});

function cloneCell(cell) {
  return { right: cell.right, forward: cell.forward };
}

function buildCellSet(cells = []) {
  return new Set(cells.map((cell) => gridCellKey(cell)));
}

function listAllCells(columns, rows) {
  const cells = [];
  for (let forward = 0; forward < rows; forward += 1) {
    for (let right = 0; right < columns; right += 1) {
      cells.push({ right, forward });
    }
  }
  return cells;
}

function keyToCell(key) {
  const [right, forward] = key.split(":").map(Number);
  return { right, forward };
}

function sameCell(a, b) {
  return a?.right === b?.right && a?.forward === b?.forward;
}

export function createRelayGame(levels) {
  let levelIndex = 0;
  let placedKeys = new Set();
  let planVisible = false;
  let status = "editing";
  let path = null;
  let planPath = null;
  let lastOutcome = "";
  let snapshot = null;
  const listeners = new Set();

  function currentLevel() {
    return levels[levelIndex];
  }

  function createPlanner(level) {
    return new GridPathPlanner({
      navigation: NAVIGATION,
      columns: level.columns,
      rows: level.rows,
      wrap: false,
    });
  }

  function protectedKeys(level) {
    return buildCellSet([
      level.start,
      level.goal,
      ...(level.anchors ?? []),
      ...(level.obstacles ?? []),
    ]);
  }

  function traversableKeys(level) {
    return new Set([
      gridCellKey(level.start),
      gridCellKey(level.goal),
      ...(level.anchors ?? []).map((cell) => gridCellKey(cell)),
      ...placedKeys,
    ]);
  }

  function findActivePath(level) {
    const planner = createPlanner(level);
    const allowed = traversableKeys(level);
    const blocked = listAllCells(level.columns, level.rows)
      .filter((cell) => !allowed.has(gridCellKey(cell)));
    return planner.findPath(level.start, level.goal, blocked, true, true, false);
  }

  function findPlanPath(level) {
    const planner = createPlanner(level);
    return planner.findPath(level.start, level.goal, level.obstacles ?? [], true, true, false);
  }

  function evaluate() {
    const level = currentLevel();
    path = findActivePath(level);
    planPath = findPlanPath(level);
    if (status !== "running" && status !== "complete") {
      status = path ? "connected" : "editing";
    }
    snapshot = makeSnapshot();
  }

  function makeSnapshot() {
    const level = currentLevel();
    const protectedSet = protectedKeys(level);
    return {
      levelIndex,
      levelCount: levels.length,
      level: {
        ...level,
        start: cloneCell(level.start),
        goal: cloneCell(level.goal),
        anchors: (level.anchors ?? []).map(cloneCell),
        obstacles: (level.obstacles ?? []).map(cloneCell),
      },
      status,
      outcome: lastOutcome,
      placed: [...placedKeys].map(keyToCell),
      placedKeys: new Set(placedKeys),
      protectedKeys: protectedSet,
      path: path?.map(cloneCell) ?? null,
      connected: Boolean(path),
      planVisible,
      planPath: planVisible ? planPath?.map(cloneCell) ?? null : null,
      budget: level.budget,
      used: placedKeys.size,
      remaining: Math.max(0, level.budget - placedKeys.size),
      canRun: Boolean(path) && status !== "running",
      canAdvance: status === "complete",
    };
  }

  function emit() {
    const nextSnapshot = snapshot ?? makeSnapshot();
    for (const listener of listeners) listener(nextSnapshot);
  }

  function resetLevel() {
    placedKeys = new Set();
    planVisible = false;
    status = "editing";
    lastOutcome = "";
    evaluate();
    emit();
  }

  function start() {
    resetLevel();
  }

  function subscribe(listener) {
    listeners.add(listener);
    if (snapshot) listener(snapshot);
    return () => listeners.delete(listener);
  }

  function getSnapshot() {
    return snapshot;
  }

  function toggleRelay(cell) {
    const level = currentLevel();
    if (status === "running" || !cell) return;
    if (
      cell.right < 0 ||
      cell.right >= level.columns ||
      cell.forward < 0 ||
      cell.forward >= level.rows
    ) {
      return;
    }

    const key = gridCellKey(cell);
    const blocked = protectedKeys(level);
    if (blocked.has(key)) return;

    if (placedKeys.has(key)) {
      placedKeys.delete(key);
      lastOutcome = "";
    } else if (placedKeys.size < level.budget) {
      placedKeys.add(key);
      lastOutcome = "";
    } else {
      lastOutcome = "No blocks left";
    }
    status = "editing";
    evaluate();
    emit();
  }

  function run() {
    if (status === "running") return;
    evaluate();
    if (!path) {
      lastOutcome = "Route open";
      emit();
      return;
    }
    status = "running";
    lastOutcome = "Signal live";
    snapshot = makeSnapshot();
    emit();
  }

  function finishRun() {
    if (status !== "running") return;
    status = "complete";
    lastOutcome = sameCell(path?.at(-1), currentLevel().goal) ? "Gate linked" : "";
    snapshot = makeSnapshot();
    emit();
  }

  function togglePlan() {
    if (status === "running") return;
    planVisible = !planVisible;
    evaluate();
    emit();
  }

  function nextLevel() {
    if (status !== "complete") return;
    levelIndex = (levelIndex + 1) % levels.length;
    resetLevel();
  }

  return {
    start,
    subscribe,
    getSnapshot,
    toggleRelay,
    togglePlan,
    resetLevel,
    nextLevel,
    run,
    finishRun,
  };
}
