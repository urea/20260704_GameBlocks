import { MAIN_TYPES, cardById, cardClassNames, mainTypeById } from "../data/cards.js";

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function cardFace(cardId, options = {}) {
  const card = cardById(cardId);
  const element = createElement("div", `fantasy-card ${cardClassNames(cardId)} ${options.small ? "small" : ""}`);
  element.style.setProperty("--sprite-col", card.col);
  element.style.setProperty("--sprite-row", card.row);
  element.innerHTML = `
    <div class="fantasy-card__art" aria-hidden="true"></div>
    <div class="fantasy-card__label">
      <span>${card.mainIcon}</span>
      <strong>${card.label}</strong>
      <span>${card.elementIcon}</span>
    </div>
  `;
  return element;
}

function hiddenCard(slot, disabled) {
  const button = createElement("button", "defense-slot");
  button.type = "button";
  button.disabled = disabled || slot.defeated;
  button.dataset.slotIndex = slot.index;
  button.setAttribute("aria-label", `D${slot.index + 1}を攻撃`);
  button.innerHTML = `
    <span class="defense-slot__code">D${slot.index + 1}</span>
    <span class="defense-slot__sigil">?</span>
    <span class="defense-slot__hint">伏せ防衛</span>
    <span class="failure-row"></span>
  `;
  const failureRow = button.querySelector(".failure-row");
  for (const failure of slot.failures) {
    const chip = createElement("span", "failure-chip", `${mainTypeById(failure).label}×`);
    failureRow.appendChild(chip);
  }
  return button;
}

function defeatedCard(slot) {
  const wrapper = createElement("div", "defense-slot defeated");
  wrapper.appendChild(cardFace(slot.cardId));
  wrapper.appendChild(createElement("span", "defeated-stamp", "撃破"));
  return wrapper;
}

function renderScoreboard(root, snapshot, onReset) {
  const section = createElement("section", "scoreboard");
  const teamScores = snapshot.teams.map((team, index) => `
    <div class="team-score ${index === snapshot.offenseIndex ? "active" : ""}">
      <span>${team.name}</span>
      <strong>${team.score}</strong>
    </div>
  `).join("");
  section.innerHTML = `
    <div class="inning-box">
      <span>${snapshot.halfLabel}</span>
      <strong>${snapshot.phase === "gameOver" ? "決着" : "攻撃中"}</strong>
    </div>
    <div class="score-line">${teamScores}</div>
    <div class="out-box" aria-label="Out count">
      <span>OUT</span>
      <div>${[0, 1, 2].map((index) => `<i class="${index < snapshot.outs ? "lit" : ""}"></i>`).join("")}</div>
    </div>
  `;
  const reset = createElement("button", "new-game-button", "New Deal");
  reset.type = "button";
  reset.addEventListener("click", onReset);
  section.appendChild(reset);
  root.appendChild(section);
}

function renderLineup(root, snapshot) {
  const panel = createElement("section", "panel lineup-panel");
  panel.innerHTML = `
    <div class="panel-heading">
      <span>攻撃打順</span>
      <strong>${snapshot.offenseName}</strong>
    </div>
  `;
  const list = createElement("div", "lineup-list");
  const lineup = snapshot.teams[snapshot.offenseIndex].lineup;
  lineup.forEach((cardId, index) => {
    const row = createElement("div", `lineup-row ${index === snapshot.currentBatterIndex ? "current" : ""}`);
    row.appendChild(createElement("span", "lineup-order", `${index + 1}`));
    row.appendChild(cardFace(cardId, { small: true }));
    list.appendChild(row);
  });
  panel.appendChild(list);
  root.appendChild(panel);
}

function renderDefenseGrid(root, snapshot, onAttack) {
  const section = createElement("section", "defense-board");
  section.innerHTML = `
    <div class="board-heading">
      <span>伏せ防衛陣</span>
      <strong>${snapshot.defenseName}</strong>
      <em>残り ${snapshot.defenseRemaining}/9</em>
    </div>
  `;
  const grid = createElement("div", "defense-grid");
  snapshot.teams[snapshot.defenseIndex].defenseSlots.forEach((slot) => {
    const slotNode = slot.defeated ? defeatedCard(slot) : hiddenCard(slot, snapshot.phase !== "playing");
    const isLast = snapshot.lastPlay?.slotIndex === slot.index
      && snapshot.lastPlay?.defenseIndex === snapshot.defenseIndex;
    if (isLast) slotNode.classList.add(snapshot.lastPlay.outcome === "out" ? "last-out" : "last-hit");
    slotNode.addEventListener?.("click", () => onAttack(slot.index));
    grid.appendChild(slotNode);
  });
  section.appendChild(grid);
  root.appendChild(section);
}

function renderIntel(root, snapshot) {
  const panel = createElement("section", "panel intel-panel");
  panel.innerHTML = `
    <div class="panel-heading">
      <span>公開防衛カード</span>
      <strong>${snapshot.defenseName}</strong>
    </div>
  `;

  const cards = createElement("div", "public-card-list");
  snapshot.teams[snapshot.defenseIndex].defenseSlots.forEach((slot) => {
    const entry = createElement("div", `public-card ${slot.defeated ? "removed" : ""}`);
    entry.appendChild(cardFace(slot.cardId, { small: true }));
    if (slot.defeated) entry.appendChild(createElement("span", "public-card__status", "除去"));
    cards.appendChild(entry);
  });
  panel.appendChild(cards);

  const matrix = createElement("div", "type-matrix");
  matrix.innerHTML = `
    <span>主タイプ: 剣→魔 / 魔→盾 / 盾→弓 / 弓→剣</span>
    <span>副タイプ: 火→風 / 風→土 / 土→水 / 水→火</span>
  `;
  panel.appendChild(matrix);
  root.appendChild(panel);
}

function renderBases(root, snapshot) {
  const section = createElement("section", "bases-panel");
  const batter = cardById(snapshot.currentBatterCardId);
  const result = snapshot.phase === "gameOver"
    ? `${snapshot.teams[snapshot.winnerIndex].name} 勝利: ${snapshot.winReason}`
    : `${snapshot.currentBatterIndex + 1}番 ${batter.label} で攻撃先を選択`;
  section.innerHTML = `
    <div class="batter-card"></div>
    <div class="diamond" aria-label="Base runners">
      <span class="base base-2 ${snapshot.bases[1] ? "occupied" : ""}">${snapshot.bases[1]?.label ?? "2"}</span>
      <span class="base base-3 ${snapshot.bases[2] ? "occupied" : ""}">${snapshot.bases[2]?.label ?? "3"}</span>
      <span class="base home">本</span>
      <span class="base base-1 ${snapshot.bases[0] ? "occupied" : ""}">${snapshot.bases[0]?.label ?? "1"}</span>
    </div>
    <div class="turn-readout">
      <span>${snapshot.phase === "gameOver" ? "GAME SET" : "NEXT ATTACK"}</span>
      <strong>${result}</strong>
      <em>3Outで残塁は消え、打順は継続</em>
    </div>
  `;
  section.querySelector(".batter-card").appendChild(cardFace(snapshot.currentBatterCardId));
  root.appendChild(section);
}

function renderLog(root, snapshot) {
  const panel = createElement("section", "panel log-panel");
  panel.innerHTML = `
    <div class="panel-heading">
      <span>戦況ログ</span>
      <strong>公開情報</strong>
    </div>
  `;
  const list = createElement("ol", "battle-log");
  for (const entry of snapshot.log) {
    const item = createElement("li", entry.tone, entry.text);
    list.appendChild(item);
  }
  panel.appendChild(list);
  root.appendChild(panel);
}

export function renderGame(root, snapshot, handlers) {
  root.innerHTML = "";
  const shell = createElement("div", "game-shell");
  renderScoreboard(shell, snapshot, handlers.onReset);
  const main = createElement("main", "game-layout");
  renderLineup(main, snapshot);
  renderDefenseGrid(main, snapshot, handlers.onAttack);
  renderIntel(main, snapshot);
  shell.appendChild(main);

  const lower = createElement("div", "lower-layout");
  renderBases(lower, snapshot);
  renderLog(lower, snapshot);
  shell.appendChild(lower);
  root.appendChild(shell);
}

export function renderTypeLegend(root) {
  const legend = createElement("div", "sr-only");
  legend.textContent = MAIN_TYPES.map((type) => type.label).join(" / ");
  root.appendChild(legend);
}
