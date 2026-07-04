export const TOOL_ORDER = Object.freeze(["fan", "ramp", "wall", "bumper"]);

export const PARTS = Object.freeze({
  fan: Object.freeze({
    id: "fan",
    label: "Fan",
    tint: "#67d9c0",
    height: 0.35,
  }),
  ramp: Object.freeze({
    id: "ramp",
    label: "Ramp",
    tint: "#f0b95b",
    height: 0.46,
  }),
  wall: Object.freeze({
    id: "wall",
    label: "Wall",
    tint: "#d86b7b",
    height: 0.7,
  }),
  bumper: Object.freeze({
    id: "bumper",
    label: "Bumper",
    tint: "#a982ff",
    height: 0.65,
  }),
});

export function rotationToVector(rotation = 0) {
  const normalized = ((rotation % 4) + 4) % 4;
  if (normalized === 0) return { right: 1, forward: 0 };
  if (normalized === 1) return { right: 0, forward: 1 };
  if (normalized === 2) return { right: -1, forward: 0 };
  return { right: 0, forward: -1 };
}

export function rotationToRadians(rotation = 0) {
  return -rotation * Math.PI * 0.5;
}

export function partKey(part) {
  return `${part.cell.right}:${part.cell.forward}`;
}

export function cellKey(cell) {
  return `${cell.right}:${cell.forward}`;
}

export function clonePart(part) {
  return {
    type: part.type,
    rotation: part.rotation ?? 0,
    cell: { right: part.cell.right, forward: part.cell.forward },
    fixed: Boolean(part.fixed),
  };
}
