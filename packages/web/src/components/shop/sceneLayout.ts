// Geometry for the apothecary scene, kept out of the JSX so it can be reasoned
// about and tested. Everything is in SVG user units (1:1 with CSS px at the
// scene's rendered width).
//
// Two arrangements share one shape:
//   desktop — shelf cabinet on the left, window on the right, table across
//             the bottom (the reference photo's layout).
//   compact — the same pieces stacked: cabinet, then window, then table, so
//             nothing gets too narrow to read on a phone.
export interface SceneLayout {
  width: number;
  height: number;
  cabinet: { x: number; y: number; w: number; baseY: number };
  interiorX: number;
  interiorW: number;
  shelfYs: number[];
  perShelf: number;
  windowBox: { x: number; y: number; w: number; h: number; sillY: number };
  tableY: number;
  candle: { x: number; y: number };
  foliageBaseline: number;
}

const FRAME = 12; // cabinet frame thickness
const SHELF_SPACING_WIDE = 148;
const SHELF_SPACING_COMPACT = 140;
const FIRST_SHELF_DROP = 124; // first shelf board below the cabinet top

export function sceneLayout(bottleCount: number, compact: boolean): SceneLayout {
  const cabinetTop = 34;
  const perShelf = compact ? 3 : 4;
  // Always show at least two boards so the cabinet reads as furniture even
  // when barely stocked.
  const shelfCount = Math.max(2, Math.ceil(Math.max(bottleCount, 1) / perShelf));
  const spacing = compact ? SHELF_SPACING_COMPACT : SHELF_SPACING_WIDE;
  const firstShelfY = cabinetTop + FIRST_SHELF_DROP;
  const shelfYs = Array.from({ length: shelfCount }, (_, i) => firstShelfY + i * spacing);
  const lastShelfY = shelfYs[shelfYs.length - 1] ?? firstShelfY;

  if (compact) {
    const width = 380;
    const cabinet = { x: 10, y: cabinetTop, w: 360, baseY: lastShelfY + 12 };
    const winY = cabinet.baseY + 22;
    const winH = 176;
    const windowBox = { x: 20, y: winY, w: 340, h: winH, sillY: winY + winH };
    const tableY = windowBox.sillY + 18;
    return {
      width,
      height: tableY + 30,
      cabinet,
      interiorX: cabinet.x + FRAME,
      interiorW: cabinet.w - FRAME * 2,
      shelfYs,
      perShelf,
      windowBox,
      tableY,
      candle: { x: width - 60, y: tableY },
      foliageBaseline: 52,
    };
  }

  const width = 680;
  const cabinet = { x: 16, y: cabinetTop, w: 372, baseY: lastShelfY + 30 };
  const tableY = cabinet.baseY;
  const winX = 404;
  const winY = cabinetTop + 26;
  // Window rises with the cabinet but never taller than a pleasant sash.
  const winH = Math.min(lastShelfY - winY, 280);
  const windowBox = { x: winX, y: winY, w: 260, h: winH, sillY: winY + winH };
  return {
    width,
    height: tableY + 30,
    cabinet,
    interiorX: cabinet.x + FRAME,
    interiorW: cabinet.w - FRAME * 2,
    shelfYs,
    perShelf,
    windowBox,
    tableY,
    candle: { x: 632, y: tableY },
    foliageBaseline: 54,
  };
}

// Split bottles into shelves top-first, left-to-right.
export function shelfRows<T>(bottles: T[], perShelf: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < bottles.length; i += perShelf) {
    rows.push(bottles.slice(i, i + perShelf));
  }
  return rows;
}

// Every shelf holds `perShelf` fixed slots. Medications fill them left-first,
// top shelf first; the leftover slots get decorative jars — so the shelves
// look packed (like the reference) however few medications there are, and the
// bottles keep stable positions the pill-flight can aim at.
export function totalSlots(l: SceneLayout): number {
  return l.shelfYs.length * l.perShelf;
}

export function slotCenter(l: SceneLayout, index: number): { x: number; shelfY: number } {
  const shelf = Math.floor(index / l.perShelf);
  const slot = index % l.perShelf;
  const slotW = l.interiorW / l.perShelf;
  return {
    x: Math.round(l.interiorX + slotW * (slot + 0.5)),
    shelfY: l.shelfYs[shelf] ?? l.shelfYs[0] ?? 0,
  };
}
