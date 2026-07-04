# GameBlocks Trial Plan

## Good First Trials

1. Board prototype: use `BoardEnvironment`, `WorldBasis`, and simple block placement.
2. Character prototype: use `WorldCardinalCharacterMotionController` or `HeadingRelativeCharacterMotionController` with a follow camera.
3. Snake prototype: use `SnakeMotionController` and `SnakePlay`.
4. Vehicle prototype: use `ArcadeCarMotionController`, `CarVisualFactory`, and `RaceCheckpointLapPlay`.
5. Flight prototype: use `AirplaneMotionController`, `AirplaneModelController`, `FlightPlay`, and `FlightHud`.
6. Combat prototype: use `AimResolver`, `CombatPlay`, projectile systems, and arena/world object modules.

## Recommended First Prototype

Start with a board/block prototype because it best matches the `GameBlocks` project name and has a small surface area:

- `modules/math/WorldBasis.js`
- `modules/world/environment/BoardEnvironment.js`
- `modules/behavior/GridPathPlanner.js` if movement or routing is needed
- `modules/user-interface/DomHudRenderer.js` if a simple HUD is needed

## Completion Criteria For A Trial

- A browser page loads without console errors.
- The 3D scene is nonblank.
- User input changes visible gameplay state.
- Selected GameBlocks modules are copied to `src/gameblocks/`.
- `gameblocks_usage.md` records which modules were reused or adapted.

## Implemented Trial

`experiments/block-relay/` is a playable browser prototype:

- Click cells to place relay blocks.
- The route is checked through `GridPathPlanner`.
- The 3D board is created by `BoardEnvironment`.
- A glowing signal moves across the connected path when the run starts.

`experiments/contraption-lab/` is a playable 3D contraption prototype:

- Place fans, ramps, walls, and bumpers on a snapped 3D board.
- Run a Rapier3D marble simulation.
- Solve four short stages with deterministic blueprint solutions.
- Use `BoardEnvironment` and `WorldBasis` for board/world alignment.

The eight-game target is tracked in `docs/07_mini_game_set.md`.
