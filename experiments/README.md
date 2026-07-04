# Experiments

Put playable or inspectable browser prototypes here.

Suggested layout for the first prototype:

```text
experiments/board-blocks/
  index.html
  package.json
  src/
```

When an experiment uses GameBlocks modules, copy those modules into `src/gameblocks/` and document them in `gameblocks_usage.md`.

## Current Experiments

- `sky-courier/` - 3D aircraft ring-course prototype focused on GameBlocks flight modules.
- `contraption-lab/` - 3D contraption puzzle using Rapier3D with GameBlocks board/world helpers.
- `block-relay/` - snapped route-building puzzle using GameBlocks grid/path helpers.
