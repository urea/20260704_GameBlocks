import { Vector3 } from 'three';
import { clamp, smoothToward } from '../../math/ScalarUtils.js';
import { toVec3 } from '../../math/Vector3Utils.js';
import { DEFAULT_WORLD_BASIS } from '../../math/WorldBasis.js';

export class AirplaneMotionController {
  constructor({
    throttleRate = 0.42,
    minSpeed = 82,
    maxSpeed = 246,
    speedLag = 0.56,
    boostSpeedLag = 0.26,
    pitchRate = 1.18,
    minPitch = -1.05,
    maxPitch = 1.18,
    pitchReturnLag = 0,
    maxBankRoll = 1.1868, // 68 deg
    bankRollLag = 0.21,
    holdRollWhenNeutral = false,
    continuousRoll = false,
    rollRate = 2.6,
    bankTurnRate = 0.42,
    pullTurnRate = 0,
    yawRate = 0.48,
    bankTurnRollReference = 0.9774, // 56 deg
    boostDuration = 1.7,
    boostMultiplier = 1.28,
    basis = DEFAULT_WORLD_BASIS
  }) {
    this.cfg = {
      throttleRate,
      minSpeed,
      maxSpeed,
      speedLag,
      boostSpeedLag,
      pitchRate,
      minPitch,
      maxPitch,
      pitchReturnLag,
      maxBankRoll,
      bankRollLag,
      holdRollWhenNeutral,
      continuousRoll,
      rollRate,
      bankTurnRate,
      pullTurnRate,
      yawRate,
      bankTurnRollReference,
      boostDuration,
      boostMultiplier,
    };
    this.basis = basis;

    this.speed = this.cfg.minSpeed;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.position = new Vector3();

    this.throttle = 0;
    this.isBoosting = false;
    this.boostRemainingSeconds = 0;
    this.boostPressed = false;
  }

  setState(
    speed,
    throttle,
    pitch,
    roll,
    yaw,
    position = null,
    isBoosting = null,
    boostRemainingSeconds = null,
    boostDuration = null
  ) {
    if (position) {
      this.position.copy(toVec3(position, this.position));
    }
    if (typeof speed === 'number') this.speed = speed;
    if (typeof throttle === 'number') {
      this.throttle = clamp(throttle, 0, 1);
    }
    if (typeof pitch === 'number') this.pitch = pitch;
    if (typeof roll === 'number') this.roll = roll;
    if (typeof yaw === 'number') this.yaw = yaw;
    if (typeof isBoosting === 'boolean') this.isBoosting = isBoosting;
    if (typeof boostRemainingSeconds === 'number') this.boostRemainingSeconds = boostRemainingSeconds;
    if (typeof boostDuration === 'number') this.cfg.boostDuration = boostDuration;
  }

  // left/right: 0..1 steers toward the local left/right directions.
  // up/down: 0..1 steers toward the local up/down directions.
  // yawLeft/yawRight: 0..1 applies direct rudder-like yaw.
  // throttle: -1..1 adjusts cruise throttle.
  // boost: true triggers boost.
  planMovement({
    left = 0,
    right = 0,
    up = 0,
    down = 0,
    yawLeft = 0,
    yawRight = 0,
    throttle = 0,
    boost = false,
    deltaSeconds = 1 / 60,
    commit = false,
  }) {
    const startPosition = this.position.clone();
    const leftRight = this.basis.controlSignal('counterClockWise', left) + this.basis.controlSignal('clockWise', right);
    const upDown = this.basis.controlSignal('counterClockWise', up) + this.basis.controlSignal('clockWise', down);
    const yawInput = this.basis.controlSignal('counterClockWise', yawLeft) + this.basis.controlSignal('clockWise', yawRight);

    if (throttle > 0) {
      this.throttle = Math.min(1, this.throttle + this.cfg.throttleRate * deltaSeconds);
    } else if (throttle < 0) {
      this.throttle = Math.max(0, this.throttle - this.cfg.throttleRate * deltaSeconds);
    }

    const boostHeld = Boolean(boost);

    this._stepBoost(boostHeld, deltaSeconds);
    const nextSpeed = this.predictSpeed(deltaSeconds);
    const nextAttitude = this.predictAttitude(leftRight, upDown, yawInput, nextSpeed, deltaSeconds);

    const nextPosition = this.predictPosition(
      this.position,
      nextSpeed * deltaSeconds,
      nextAttitude.yaw,
      nextAttitude.pitch,
      nextAttitude.frame
    );

    const intent = {
      position: nextPosition.clone(),
      startPosition,
      desiredDelta: nextPosition.clone().sub(startPosition),
      deltaSeconds: deltaSeconds,
      speed: nextSpeed,
      pitch: nextAttitude.pitch,
      roll: nextAttitude.roll,
      yaw: nextAttitude.yaw,
      frame: nextAttitude.frame,
    };

    if (commit) return this.commitMovement(intent);
    return intent;
  }

  commitMovement(intent, resolved = null) {
    const position = toVec3(resolved ? resolved.position : intent.position);
    this.position.copy(position);
    this.speed = intent.speed;
    this.pitch = intent.pitch;
    this.roll = intent.roll;
    this.yaw = intent.yaw;

    const frame = intent.frame ?? this.basis.yawPitchRollFrame(this.yaw, this.pitch, this.roll);
    return {
      position: this.position.clone(),
      yaw: this.yaw,
      pitch: this.pitch,
      roll: this.roll,
      bodyFrame: {
        forward: frame.forward.clone(),
        right: frame.right.clone(),
        up: frame.up.clone(),
      },
    };
  }

  _stepBoost(boostHeld, deltaSeconds) {
    if (this.boostRemainingSeconds > 0) {
      this.boostRemainingSeconds -= deltaSeconds;
      if (this.boostRemainingSeconds <= 0) {
        this.boostRemainingSeconds = 0;
        this.isBoosting = false;
      }
    }

    if (boostHeld) {
      if (!this.boostPressed && !this.isBoosting) {
        this.isBoosting = true;
        this.boostRemainingSeconds = this.cfg.boostDuration;
      }
      this.boostPressed = true;
    } else {
      this.boostPressed = false;
    }
  }

  predictSpeed(deltaSeconds) {
    const cruiseSpeed = this.cfg.minSpeed + this.throttle * (this.cfg.maxSpeed - this.cfg.minSpeed);
    const targetSpeed = this.isBoosting ? this.cfg.maxSpeed * this.cfg.boostMultiplier : cruiseSpeed;
    return smoothToward(
      this.speed,
      targetSpeed,
      this.isBoosting ? this.cfg.boostSpeedLag : this.cfg.speedLag,
      deltaSeconds
    );
  }

  predictAttitude(leftRight, upDown, yawInput, speed, deltaSeconds) {
    const controlEffectiveness = speed > this.cfg.minSpeed ? 1 : speed / this.cfg.minSpeed;
    if (this.cfg.continuousRoll) {
      return this.predictLocalAttitude(leftRight, upDown, yawInput, controlEffectiveness, deltaSeconds);
    }

    const localPitch = upDown * this.cfg.pitchRate * deltaSeconds * controlEffectiveness;
    const maxBankRoll = Math.abs(this.cfg.maxBankRoll);
    let pitch = clamp(this.pitch + localPitch, this.cfg.minPitch, this.cfg.maxPitch);
    if (Math.abs(upDown) <= 1e-6 && this.cfg.pitchReturnLag > 0) {
      pitch = smoothToward(pitch, 0, this.cfg.pitchReturnLag, deltaSeconds);
    }

    let roll;
    if (this.cfg.continuousRoll) {
      // Expert aircraft input: left/right controls roll rate, not target bank angle.
      roll = this.roll - leftRight * this.cfg.rollRate * deltaSeconds * controlEffectiveness;
    } else {
      const currentRoll = clamp(this.roll, -maxBankRoll, maxBankRoll);
      // The turn direction and roll-bank direction have opposite signs.
      const targetRoll = Math.abs(leftRight) > 1e-6 || !this.cfg.holdRollWhenNeutral
        ? -leftRight * maxBankRoll
        : currentRoll;
      roll = smoothToward(currentRoll, targetRoll, this.cfg.bankRollLag, deltaSeconds);
    }

    const normalizedRoll = Math.atan2(Math.sin(roll), Math.cos(roll));
    const bankTurnReference = Math.max(1e-6, Math.abs(this.cfg.bankTurnRollReference));
    const bankTurnReferenceSin = Math.max(1e-6, Math.sin(bankTurnReference));
    // Convert the roll-bank direction back to turn direction, even after full rolls.
    const bankTurnAxis = clamp(-Math.sin(normalizedRoll) / bankTurnReferenceSin, -1, 1);
    const passiveBankTurnYaw = bankTurnAxis * this.cfg.bankTurnRate * deltaSeconds * controlEffectiveness;
    const pullTurnYaw = bankTurnAxis
      * Math.max(0, upDown)
      * this.cfg.pullTurnRate
      * deltaSeconds
      * controlEffectiveness;
    const rudderYaw = yawInput * this.cfg.yawRate * deltaSeconds * controlEffectiveness;
    const yaw = this.yaw + passiveBankTurnYaw + pullTurnYaw + rudderYaw;

    return {
      pitch,
      roll,
      yaw,
      frame: this.basis.yawPitchRollFrame(yaw, pitch, roll),
    };
  }

  predictLocalAttitude(leftRight, upDown, yawInput, controlEffectiveness, deltaSeconds) {
    let frame = this.basis.yawPitchRollFrame(this.yaw, this.pitch, this.roll);
    frame = {
      forward: frame.forward.clone(),
      right: frame.right.clone(),
      up: frame.up.clone(),
    };

    const rollDelta = -leftRight * this.cfg.rollRate * deltaSeconds * controlEffectiveness;
    if (Math.abs(rollDelta) > 1e-8) {
      frame.right.applyAxisAngle(frame.forward, rollDelta);
      frame.up.applyAxisAngle(frame.forward, rollDelta);
      frame = this.orthonormalizeFrame(frame);
    }

    const pitchDelta = upDown * this.cfg.pitchRate * deltaSeconds * controlEffectiveness;
    if (Math.abs(pitchDelta) > 1e-8) {
      frame.forward.applyAxisAngle(frame.right, pitchDelta);
      frame.up.applyAxisAngle(frame.right, pitchDelta);
      frame = this.orthonormalizeFrame(frame);
    } else if (this.cfg.pitchReturnLag > 0) {
      const levelPitch = smoothToward(this.pitch, 0, this.cfg.pitchReturnLag, deltaSeconds);
      const attitude = this.frameToYawPitchRoll(frame);
      frame = this.basis.yawPitchRollFrame(attitude.yaw, levelPitch, attitude.roll);
    }

    const rudderDelta = yawInput * this.cfg.yawRate * deltaSeconds * controlEffectiveness;
    if (Math.abs(rudderDelta) > 1e-8) {
      frame.forward.applyAxisAngle(frame.up, rudderDelta);
      frame.right.applyAxisAngle(frame.up, rudderDelta);
      frame = this.orthonormalizeFrame(frame);
    }

    let attitude = this.frameToYawPitchRoll(frame);
    const clampedPitch = clamp(attitude.pitch, this.cfg.minPitch, this.cfg.maxPitch);
    if (Math.abs(clampedPitch - attitude.pitch) > 1e-8) {
      frame = this.basis.yawPitchRollFrame(attitude.yaw, clampedPitch, attitude.roll);
      attitude = this.frameToYawPitchRoll(frame);
    }

    return {
      ...attitude,
      frame,
    };
  }

  orthonormalizeFrame(frame) {
    const forward = frame.forward.clone().normalize();
    let right = frame.right.clone().sub(forward.clone().multiplyScalar(frame.right.dot(forward)));
    if (right.lengthSq() <= 1e-8) {
      right = this.basis.yawPitchRollFrame(this.yaw, this.pitch, this.roll).right.clone();
    }
    right.normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();
    return {
      forward,
      right,
      up,
      back: forward.clone().multiplyScalar(-1),
    };
  }

  frameToYawPitchRoll(frame) {
    const normalized = this.orthonormalizeFrame(frame);
    const forward = normalized.forward;
    const yaw = this.basis.forwardToYaw(forward);
    const pitch = Math.asin(clamp(this.basis.upComponent(forward), -1, 1));
    const unrolled = this.basis.yawPitchRollFrame(yaw, pitch, 0);
    const roll = Math.atan2(
      unrolled.right.clone().cross(normalized.right).dot(forward),
      unrolled.right.dot(normalized.right)
    );
    return { yaw, pitch, roll };
  }

  predictPosition(
    position = this.position,
    distance = 0,
    yaw = this.yaw,
    pitch = this.pitch,
    frame = null
  ) {
    const startPosition = toVec3(position, this.position);
    const forward = frame?.forward ?? this.basis.yawPitchRollFrame(yaw, pitch).forward;
    return startPosition.addScaledVector(forward, distance);
  }

  reset(position = { x: 0, y: 0, z: 0 }) {
    this.speed = this.cfg.minSpeed;
    this.throttle = 0;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.position.set(position.x, position.y, position.z);
    this.isBoosting = false;
    this.boostRemainingSeconds = 0;
    this.boostPressed = false;
  }
}
