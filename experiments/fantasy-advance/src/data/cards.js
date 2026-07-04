export const MAIN_TYPES = Object.freeze([
  { id: "sword", label: "剣", icon: "⚔", row: 0 },
  { id: "bow", label: "弓", icon: "⌁", row: 1 },
  { id: "magic", label: "魔", icon: "✶", row: 2 },
  { id: "shield", label: "盾", icon: "⬟", row: 3 },
]);

export const ELEMENT_TYPES = Object.freeze([
  { id: "fire", label: "火", icon: "●", col: 0 },
  { id: "water", label: "水", icon: "◆", col: 1 },
  { id: "wind", label: "風", icon: "◉", col: 2 },
  { id: "earth", label: "土", icon: "▲", col: 3 },
]);

export const MAIN_ADVANTAGE = Object.freeze({
  sword: "magic",
  magic: "shield",
  shield: "bow",
  bow: "sword",
});

export const ELEMENT_ADVANTAGE = Object.freeze({
  fire: "wind",
  wind: "earth",
  earth: "water",
  water: "fire",
});

export const INITIAL_LINEUP = Object.freeze([
  "sword-fire",
  "bow-wind",
  "magic-water",
  "sword-wind",
  "shield-earth",
  "magic-fire",
  "bow-water",
  "shield-wind",
  "sword-earth",
]);

const MAIN_BY_ID = Object.fromEntries(MAIN_TYPES.map((type) => [type.id, type]));
const ELEMENT_BY_ID = Object.fromEntries(ELEMENT_TYPES.map((type) => [type.id, type]));

export const CARD_CATALOG = Object.freeze(Object.fromEntries(
  MAIN_TYPES.flatMap((main) =>
    ELEMENT_TYPES.map((element) => {
      const id = `${main.id}-${element.id}`;
      return [id, Object.freeze({
        id,
        main: main.id,
        element: element.id,
        label: `${main.label}${element.label}`,
        mainLabel: main.label,
        elementLabel: element.label,
        mainIcon: main.icon,
        elementIcon: element.icon,
        row: main.row,
        col: element.col,
      })];
    })
  )
));

export function cardById(id) {
  return CARD_CATALOG[id];
}

export function mainTypeById(id) {
  return MAIN_BY_ID[id];
}

export function elementTypeById(id) {
  return ELEMENT_BY_ID[id];
}

export function cardClassNames(cardId) {
  const card = cardById(cardId);
  return `card-${card.main} element-${card.element}`;
}
