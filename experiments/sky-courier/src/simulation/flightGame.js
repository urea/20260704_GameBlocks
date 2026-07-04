import { Vector3 } from "three";
import { AirplaneMotionController } from "@gameblocks/modules/actor-motion/aircraft/AirplaneMotionController.js";
import { FlightPlay, FLIGHT_PLAY_EVENTS } from "@gameblocks/modules/gameplay/FlightPlay.js";
import { clamp, toDeg } from "@gameblocks/modules/math/ScalarUtils.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";

const PLAYER_ID = "courier";
const SEA_LEVEL = 0;
const CRASH_CLEARANCE = 8;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remaining.toFixed(1).padStart(4, "0")}`;
}

function yawFromPlanarDelta(rightDelta, forwardDelta) {
  return Math.atan2(-rightDelta, forwardDelta);
}

function distancePointToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq <= 1e-8) return point.distanceTo(start);
  const t = clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, t));
}

function cloneFrame(frame) {
  const forward = frame.forward.clone();
  return {
    forward,
    right: frame.right.clone(),
    up: frame.up.clone(),
    back: frame.back?.clone() ?? forward.clone().negate(),
  };
}

export function createSkyCourierGame({
  course,
  terrainSampler,
  basis = DEFAULT_WORLD_BASIS,
}) {
  return new SkyCourierGame({ course, terrainSampler, basis });
}

class SkyCourierGame {
  constructor({ course, terrainSampler, basis }) {
    this.course = course;
    this.terrainSampler = terrainSampler;
    this.basis = basis;
    this.elapsed = 0;
    this.score = 0;
    this.status = "flying";
    this.message = "Gate 1";
    this.crashCooldown = 0;

    this.start = this.resolvePlanarPoint(course.start);
    this.checkpoints = course.checkpoints.map((checkpoint, index) =>
      this.resolveCheckpoint(checkpoint, index)
    );
    this.applyCheckpointDirections();

    const first = this.checkpoints[0];
    const startYaw = yawFromPlanarDelta(
      first.right - this.start.right,
      first.forward - this.start.forward
    );

    this.motion = new AirplaneMotionController({
      minSpeed: 64,
      maxSpeed: 214,
      speedLag: 0.48,
      boostSpeedLag: 0.18,
      pitchRate: 1.34,
      minPitch: -1.0,
      maxPitch: 1.18,
      pitchReturnLag: 0,
      bankRollLag: 0.11,
      holdRollWhenNeutral: true,
      bankTurnRate: 0,
      pullTurnRate: 1.08,
      yawRate: 0.52,
      maxBankRoll: 1.34,
      bankTurnRollReference: 0.96,
      boostDuration: 1.55,
      boostMultiplier: 1.34,
      basis,
    });
    this.motion.reset(this.start.position);
    this.motion.setState(86, 0.62, 0.035, 0, startYaw, this.start.position);

    this.frame = cloneFrame(this.basis.yawPitchRollFrame(startYaw, 0.035, 0));
    this.targetIndex = 0;
    this.flightPlay = new FlightPlay({
      crashHeightAt: (right, forward) => this.crashHeightAt(right, forward),
      basis,
    });
    this.flightPlay.addPlayer({ playerId: PLAYER_ID, position: this.motion.position });
    this.flightPlay.startGame();
  }

  terrainHeightAt(right, forward) {
    return this.terrainSampler.sample(right, forward)?.height ?? 0;
  }

  crashHeightAt(right, forward) {
    return Math.max(SEA_LEVEL, this.terrainHeightAt(right, forward)) + CRASH_CLEARANCE;
  }

  resolvePlanarPoint(point) {
    const terrainHeight = this.terrainHeightAt(point.right, point.forward);
    const up = Math.max(SEA_LEVEL, terrainHeight) + point.clearance;
    return {
      ...point,
      terrainHeight,
      up,
      position: this.basis.fromBasisComponents(point.right, up, point.forward),
    };
  }

  resolveCheckpoint(checkpoint, index) {
    return {
      ...this.resolvePlanarPoint(checkpoint),
      index,
      radius: checkpoint.radius,
    };
  }

  applyCheckpointDirections() {
    for (let index = 0; index < this.checkpoints.length; index += 1) {
      const previous = index === 0 ? this.start : this.checkpoints[index - 1];
      const next = this.checkpoints[index + 1] ?? this.checkpoints[index];
      const direction = next.position.clone().sub(previous.position);
      if (direction.lengthSq() <= 1e-8) direction.copy(this.basis.forwardVector());
      this.checkpoints[index].direction = direction.normalize();
    }
  }

  restart() {
    const first = this.checkpoints[0];
    const startYaw = yawFromPlanarDelta(
      first.right - this.start.right,
      first.forward - this.start.forward
    );
    this.elapsed = 0;
    this.score = 0;
    this.status = "flying";
    this.message = "Gate 1";
    this.crashCooldown = 0;
    this.targetIndex = 0;
    this.motion.reset(this.start.position);
    this.motion.setState(86, 0.62, 0.035, 0, startYaw, this.start.position);
    this.frame = cloneFrame(this.basis.yawPitchRollFrame(startYaw, 0.035, 0));
    this.flightPlay.movePlayer(PLAYER_ID, this.motion.position);
    this.flightPlay.reset();
    this.flightPlay.startGame();
  }

  step(input, deltaSeconds) {
    const delta = clamp(deltaSeconds, 0, 1 / 20);

    if (this.status === "crashed") {
      this.crashCooldown -= delta;
      if (this.crashCooldown <= 0) this.restart();
      return;
    }

    if (this.status === "flying") this.elapsed += delta;

    const startPosition = this.motion.position.clone();
    const intent = this.motion.planMovement({
      left: input.left,
      right: input.right,
      up: input.up,
      down: input.down,
      yawLeft: input.yawLeft,
      yawRight: input.yawRight,
      throttle: input.throttle,
      boost: input.boost,
      deltaSeconds: delta,
    });

    const committed = this.motion.commitMovement(intent);
    this.frame = cloneFrame(committed.bodyFrame);
    this.flightPlay.movePlayer(PLAYER_ID, this.motion.position);

    if (this.status === "flying") {
      const events = this.flightPlay.step();
      if (events.some((event) => event.type === FLIGHT_PLAY_EVENTS.PLAYER_HIT_GROUND)) {
        this.status = "crashed";
        this.message = "Flight lost";
        this.crashCooldown = 1.45;
        return;
      }
      this.checkGatePass(startPosition, this.motion.position);
    }
  }

  checkGatePass(startPosition, endPosition) {
    const gate = this.checkpoints[this.targetIndex];
    if (!gate) return;

    const distance = distancePointToSegment(gate.position, startPosition, endPosition);
    if (distance > gate.radius) return;

    this.targetIndex += 1;
    this.score += 1000 + Math.max(0, Math.round(280 - this.elapsed * 2));

    if (this.targetIndex >= this.checkpoints.length) {
      this.status = "complete";
      this.message = "Delivery complete";
      this.score += Math.max(0, Math.round(5000 - this.elapsed * 18));
      return;
    }

    this.message = `Gate ${this.targetIndex + 1}`;
  }

  activeCheckpoint() {
    return this.checkpoints[this.targetIndex] ?? null;
  }

  getSnapshot() {
    const planar = this.basis.toPlanar(this.motion.position, { right: 0, forward: 0 });
    const altitude = this.basis.upComponent(this.motion.position);
    const terrainHeight = this.terrainHeightAt(planar.right, planar.forward);
    const crashHeight = this.crashHeightAt(planar.right, planar.forward);
    const gate = this.activeCheckpoint();
    const gateDistance = gate ? this.motion.position.distanceTo(gate.position) : 0;
    const headingDegrees = ((-toDeg(this.motion.yaw) % 360) + 360) % 360;

    return {
      status: this.status,
      message: this.message,
      elapsed: this.elapsed,
      timeText: formatTime(this.elapsed),
      score: this.score,
      gateIndex: this.targetIndex,
      gateCount: this.checkpoints.length,
      gateDistance,
      position: this.motion.position.clone(),
      planar,
      altitude,
      agl: altitude - Math.max(SEA_LEVEL, terrainHeight),
      terrainHeight,
      crashHeight,
      speed: this.motion.speed,
      throttle: this.motion.throttle,
      isBoosting: this.motion.isBoosting,
      boostRatio: this.motion.cfg.boostDuration > 0
        ? this.motion.boostRemainingSeconds / this.motion.cfg.boostDuration
        : 0,
      yaw: this.motion.yaw,
      pitch: this.motion.pitch,
      roll: this.motion.roll,
      frame: cloneFrame(this.frame),
      headingDegrees,
      pullUpWarning: this.status === "flying" && altitude - crashHeight < 26,
    };
  }

  getCourseGeometry() {
    return {
      start: this.start,
      checkpoints: this.checkpoints,
    };
  }

  getDebugSnapshot() {
    const snapshot = this.getSnapshot();
    return {
      status: snapshot.status,
      message: snapshot.message,
      gateIndex: snapshot.gateIndex,
      gateCount: snapshot.gateCount,
      gateDistance: Math.round(snapshot.gateDistance),
      elapsed: Number(snapshot.elapsed.toFixed(2)),
      score: snapshot.score,
      speed: Math.round(snapshot.speed),
      altitude: Math.round(snapshot.altitude),
      agl: Math.round(snapshot.agl),
      headingDegrees: Math.round(snapshot.headingDegrees),
      pitchDegrees: Number((snapshot.pitch * 180 / Math.PI).toFixed(1)),
      rollDegrees: Number((snapshot.roll * 180 / Math.PI).toFixed(1)),
      position: {
        x: Number(snapshot.position.x.toFixed(2)),
        y: Number(snapshot.position.y.toFixed(2)),
        z: Number(snapshot.position.z.toFixed(2)),
      },
    };
  }

  debugCompleteCourse() {
    const last = this.checkpoints[this.checkpoints.length - 1];
    this.motion.setState(
      142,
      this.motion.throttle,
      this.motion.pitch,
      this.motion.roll,
      this.motion.yaw,
      last.position
    );
    this.targetIndex = this.checkpoints.length;
    this.status = "complete";
    this.message = "Delivery complete";
    this.score = Math.max(this.score, 14000);
    this.flightPlay.movePlayer(PLAYER_ID, this.motion.position);
  }
}
