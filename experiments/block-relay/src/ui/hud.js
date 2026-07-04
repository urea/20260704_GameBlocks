export function createHud({ onRun, onPlan, onReset, onNext }) {
  const refs = {
    levelName: document.querySelector("#level-name"),
    status: document.querySelector("#status-chip"),
    blocks: document.querySelector("#blocks-value"),
    route: document.querySelector("#route-value"),
    level: document.querySelector("#level-value"),
    run: document.querySelector("#run-button"),
    plan: document.querySelector("#plan-button"),
    reset: document.querySelector("#reset-button"),
    next: document.querySelector("#next-button"),
  };

  refs.run.addEventListener("click", onRun);
  refs.plan.addEventListener("click", onPlan);
  refs.reset.addEventListener("click", onReset);
  refs.next.addEventListener("click", onNext);

  function statusText(snapshot) {
    if (snapshot.outcome) return snapshot.outcome;
    if (snapshot.status === "complete") return "Gate linked";
    if (snapshot.status === "running") return "Signal live";
    if (snapshot.connected) return "Connected";
    return "Open route";
  }

  function render(snapshot) {
    refs.levelName.textContent = snapshot.level.name;
    refs.status.textContent = statusText(snapshot);
    refs.status.dataset.state = snapshot.status;
    refs.blocks.textContent = `${snapshot.remaining}/${snapshot.budget}`;
    refs.route.textContent = snapshot.path ? `${snapshot.path.length - 1}` : "--";
    refs.level.textContent = `${snapshot.levelIndex + 1}/${snapshot.levelCount}`;
    refs.run.disabled = !snapshot.canRun || snapshot.status === "complete";
    refs.plan.disabled = snapshot.status === "running";
    refs.reset.disabled = snapshot.status === "running";
    refs.next.disabled = !snapshot.canAdvance;
    refs.next.classList.toggle("is-ready", snapshot.canAdvance);
    refs.plan.classList.toggle("is-active", snapshot.planVisible);
  }

  return { render };
}
