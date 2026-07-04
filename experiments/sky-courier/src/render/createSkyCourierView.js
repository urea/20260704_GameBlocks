import * as THREE from "three";
import { AirplaneModelController } from "@gameblocks/modules/actor-motion/aircraft/AirplaneModelController.js";
import { PoseFollowCameraRig } from "@gameblocks/modules/camera/PoseFollowCameraRig.js";
import { DEFAULT_WORLD_BASIS } from "@gameblocks/modules/math/WorldBasis.js";
import { NaturalEnvironment } from "@gameblocks/modules/world/environment/NaturalEnvironment.js";
import { createAirplaneVisual } from "@gameblocks/modules/world/object/factory/AirplaneVisualFactory.js";

const RING_NORMAL = new THREE.Vector3(0, 0, 1);

function createSkyDome() {
  const geometry = new THREE.SphereGeometry(1500, 36, 18);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      horizonColor: { value: new THREE.Color(0x93c9e8) },
      zenithColor: { value: new THREE.Color(0x23528c) },
      duskColor: { value: new THREE.Color(0xffbd77) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPosition;
      uniform vec3 horizonColor;
      uniform vec3 zenithColor;
      uniform vec3 duskColor;
      void main() {
        vec3 dir = normalize(vWorldPosition);
        float t = smoothstep(-0.05, 0.85, dir.y);
        vec3 sky = mix(horizonColor, zenithColor, t);
        float dusk = pow(max(0.0, 1.0 - abs(dir.x + 0.2)), 3.0) * smoothstep(-0.05, 0.25, dir.y);
        gl_FragColor = vec4(mix(sky, duskColor, dusk * 0.22), 1.0);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

function createSea() {
  const geometry = new THREE.PlaneGeometry(2600, 2600, 32, 32);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x257aa6,
    roughness: 0.24,
    metalness: 0,
    transparent: true,
    opacity: 0.82,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
  });
  const sea = new THREE.Mesh(geometry, material);
  sea.position.y = 0;
  sea.receiveShadow = true;
  return sea;
}

function createCloudCluster(seed) {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({
    color: 0xf3f8ff,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });
  for (let index = 0; index < 8; index += 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material);
    const angle = seed * 2.17 + index * 0.78;
    mesh.position.set(Math.cos(angle) * (4 + index * 0.44), Math.sin(index) * 1.1, Math.sin(angle) * 3.2);
    mesh.scale.set(7 + (index % 3) * 2.2, 2.2 + (index % 4) * 0.7, 4.2 + (index % 2) * 1.8);
    group.add(mesh);
  }
  return group;
}

function createClouds(scene) {
  const cloudRoot = new THREE.Group();
  cloudRoot.name = "Clouds";
  const placements = [
    [-380, 185, -410],
    [-170, 225, -160],
    [120, 240, -320],
    [390, 210, -30],
    [260, 250, 310],
    [-220, 215, 360],
  ];
  placements.forEach(([x, y, z], index) => {
    const cloud = createCloudCluster(index + 1);
    cloud.position.set(x, y, z);
    cloud.rotation.y = index * 0.7;
    cloudRoot.add(cloud);
  });
  scene.add(cloudRoot);
  return cloudRoot;
}

function orientRingToDirection(group, direction) {
  const normal = direction.clone().normalize();
  if (normal.lengthSq() <= 1e-8) return;
  group.quaternion.setFromUnitVectors(RING_NORMAL, normal);
}

function createCheckpointVisual(gate) {
  const group = new THREE.Group();
  group.position.copy(gate.position);
  orientRingToDirection(group, gate.direction);

  const core = new THREE.Mesh(
    new THREE.TorusGeometry(gate.radius, 1.15, 12, 96),
    new THREE.MeshBasicMaterial({
      color: 0x68e9ff,
      transparent: true,
      opacity: 0.86,
    })
  );
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(gate.radius + 2.6, 0.42, 8, 96),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 14, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffc857,
      transparent: true,
      opacity: 0.9,
    })
  );
  marker.position.y = gate.radius + 7;
  group.add(core, glow, marker);
  group.userData.core = core;
  group.userData.glow = glow;
  return group;
}

function createCoursePath(points) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 220, 0.75, 8, false);
  const material = new THREE.MeshBasicMaterial({
    color: 0x72f3ff,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

function createTrail() {
  const maxPoints = 96;
  const positions = new Float32Array(maxPoints * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({
    color: 0xa9f6ff,
    transparent: true,
    opacity: 0.62,
  });
  return {
    line: new THREE.Line(geometry, material),
    points: [],
    maxPoints,
    update(position) {
      const last = this.points[this.points.length - 1];
      if (!last || last.distanceTo(position) > 2.5) {
        this.points.push(position.clone());
        while (this.points.length > this.maxPoints) this.points.shift();
      }
      this.points.forEach((point, index) => {
        positions[index * 3 + 0] = point.x;
        positions[index * 3 + 1] = point.y;
        positions[index * 3 + 2] = point.z;
      });
      geometry.setDrawRange(0, this.points.length);
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

export function createSkyCourierView({
  container,
  game,
  terrainSampler,
  basis = DEFAULT_WORLD_BASIS,
}) {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x8fc4df, 0.00086);
  scene.add(createSkyDome());
  scene.add(createSea());

  const hemi = new THREE.HemisphereLight(0xdff4ff, 0x39572e, 1.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d6, 3.1);
  sun.position.set(-180, 260, 130);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 40;
  sun.shadow.camera.far = 620;
  sun.shadow.camera.left = -360;
  sun.shadow.camera.right = 360;
  sun.shadow.camera.top = 360;
  sun.shadow.camera.bottom = -360;
  scene.add(sun);

  new NaturalEnvironment({
    scene,
    terrainSampler,
    terrainSize: 980,
    terrainSegments: 150,
    treeCount: 180,
    rockCount: 42,
    grassBladeCount: 260,
    propSpawnRegions: [{ type: "inside", rightMin: -430, rightMax: 430, forwardMin: -430, forwardMax: 430 }],
    basis,
  }).create();
  createClouds(scene);

  const course = game.getCourseGeometry();
  const coursePath = createCoursePath([
    course.start.position,
    ...course.checkpoints.map((gate) => gate.position),
  ]);
  scene.add(coursePath);

  const ringRoot = new THREE.Group();
  const rings = course.checkpoints.map((gate) => {
    const ring = createCheckpointVisual(gate);
    ringRoot.add(ring);
    return ring;
  });
  scene.add(ringRoot);

  const aircraft = createAirplaneVisual({
    scale: 5.4,
    bodyColor: 0xe8f3fb,
    accentColor: 0xffb44c,
    canopyColor: 0x62d3ff,
    showEngineGlow: true,
  });
  scene.add(aircraft.group);
  const airplaneModel = new AirplaneModelController(aircraft.group, aircraft.jetFlames, basis);

  const trail = createTrail();
  trail.line.renderOrder = 3;
  scene.add(trail.line);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2400);
  const cameraRig = new PoseFollowCameraRig({
    cameraOffset: { forward: -34, up: 13, right: 0 },
    lookAtOffset: { forward: 44, up: 4, right: 0 },
    speedCameraOffset: { forward: -0.035, up: 0.012, right: 0 },
    speedLookAtOffset: { forward: 0.045, up: 0, right: 0 },
    positionLag: 0.075,
    lookLag: 0.05,
    frameLag: 0.09,
    basis,
  });

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const drawingWidth = Math.floor(width * pixelRatio);
    const drawingHeight = Math.floor(height * pixelRatio);
    if (canvas.width !== drawingWidth || canvas.height !== drawingHeight) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function updateRings(snapshot, elapsedTimeSeconds) {
    rings.forEach((ring, index) => {
      const core = ring.userData.core;
      const glow = ring.userData.glow;
      const captured = index < snapshot.gateIndex;
      const active = index === snapshot.gateIndex;
      const pulse = active ? 1 + Math.sin(elapsedTimeSeconds * 5.4) * 0.045 : 1;
      ring.scale.setScalar(pulse);
      core.material.color.setHex(captured ? 0x7dff9a : active ? 0x68e9ff : 0xffc857);
      core.material.opacity = captured ? 0.42 : active ? 0.92 : 0.45;
      glow.material.color.setHex(active ? 0xffffff : captured ? 0xa8ffbf : 0xffd06a);
      glow.material.opacity = active ? 0.5 : 0.18;
    });
  }

  return {
    canvas,
    render(snapshot, deltaSeconds, elapsedTimeSeconds) {
      resize();
      airplaneModel.step({
        position: snapshot.position,
        yaw: snapshot.yaw,
        pitch: snapshot.pitch,
        roll: snapshot.roll,
        bodyFrame: snapshot.frame,
        throttle: snapshot.throttle,
        isBoosting: snapshot.isBoosting,
        elapsedTimeSeconds,
        deltaSeconds,
      });
      trail.update(snapshot.position);
      updateRings(snapshot, elapsedTimeSeconds);
      cameraRig.step({
        targetPosition: snapshot.position,
        targetFrame: snapshot.frame,
        targetSpeed: snapshot.speed,
        deltaSeconds,
        camera,
      });
      renderer.render(scene, camera);
    },
  };
}
