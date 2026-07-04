# Game Loop Draft

## Core Loop

1. Present a compact board or playfield.
2. Give the player a small set of block actions.
3. Let the player transform the board state.
4. Resolve the result immediately.
5. Award progress, score, unlocks, or the next puzzle.

## Design Constraints

- The first prototype should be playable within one minute.
- The player should understand success or failure from board state, not from long text.
- The prototype should support fast iteration: simple data files before complex tools.

## Open Questions

- Is this a puzzle game, automation game, action game, or sandbox?
- Are blocks physical objects, commands, tiles, resources, or characters?
- Should stages be handcrafted, generated, or both?
