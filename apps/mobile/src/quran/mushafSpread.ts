export type MushafGeometry = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  right?: number;
  bottom?: number;
  active?: number;
};

type MushafPresentation =
  | { kind: "single" }
  | { kind: "spread"; hinge?: { left: number; right: number; gap: number } }
  | { kind: "tabletop"; top: number; gap: number };

export function mushafPresentation(geometry: MushafGeometry | null): MushafPresentation {
  if (!geometry) return { kind: "single" };
  const { width, height, x, y, right, bottom, active } = geometry;
  if (x === undefined || y === undefined || right === undefined || bottom === undefined) return { kind: "single" };

  if (active) {
    const vertical = bottom - y >= right - x;
    if (vertical && x >= 235 && width - right >= 235) {
      return { kind: "spread", hinge: { left: x, right: width - right, gap: right - x } };
    }
    if (!vertical && y >= 120 && height - bottom >= 100) {
      return { kind: "tabletop", top: y, gap: bottom - y };
    }
  }
  return width >= 600 && !active ? { kind: "spread" } : { kind: "single" };
}

export function mushafSpreadStart(page: number) {
  return page % 2 === 0 ? page - 1 : page;
}

export function mushafTurn(page: number, direction: 1 | -1, spread: boolean) {
  return spread ? mushafSpreadStart(page) + 2 * direction : page + direction;
}
