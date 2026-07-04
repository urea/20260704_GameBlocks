import { INITIAL_LINEUP, cardById, mainTypeById } from "../data/cards.js";
import { advanceBases, judgeAttack } from "./rules.js";

const TEAM_NAMES = ["暁の攻撃隊", "星影の防衛隊"];

function mulberry32(seed) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledCards(seed, offset) {
  const random = mulberry32(seed + offset * 9973);
  const cards = [...INITIAL_LINEUP];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

function createDefenseSlot(cardId, index) {
  return {
    index,
    cardId,
    defeated: false,
    failures: [],
    revealed: false,
  };
}

function createTeam(index, seed) {
  return {
    name: TEAM_NAMES[index],
    score: 0,
    batterIndex: 0,
    lineup: [...INITIAL_LINEUP],
    defenseSlots: shuffledCards(seed, index + 1).map(createDefenseSlot),
  };
}

function formatHalf(inning, half) {
  return `${inning}回${half === 0 ? "表" : "裏"}`;
}

function activeIndexes(state) {
  const offenseIndex = state.half === 0 ? 0 : 1;
  return {
    offenseIndex,
    defenseIndex: 1 - offenseIndex,
  };
}

function isRegulationComplete(state) {
  return state.inning >= 3 && state.half === 1 && state.teams[0].score !== state.teams[1].score;
}

function defenseCollapsed(team) {
  return team.defenseSlots.every((slot) => slot.defeated);
}

function logEntry(state, text, tone = "neutral") {
  state.log.unshift({
    id: state.nextLogId,
    text,
    tone,
  });
  state.nextLogId += 1;
  state.log = state.log.slice(0, 9);
}

export function createFantasyAdvanceGame({ seed = 20260704 } = {}) {
  return new FantasyAdvanceGame(seed);
}

class FantasyAdvanceGame {
  constructor(seed) {
    this.initialSeed = seed;
    this.reset(seed);
  }

  reset(seed = this.initialSeed + 1) {
    this.initialSeed = seed;
    this.state = {
      seed,
      teams: [createTeam(0, seed), createTeam(1, seed)],
      inning: 1,
      half: 0,
      outs: 0,
      bases: [null, null, null],
      phase: "playing",
      winnerIndex: null,
      winReason: "",
      lastPlay: null,
      log: [],
      nextLogId: 1,
    };
    logEntry(this.state, "試合開始。伏せられた9枚から攻撃先を選ぶ。");
  }

  snapshot() {
    const { offenseIndex, defenseIndex } = activeIndexes(this.state);
    const offense = this.state.teams[offenseIndex];
    const defense = this.state.teams[defenseIndex];
    const batterCardId = offense.lineup[offense.batterIndex];
    return structuredClone({
      ...this.state,
      offenseIndex,
      defenseIndex,
      offenseName: offense.name,
      defenseName: defense.name,
      halfLabel: formatHalf(this.state.inning, this.state.half),
      currentBatterIndex: offense.batterIndex,
      currentBatterCardId: batterCardId,
      currentBatter: cardById(batterCardId),
      defenseRemaining: defense.defenseSlots.filter((slot) => !slot.defeated).length,
    });
  }

  attackSlot(slotIndex) {
    if (this.state.phase !== "playing") return this.snapshot();
    const { offenseIndex, defenseIndex } = activeIndexes(this.state);
    const offense = this.state.teams[offenseIndex];
    const defense = this.state.teams[defenseIndex];
    const slot = defense.defenseSlots[slotIndex];
    if (!slot || slot.defeated) return this.snapshot();

    const batterIndex = offense.batterIndex;
    const attackerId = offense.lineup[batterIndex];
    const attackCard = cardById(attackerId);
    const defendCard = cardById(slot.cardId);
    const result = judgeAttack(attackerId, slot.cardId);

    offense.batterIndex = (offense.batterIndex + 1) % offense.lineup.length;

    const play = {
      slotIndex,
      batterIndex,
      attackerId,
      defenderId: slot.cardId,
      outcome: result.outcome,
      bases: result.bases,
      runs: 0,
      offenseIndex,
      defenseIndex,
    };

    if (result.outcome === "out") {
      this.state.outs += 1;
      if (!slot.failures.includes(attackCard.main)) slot.failures.push(attackCard.main);
      const failedType = mainTypeById(attackCard.main).label;
      logEntry(
        this.state,
        `${offense.name} ${batterIndex + 1}番 ${attackCard.label} はD${slotIndex + 1}を突破できず。${failedType}×を記録。`,
        "out"
      );
    } else {
      slot.defeated = true;
      slot.revealed = true;
      const runner = {
        teamIndex: offenseIndex,
        cardId: attackerId,
        label: attackCard.label,
        order: batterIndex + 1,
      };
      const advance = advanceBases(this.state.bases, runner, result.bases);
      this.state.bases = advance.bases;
      this.state.teams[offenseIndex].score += advance.runs;
      play.runs = advance.runs;
      logEntry(
        this.state,
        `${attackCard.label} がD${slotIndex + 1}の${defendCard.label}を撃破。${result.bases}Hit、${advance.runs}点。`,
        result.outcome
      );
    }

    this.state.lastPlay = play;

    if (defenseCollapsed(defense)) {
      this.finish(offenseIndex, `${defense.name}の防衛陣を全滅`);
      return this.snapshot();
    }

    if (this.state.outs >= 3) {
      this.changeSides();
    }

    return this.snapshot();
  }

  changeSides() {
    const endingHalf = formatHalf(this.state.inning, this.state.half);
    logEntry(this.state, `${endingHalf}終了。3Outで攻守交代。`, "change");
    this.state.outs = 0;
    this.state.bases = [null, null, null];

    if (this.state.half === 0) {
      this.state.half = 1;
      return;
    }

    if (isRegulationComplete(this.state)) {
      const winnerIndex = this.state.teams[0].score > this.state.teams[1].score ? 0 : 1;
      this.finish(winnerIndex, "得点差");
      return;
    }

    this.state.inning += 1;
    this.state.half = 0;
  }

  finish(winnerIndex, reason) {
    this.state.phase = "gameOver";
    this.state.winnerIndex = winnerIndex;
    this.state.winReason = reason;
    logEntry(this.state, `${this.state.teams[winnerIndex].name} 勝利。${reason}。`, "win");
  }

  findBestTarget() {
    const snapshot = this.snapshot();
    const defense = snapshot.teams[snapshot.defenseIndex];
    const attackerId = snapshot.currentBatterCardId;
    const scored = defense.defenseSlots
      .filter((slot) => !slot.defeated)
      .map((slot) => ({ slot, result: judgeAttack(attackerId, slot.cardId) }))
      .sort((a, b) => b.result.bases - a.result.bases);
    return scored[0]?.slot.index ?? -1;
  }

  debugAttackBest() {
    const target = this.findBestTarget();
    if (target >= 0) this.attackSlot(target);
    return this.snapshot();
  }
}
