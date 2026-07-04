# GameBlocks Usage

This file records which GameBlocks modules are selected for each prototype.

## Current Status

`experiments/block-relay/` is the first playable prototype.

`experiments/contraption-lab/` is the second playable prototype.

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

## Contraption Lab Notes

`contraption-lab` uses `WorldBasis.js` and `BoardEnvironment.js` directly. Rapier3D physics is implemented locally in `experiments/contraption-lab/src/physics/createRunWorld.js` because the prototype needs a small deterministic marble simulation rather than a prebuilt GameBlocks gameplay mode.
