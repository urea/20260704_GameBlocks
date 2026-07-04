# Contraption Lab

`experiments/contraption-lab/` is a 3D contraption puzzle prototype.

## Core Loop

1. Choose a part from the toolbelt.
2. Rotate it if needed.
3. Place parts on the 3D board.
4. Run the marble simulation.
5. If the marble reaches the cup, advance to the next stage.

## Current Parts

- Fan: applies directional horizontal force without blocking the ball.
- Ramp: gives the ball a forward and upward jump impulse.
- Wall: blocks and redirects the ball.
- Bumper: gives the ball a radial bounce impulse.

## Implementation Notes

- Three.js owns rendering.
- Rapier3D owns the marble body, floor, bounds, walls, bumpers, and obstacles.
- Fan and ramp are deterministic gameplay force fields layered over Rapier.
- Game state lives in `simulation/contraptionGame.js`; render and physics are adapters.

## Verification

The Playwright verification script places each level's solution, runs the simulation, and confirms all four levels end in `won`.
