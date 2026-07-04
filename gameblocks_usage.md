# GameBlocks Usage

This file records which GameBlocks modules are selected for each prototype.

## Current Status

`experiments/block-relay/` is the first playable prototype.

`experiments/contraption-lab/` is the second playable prototype.

`experiments/sky-courier/` is the third playable prototype and the first one intended to foreground GameBlocks-provided flight, camera, HUD, and natural-world modules.

## Selection Rules

1. Read `gameblocks/summary.md`.
2. Select only the modules needed for the prototype.
3. Copy selected modules into `src/gameblocks/` while preserving the upstream relative directory structure.
4. Record each selected module below with purpose, reuse status, changes, and integration notes.

## Selected Modules

| Module | Purpose | Status | Notes |
| --- | --- | --- | --- |
| `modules/math/WorldBasis.js` | Shared gameplay-to-world coordinate basis. | Reused as-is | Imported by `BoardEnvironment` and used by the renderer for cell picking. |
| `modules/world/environment/BoardEnvironment.js` | Creates the 3D grid board, board mesh, grid, and basic lighting. | Reused as-is | Used by both `block-relay` and `contraption-lab`. |
| `modules/behavior/GridPathPlanner.js` | Finds active relay paths and optional plan paths on the grid. | Reused as-is | Used by `experiments/block-relay/src/simulation/relayGame.js`. |
| `modules/actor-motion/aircraft/AirplaneMotionController.js` | Aircraft speed, throttle, pitch, roll, yaw, and boost simulation. | Adapted locally | Used as the authoritative movement model in `sky-courier`; the copied module adds continuous roll-rate expert controls, local-axis pitch, and rudder-yaw inputs for an arcade flight profile. |
| `modules/actor-motion/aircraft/AirplaneModelController.js` | Applies aircraft pose and engine state to a Three.js model. | Adapted locally | Drives the airplane visual and jet flames in `sky-courier`; the local copy can consume the same body frame used by motion and camera. |
| `modules/world/object/factory/AirplaneVisualFactory.js` | Creates a procedural aircraft model with jet flame anchors. | Reused as-is | Used for the playable plane in `sky-courier`. |
| `modules/world/visual-effects/JetFlame.js` | Shader-based jet flame visual. | Reused as-is | Instantiated through `AirplaneVisualFactory`. |
| `modules/gameplay/FlightPlay.js` | Flight-specific player state and ground-hit events. | Reused as-is | Used by `sky-courier` for terrain and water crash checks. |
| `modules/user-interface/FlightHud.js` | Fighter-style DOM HUD for speed, altitude, heading, throttle, and warnings. | Reused as-is | Mounted directly over the `sky-courier` canvas. |
| `modules/camera/BaseCameraRig.js` | Shared camera rig smoothing and pose utilities. | Reused as-is | Dependency of `PoseFollowCameraRig`. |
| `modules/camera/PoseFollowCameraRig.js` | Follows a target position and body frame with lag. | Reused as-is | Used for the chase camera in `sky-courier`. |
| `modules/world/environment/NaturalEnvironment.js` | Terrain, trees, rocks, and grass world builder. | Reused as-is | Creates the island environment in `sky-courier`. |
| `modules/world/environment/TerrainSampler.js` | Procedural terrain samplers, including archipelago terrain. | Reused as-is | `sky-courier` uses `ArchipelagoTerrainSampler`. |
| `modules/world/environment/TerrainMeshFactory.js` | Turns terrain samplers into vertex-colored meshes. | Reused as-is | Dependency of `NaturalEnvironment`. |
| `modules/world/environment/SpawnAreaSampler.js` | Samples terrain prop positions. | Reused as-is | Dependency of `NaturalEnvironment`. |
| `modules/world/environment/PlanarUtils.js` | Resolves basis helpers for planar terrain code. | Reused as-is | Dependency of `TerrainMeshFactory`. |
| `modules/world/object/factory/PlantVisualFactory.js` | Procedural tree and grass visuals. | Reused as-is | Dependency of `NaturalEnvironment`. |
| `modules/world/object/factory/RockVisualFactory.js` | Procedural rock visuals. | Reused as-is | Dependency of `NaturalEnvironment`. |
| `modules/world/Object3DUtils.js` | Object disposal helpers. | Reused as-is | Dependency of `NaturalEnvironment`. |
| `modules/math/ScalarUtils.js` | Clamp, easing, conversion helpers. | Reused as-is | Required by aircraft motion, terrain, camera, and HUD modules. |
| `modules/math/Vector3Utils.js` | Three.js vector coercion helpers. | Reused as-is | Required by aircraft motion and camera modules. |
| `modules/math/RandomUtils.js` | Deterministic random helpers. | Reused as-is | Required by natural environment prop generation. |

## Contraption Lab Notes

`contraption-lab` uses `WorldBasis.js` and `BoardEnvironment.js` directly. Rapier3D physics is implemented locally in `experiments/contraption-lab/src/physics/createRunWorld.js` because the prototype needs a small deterministic marble simulation rather than a prebuilt GameBlocks gameplay mode.

## Sky Courier Notes

`sky-courier` intentionally keeps local code thin around GameBlocks modules:

- Flight dynamics come from a local `AirplaneMotionController` copy adapted for continuous-roll expert controls plus local wing-axis pitch controls.
- The aircraft mesh and jet flames come from `AirplaneVisualFactory` and `JetFlameLocalVisual`.
- Terrain and prop placement come from `ArchipelagoTerrainSampler` and `NaturalEnvironment`.
- Ground and water failure comes from `FlightPlay`.
- The chase camera comes from `PoseFollowCameraRig`.
- The aircraft HUD comes from `FlightHud`.

Local code supplies the ring-course rules, input mapping, course visuals, mobile buttons, and Playwright debug hooks.
