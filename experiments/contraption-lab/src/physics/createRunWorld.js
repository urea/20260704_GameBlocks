import { rotationToVector } from "../simulation/parts.js";

const BALL_RADIUS = 0.23;
const GRAVITY = { x: 0, y: -9.81, z: 0 };

function toWorldDirection(basis, rotation) {
  const vector = rotationToVector(rotation);
  return basis.fromBasisComponents(vector.right, 0, vector.forward).normalize();
}

function horizontalDistanceSq(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function createFixedBody(RAPIER, world, position, rotation = null) {
  const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
  if (rotation) desc.setRotation(rotation);
  return world.createRigidBody(desc);
}

function quatFromEuler(x = 0, y = 0, z = 0) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}

function yRotation(rotation) {
  return quatFromEuler(0, -rotation * Math.PI * 0.5, 0);
}

function rampRotation(rotation) {
  const yaw = -rotation * Math.PI * 0.5;
  return quatFromEuler(-0.42, yaw, 0);
}

function createPartCollider({ RAPIER, world, board, part, effects }) {
  const position = board.cellToWorldPoint(part.cell, 0);

  if (part.type === "wall") {
    const body = createFixedBody(RAPIER, world, { x: position.x, y: 0.38, z: position.z }, yRotation(part.rotation));
    const longSide = part.rotation % 2 === 0;
    const collider = RAPIER.ColliderDesc.cuboid(longSide ? 0.44 : 0.18, 0.38, longSide ? 0.18 : 0.44)
      .setFriction(0.7)
      .setRestitution(0.18);
    world.createCollider(collider, body);
    return;
  }

  if (part.type === "bumper") {
    const body = createFixedBody(RAPIER, world, { x: position.x, y: 0.34, z: position.z });
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.34, 0.34).setFriction(0.25).setRestitution(1.35),
      body
    );
    effects.push({
      type: "bumper",
      center: { x: position.x, y: 0.35, z: position.z },
      usedAt: -10,
    });
    return;
  }

  if (part.type === "fan") {
    effects.push({
      type: "fan",
      center: { x: position.x, y: 0.35, z: position.z },
      direction: null,
      rotation: part.rotation,
    });
    return;
  }

  if (part.type === "ramp") {
    effects.push({
      type: "ramp",
      center: { x: position.x, y: 0.28, z: position.z },
      direction: null,
      rotation: part.rotation,
      triggered: false,
    });
  }
}

function createObstacleCollider({ RAPIER, world, board, obstacle }) {
  const position = board.cellToWorldPoint(obstacle, 0);
  const height = obstacle.low ? 0.42 : 0.78;
  const body = createFixedBody(RAPIER, world, { x: position.x, y: height * 0.5, z: position.z });
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.44, height * 0.5, 0.44)
      .setFriction(0.85)
      .setRestitution(obstacle.low ? 0.04 : 0.12),
    body
  );
}

export function createRunWorld({ RAPIER, snapshot, board, basis }) {
  const world = new RAPIER.World(GRAVITY);
  world.timestep = 1 / 60;

  const effects = [];
  const boardCenter = board.center;
  const floorBody = createFixedBody(RAPIER, world, { x: boardCenter.x, y: -0.13, z: boardCenter.z });
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(
      snapshot.level.columns * board.cellSize * 0.54,
      0.08,
      snapshot.level.rows * board.cellSize * 0.54
    )
      .setFriction(0.58)
      .setRestitution(0.05),
    floorBody
  );

  const left = board.cellToWorldPoint({ right: -0.7, forward: snapshot.level.rows * 0.5 - 0.5 }, 0);
  const right = board.cellToWorldPoint({ right: snapshot.level.columns - 0.3, forward: snapshot.level.rows * 0.5 - 0.5 }, 0);
  const top = board.cellToWorldPoint({ right: snapshot.level.columns * 0.5 - 0.5, forward: -0.7 }, 0);
  const bottom = board.cellToWorldPoint({ right: snapshot.level.columns * 0.5 - 0.5, forward: snapshot.level.rows - 0.3 }, 0);
  const wallSpecs = [
    { p: left, sx: 0.12, sz: snapshot.level.rows * 0.58 },
    { p: right, sx: 0.12, sz: snapshot.level.rows * 0.58 },
    { p: top, sx: snapshot.level.columns * 0.58, sz: 0.12 },
    { p: bottom, sx: snapshot.level.columns * 0.58, sz: 0.12 },
  ];
  for (const spec of wallSpecs) {
    const body = createFixedBody(RAPIER, world, { x: spec.p.x, y: 0.34, z: spec.p.z });
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(spec.sx, 0.34, spec.sz).setFriction(0.6).setRestitution(0.2),
      body
    );
  }

  for (const obstacle of snapshot.level.obstacles) {
    createObstacleCollider({ RAPIER, world, board, obstacle });
  }
  for (const part of [...snapshot.fixedParts, ...snapshot.placed]) {
    createPartCollider({ RAPIER, world, board, part, effects });
  }

  for (const effect of effects) {
    if (effect.rotation != null) {
      const vector = toWorldDirection(basis, effect.rotation);
      effect.direction = { x: vector.x, y: vector.y, z: vector.z };
    }
  }

  const startPosition = board.cellToWorldPoint(snapshot.level.start, 0.48);
  const startDirection = toWorldDirection(basis, snapshot.level.start.rotation ?? 0);
  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(startPosition.x, startPosition.y, startPosition.z)
      .setCanSleep(false)
      .setLinearDamping(0.12)
      .setAngularDamping(0.18)
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(BALL_RADIUS).setFriction(0.38).setRestitution(0.32).setDensity(1),
    ballBody
  );
  ballBody.setLinvel(
    { x: startDirection.x * 3.0, y: 0.05, z: startDirection.z * 3.0 },
    true
  );

  const goal = board.cellToWorldPoint(snapshot.level.goal, 0.35);
  let elapsed = 0;
  let accumulator = 0;

  function applyEffects() {
    const p = ballBody.translation();
    const velocity = ballBody.linvel();
    for (const effect of effects) {
      const distanceSq = horizontalDistanceSq(p, effect.center);
      if (effect.type === "fan" && distanceSq < 1.02 * 1.02 && p.y < 2.2) {
        const speed = 4.2;
        ballBody.setLinvel(
          {
            x: effect.direction.x * speed,
            y: Math.max(velocity.y, -0.15),
            z: effect.direction.z * speed,
          },
          true
        );
      }
      if (effect.type === "ramp" && !effect.triggered && distanceSq < 0.78 * 0.78 && p.y < 0.85) {
        effect.triggered = true;
        ballBody.setLinvel(
          {
            x: effect.direction.x * 4.05,
            y: 3.05,
            z: effect.direction.z * 4.05,
          },
          true
        );
      }
      if (effect.type === "bumper" && elapsed - effect.usedAt > 0.22 && distanceSq < 0.84 * 0.84 && p.y < 1.1) {
        effect.usedAt = elapsed;
        const dx = p.x - effect.center.x;
        const dz = p.z - effect.center.z;
        const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
        ballBody.applyImpulse(
          {
            x: (dx / length) * 2.8,
            y: 0.18,
            z: (dz / length) * 2.8,
          },
          true
        );
      }
    }
  }

  function step(deltaSeconds) {
    elapsed += deltaSeconds;
    accumulator += Math.min(0.05, deltaSeconds);
    while (accumulator >= world.timestep) {
      applyEffects();
      world.step();
      accumulator -= world.timestep;
    }

    const p = ballBody.translation();
    const goalDistance = Math.sqrt(horizontalDistanceSq(p, goal));
    if (goalDistance <= (snapshot.level.goalRadius ?? 0.65) && p.y < 1.7) {
      return { type: "won", elapsed };
    }
    if (elapsed >= snapshot.level.timeLimit) {
      return { type: "failed", elapsed, reason: "Timed out" };
    }
    if (p.y < -3 || Number.isNaN(p.x) || Number.isNaN(p.z)) {
      return { type: "failed", elapsed, reason: "Lost ball" };
    }
    return { type: "tick", elapsed };
  }

  return {
    ballBody,
    step,
    dispose() {
      world.free();
    },
  };
}
