import { TOOL_ORDER } from "../simulation/parts.js";

export function createHud({
  onTool,
  onRotate,
  onHint,
  onClear,
  onRun,
  onReset,
  onNext,
}) {
  const refs = {
    levelName: document.querySelector("#level-name"),
    status: document.querySelector("#status-chip"),
    parts: document.querySelector("#parts-value"),
    time: document.querySelector("#time-value"),
    stage: document.querySelector("#stage-value"),
    rotate: document.querySelector("#rotate-button"),
    hint: document.querySelector("#hint-button"),
    clear: document.querySelector("#clear-button"),
    run: document.querySelector("#run-button"),
    reset: document.querySelector("#reset-button"),
    next: document.querySelector("#next-button"),
    tools: Object.fromEntries(
      TOOL_ORDER.map((tool) => [tool, document.querySelector(`#tool-${tool}`)])
    ),
    counts: Object.fromEntries(
      TOOL_ORDER.map((tool) => [tool, document.querySelector(`#count-${tool}`)])
    ),
  };

  for (const tool of TOOL_ORDER) {
    refs.tools[tool].addEventListener("click", () => onTool(tool));
  }
  refs.rotate.addEventListener("click", onRotate);
  refs.hint.addEventListener("click", onHint);
  refs.clear.addEventListener("click", onClear);
  refs.run.addEventListener("click", onRun);
  refs.reset.addEventListener("click", onReset);
  refs.next.addEventListener("click", onNext);

  function statusText(snapshot) {
    if (snapshot.phase === "won") return "Solved";
    if (snapshot.phase === "failed") return snapshot.status || "Try again";
    if (snapshot.phase === "running") return "Running";
    if (snapshot.blueprintVisible) return "Plan";
    return "Build";
  }

  function render(snapshot) {
    refs.levelName.textContent = snapshot.level.name;
    refs.status.textContent = statusText(snapshot);
    refs.status.dataset.phase = snapshot.phase;
    refs.parts.textContent = `${snapshot.totalParts - snapshot.usedParts}/${snapshot.totalParts}`;
    refs.time.textContent = snapshot.phase === "build" ? snapshot.level.timeLimit.toFixed(0) : snapshot.elapsed.toFixed(1);
    refs.stage.textContent = `${snapshot.levelIndex + 1}/${snapshot.levelCount}`;

    for (const tool of TOOL_ORDER) {
      refs.tools[tool].classList.toggle("is-active", snapshot.selectedTool === tool);
      refs.tools[tool].disabled = !snapshot.canEdit || (snapshot.inventory[tool] ?? 0) <= 0;
      refs.counts[tool].textContent = `${snapshot.remaining[tool] ?? 0}`;
    }

    refs.rotate.disabled = !snapshot.canEdit;
    refs.hint.disabled = !snapshot.canEdit;
    refs.clear.disabled = !snapshot.canEdit || snapshot.usedParts === 0;
    refs.run.disabled = snapshot.phase === "running";
    refs.reset.disabled = snapshot.phase === "build" && snapshot.elapsed === 0;
    refs.next.disabled = !snapshot.canAdvance;
    refs.hint.classList.toggle("is-active", snapshot.blueprintVisible);
    refs.next.classList.toggle("is-ready", snapshot.canAdvance);
  }

  return { render };
}
