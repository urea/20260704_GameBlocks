# GameBlocks Usage

This file records which GameBlocks modules are selected for each prototype.

## Current Status

`experiments/block-relay/` is the first playable prototype.

`experiments/contraption-lab/` is the second playable prototype.

`experiments/sky-courier/` is the third playable prototype and the first one intended to foreground GameBlocks-provided flight, camera, HUD, and natural-world modules.

`experiments/snake-garden/`, `experiments/circuit-dash/`, `experiments/hover-salvage/`, and `experiments/turret-range/` extend the workspace to eight playable mini games.

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
| `modules/actor-motion/SnakeMotionController.js` | Grid snake movement, turning, segment updates, and growth queue. | Reused as-is | Drives the player snake in `snake-garden`. |
| `modules/gameplay/SnakePlay.js` | Snake item pickup and death events. | Reused as-is | Owns pickup, wall, and self-collision rules in `snake-garden`. |
| `modules/actor-motion/ground-vehicle/ArcadeCarMotionController.js` | Terrain-following arcade car motion. | Reused as-is | Drives the player car in `circuit-dash`. |
| `modules/actor-motion/ground-vehicle/CarModelController.js` | Applies car chassis and wheel motion to visuals. | Reused as-is | Animates the `circuit-dash` car visual. |
| `modules/world/object/factory/CarVisualFactory.js` | Procedural car mesh. | Reused as-is | Supplies the player vehicle in `circuit-dash`. |
| `modules/gameplay/RaceCheckpointLapPlay.js` | Checkpoint and lap race state. | Reused as-is | Tracks progress and finish state in `circuit-dash`. |
| `modules/world/environment/RaceTrackEnvironment.js` | Road terrain, checkpoint gates, and track barriers. | Reused as-is | Builds the playable track in `circuit-dash`. |
| `modules/user-interface/RaceMinimap.js` | Race track minimap rendering. | Reused as-is | Renders checkpoint and car position in `circuit-dash`. |
| `modules/user-interface/MinimapProjector2D.js` | World-to-minimap projection. | Reused as-is | Dependency of `RaceMinimap` and `HeadingRelativeRadar`. |
| `modules/actor-motion/GeneralVehicleMotionController.js` | Six-axis vehicle movement with yaw, pitch, and banking. | Reused as-is | Drives the hover drone in `hover-salvage`. |
| `modules/actor-motion/GeneralObjectModelController.js` | Applies arbitrary body frames to models. | Reused as-is | Orients the hover drone in `hover-salvage`. |
| `modules/world/object/PickupObject.js` | Pickup animation, radius, and disposal wrapper. | Reused as-is | Represents salvage cargo in `hover-salvage`. |
| `modules/world/object/factory/PickupVisualFactory.js` | Procedural ammo, health, and armor pickup visuals. | Reused as-is | Supplies salvage pickup meshes in `hover-salvage`. |
| `modules/user-interface/HeadingRelativeRadar.js` | Heading-relative radar display. | Reused as-is | Displays remaining pickups in `hover-salvage`. |
| `modules/gameplay/AimResolver.js` | Camera and ray aim resolution. | Reused as-is | Resolves turret aim rays in `turret-range`. |
| `modules/gameplay/CombatPlay.js` | Team combat health, armor, death, and finish state. | Reused as-is | Owns target health and range completion in `turret-range`. |
| `modules/gameplay/combat/ProjectileWeaponSystem.js` | Weapon heat, cooldown, ammo, and fire decisions. | Reused as-is | Gates turret gun fire in `turret-range`. |
| `modules/gameplay/combat/ProjectileManager.js` | Projectile lifecycle and hit events. | Reused as-is | Steps turret bullets in `turret-range`. |
| `modules/world/object/ProjectileObject.js` | Projectile movement, hit checks, and disposal. | Reused as-is | Dependency of `ProjectileManager`. |
| `modules/world/object/factory/ProjectileVisualFactory.js` | Procedural bullet and missile visuals. | Reused as-is | Supplies bullet visuals in `turret-range`. |
| `modules/world/environment/ArenaEnvironment.js` | Arena floor, walls, pillars, ramps, and spawn helpers. | Reused as-is | Builds the shooting range in `turret-range`. |
| `modules/world/object/HealthBarView.js` | Floating world-space health bars. | Reused as-is | Displays target health in `turret-range`. |
| `modules/math/TimeUtils.js` | Manual/system clock helpers. | Reused as-is | Gives `turret-range` deterministic weapon timing. |
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

## Eight Mini Game Notes

The later four mini games keep local code narrow:

- `snake-garden` owns fruit placement and rendering; GameBlocks owns snake motion and snake rule events.
- `circuit-dash` owns keyboard input and camera follow; GameBlocks owns car motion, track construction, race progress, car visuals, and minimap projection.
- `hover-salvage` owns pickup layout and bounds; GameBlocks owns six-axis vehicle motion, pickup wrappers, pickup visuals, and radar projection.
- `turret-range` owns target placement and turret input; GameBlocks owns aim resolution, weapon gating, projectile lifecycle, combat state, arena geometry, and health bars.
