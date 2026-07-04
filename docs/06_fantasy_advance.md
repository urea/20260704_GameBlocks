# Fantasy Advance

`experiments/fantasy-advance/` is a browser prototype of the fantasy base-advance card game.

## Core Loop

1. Check the current batter in the 9-card lineup.
2. Pick one hidden defense slot from D1 to D9.
3. Compare main types to determine Hit or Out.
4. If Hit, compare elements to determine 1Hit or 2Hit.
5. Remove defeated defense cards and advance runners.
6. Change sides at 3Out while preserving batting order.

## Implemented Rules

- 16-card type catalog: 剣 / 弓 / 魔 / 盾 by 火 / 水 / 風 / 土.
- Main type advantage decides Hit or Out.
- Element advantage upgrades a Hit to 2Hit.
- Out keeps the defense card hidden and records only failed main-type information.
- Hit reveals and removes the defense card.
- 1Hit and 2Hit use baseball-style base advancement.
- 3Out clears runners and changes sides.
- Batting order continues across innings.
- Three innings are played, with extra innings on a tie.
- Removing all 9 enemy defense cards wins immediately.

## UI Notes

The supplied 4x4 card image is used as a CSS sprite sheet. The app keeps the real interface code-native: defense buttons, public card list, failure chips, bases, score, outs, and battle log are all DOM state, not a static screenshot.
