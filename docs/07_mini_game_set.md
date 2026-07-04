# Eight GameBlocks Mini Games

The workspace now targets eight playable mini games. The design goal is breadth: each mini game should make a different GameBlocks module family visible instead of hiding all reuse behind the same flight or board loop.

## Current Set

1. `block-relay` - board placement and route validation with `BoardEnvironment` and `GridPathPlanner`.
2. `contraption-lab` - board-aligned Rapier contraption puzzle with local physics.
3. `sky-courier` - local-axis aircraft flight using GameBlocks flight, camera, terrain, HUD, and crash modules.
4. `fantasy-advance` - card rules prototype that documents a non-3D game loop beside the 3D trials.
5. `snake-garden` - snake growth, item pickup, wall collision, and self collision with `SnakeMotionController` and `SnakePlay`.
6. `circuit-dash` - arcade car checkpoint racing with `ArcadeCarMotionController`, `RaceTrackEnvironment`, `RaceCheckpointLapPlay`, car visuals, and minimap.
7. `hover-salvage` - six-axis hover pickup run with `GeneralVehicleMotionController`, `PickupObject`, pickup visuals, and heading-relative radar.
8. `turret-range` - fixed combat range using `AimResolver`, `ProjectileWeaponSystem`, `ProjectileManager`, `CombatPlay`, `ArenaEnvironment`, and `HealthBarView`.

## Verification Target

Each browser mini game should keep:

- A nonblank rendered playfield.
- A compact DOM HUD.
- A debug hook under `window.__...Debug` for smoke tests.
- At least one player input path that changes simulation state.
- GameBlocks module usage recorded in `gameblocks_usage.md`.
