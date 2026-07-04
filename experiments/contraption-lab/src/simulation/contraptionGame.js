import { TOOL_ORDER, cellKey, clonePart, partKey } from "./parts.js";

function cloneCell(cell) {
  return { right: cell.right, forward: cell.forward };
}

function cloneLevel(level) {
  return {
    ...level,
    start: { ...level.start },
    goal: cloneCell(level.goal),
    obstacles: (level.obstacles ?? []).map((entry) => ({ ...entry })),
    fixedParts: (level.fixedParts ?? []).map(clonePart),
    solution: (level.solution ?? []).map(clonePart),
    inventory: { ...level.inventory },
  };
}

function inventoryUsed(parts) {
  const used = {};
  for (const part of parts) {
    used[part.type] = (used[part.type] ?? 0) + 1;
  }
  return used;
}

function chooseInitialTool(level) {
  return TOOL_ORDER.find((tool) => (level.inventory[tool] ?? 0) > 0) ?? "fan";
}

export function createContraptionGame(levels) {
  let levelIndex = 0;
  let selectedTool = chooseInitialTool(levels[0]);
  let selectedRotation = 0;
  let placed = [];
  let phase = "build";
  let blueprintVisible = false;
  let elapsed = 0;
  let status = "";
  let snapshot = null;
  const listeners = new Set();

  function level() {
    return levels[levelIndex];
  }

  function protectedKeys(currentLevel = level()) {
    return new Set([
      cellKey(currentLevel.start),
      cellKey(currentLevel.goal),
      ...(currentLevel.obstacles ?? []).map(cellKey),
      ...(currentLevel.fixedParts ?? []).map((part) => partKey(part)),
    ]);
  }

  function makeSnapshot() {
    const currentLevel = cloneLevel(level());
    const used = inventoryUsed(placed);
    const remaining = {};
    let total = 0;
    let usedTotal = 0;
    for (const tool of TOOL_ORDER) {
      const count = currentLevel.inventory[tool] ?? 0;
      const spent = used[tool] ?? 0;
      remaining[tool] = Math.max(0, count - spent);
      total += count;
      usedTotal += spent;
    }

    return {
      level: currentLevel,
      levelIndex,
      levelCount: levels.length,
      selectedTool,
      selectedRotation,
      phase,
      status,
      elapsed,
      placed: placed.map(clonePart),
      fixedParts: currentLevel.fixedParts.map(clonePart),
      protectedKeys: protectedKeys(currentLevel),
      blueprintVisible,
      blueprint: blueprintVisible ? currentLevel.solution.map(clonePart) : [],
      inventory: { ...currentLevel.inventory },
      remaining,
      totalParts: total,
      usedParts: usedTotal,
      canRun: phase === "build" || phase === "failed" || phase === "won",
      canEdit: phase !== "running",
      canAdvance: phase === "won",
    };
  }

  function emit() {
    snapshot = makeSnapshot();
    for (const listener of listeners) listener(snapshot);
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

  function resetLevel() {
    const currentLevel = level();
    selectedTool = chooseInitialTool(currentLevel);
    selectedRotation = 0;
    placed = [];
    phase = "build";
    elapsed = 0;
    status = "";
    blueprintVisible = false;
    emit();
  }

  function resetRun() {
    phase = "build";
    elapsed = 0;
    status = "";
    emit();
  }

  function selectTool(tool) {
    if (!TOOL_ORDER.includes(tool) || phase === "running") return;
    selectedTool = tool;
    emit();
  }

  function rotateSelectedPart() {
    if (phase === "running") return;
    selectedRotation = (selectedRotation + 1) % 4;
    emit();
  }

  function clearPlacedParts() {
    if (phase === "running") return;
    placed = [];
    phase = "build";
    status = "";
    emit();
  }

  function placeSelectedPart(cell) {
    const currentLevel = level();
    if (phase === "running" || !cell) return;
    if (
      cell.right < 0 ||
      cell.right >= currentLevel.columns ||
      cell.forward < 0 ||
      cell.forward >= currentLevel.rows
    ) {
      return;
    }

    const key = cellKey(cell);
    if (protectedKeys(currentLevel).has(key)) return;

    const existingIndex = placed.findIndex((part) => partKey(part) === key);
    if (existingIndex >= 0) {
      const existing = placed[existingIndex];
      if (existing.type === selectedTool && existing.rotation === selectedRotation) {
        placed.splice(existingIndex, 1);
      } else {
        const nextPlaced = placed.filter((_, index) => index !== existingIndex);
        const usedWithoutExisting = inventoryUsed(nextPlaced);
        if ((usedWithoutExisting[selectedTool] ?? 0) >= (currentLevel.inventory[selectedTool] ?? 0)) {
          status = "No parts left";
          emit();
          return;
        }
        placed = [
          ...nextPlaced,
          { type: selectedTool, cell: cloneCell(cell), rotation: selectedRotation },
        ];
      }
    } else {
      const used = inventoryUsed(placed);
      if ((used[selectedTool] ?? 0) >= (currentLevel.inventory[selectedTool] ?? 0)) {
        status = "No parts left";
        emit();
        return;
      }
      placed.push({ type: selectedTool, cell: cloneCell(cell), rotation: selectedRotation });
    }
    phase = "build";
    status = "";
    emit();
  }

  function toggleBlueprint() {
    if (phase === "running") return;
    blueprintVisible = !blueprintVisible;
    emit();
  }

  function placeSolution() {
    if (phase === "running") return;
    placed = level().solution.map(clonePart);
    phase = "build";
    status = "";
    emit();
  }

  function startRun() {
    if (phase === "running") return;
    phase = "running";
    elapsed = 0;
    status = "Running";
    emit();
  }

  function applyRunEvent(event) {
    if (phase !== "running") return;
    if (event.type === "tick") {
      elapsed = event.elapsed;
      snapshot = makeSnapshot();
      for (const listener of listeners) listener(snapshot);
      return;
    }
    if (event.type === "won") {
      phase = "won";
      elapsed = event.elapsed;
      status = "Solved";
      emit();
      return;
    }
    if (event.type === "failed") {
      phase = "failed";
      elapsed = event.elapsed;
      status = event.reason ?? "Try again";
      emit();
    }
  }

  function nextLevel() {
    if (phase !== "won") return;
    levelIndex = (levelIndex + 1) % levels.length;
    resetLevel();
  }

  return {
    start,
    subscribe,
    getSnapshot,
    selectTool,
    rotateSelectedPart,
    placeSelectedPart,
    toggleBlueprint,
    clearPlacedParts,
    placeSolution,
    startRun,
    resetRun,
    applyRunEvent,
    nextLevel,
  };
}
