# GameBlocks Overview

## What It Is

GameBlocks is a local coding-agent skill and a library of concise JavaScript modules for browser-based 3D game prototypes.

It is not a ready-made game template. Its main value is that it gives Codex concrete source material for fragile 3D systems:

- gameplay-space coordinate basis
- actor and vehicle motion
- character movement
- camera rigs
- simple AI pathing and steering
- race, flight, combat, and snake gameplay state
- DOM HUD and minimap support
- terrain, board, arena, race track, pickups, projectiles, and visual effects

## Important Source Files

- `gameblocks/SKILL.md` - operating instructions for agents.
- `gameblocks/summary.md` - module catalog and dependency summary.
- `gameblocks/modules/math/WorldBasis.js` - coordinate-system source of truth.
- `gameblocks/modules/` - reusable implementation examples.

## Dependencies

The upstream summary lists these browser dependencies:

- Three.js `0.161.0`
- Rapier3D compat `0.14.0`

Some modules require only Three.js. Collision-aware movement and dynamic vehicle physics require Rapier3D.

## Local Setup

The project keeps three separate layers:

- `gameblocks/`: exact local skill copy from upstream.
- `src/gameblocks/`: modules copied into a real prototype.
- `experiments/`: playable or inspectable prototype applications.

This prevents the upstream reference from being edited accidentally while still making it easy to adapt selected modules.
