/**
 * 杂志主图：正方形网格 + 半格吸附
 * - 按画布自动细分正方形格，保证行列都能完整显示（不裁切半格）
 * - 拖动 / 缩放：超过半格就吸到格线（Math.round）
 * - 不允许自由尺寸，最终一定是整数格
 */

export const MAGAZINE_MAX = 7;
/** 目标方格边长（px），据此自动算出能完整铺满画布的行列 */
export const MAG_TARGET_CELL_PX = 36;
/** 最小占格 */
export const MAG_MIN_SPAN = 1;
/**
 * 行列取此数的倍数（lcm(2,3)=6）。
 * 这样 2×2 四宫格、3×3 九宫格都能整除铺满，杂志自由拖仍用同一套细格。
 * （不必单独做成 4 或 9 的倍数；6 的倍数已同时整除 2 与 3。）
 */
export const GRID_DIV_BASE = 6;

/** @deprecated 兼容旧引用，实际以 resolveSquareGrid 为准 */
export const MAGAZINE_COLS = 8;
export const MAGAZINE_ROWS = 10;
export const MAG_PREFER_CELLS = 12;

function snapToDivBase(n, base) {
  const b = Math.max(2, Math.floor(base) || GRID_DIV_BASE);
  let v = Math.round(Number(n) / b) * b;
  if (v < b) v = b;
  return v;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
}

/**
 * 半格吸附：连续值 → 整数格
 * 例：3.49 → 3，3.5 → 4
 */
export function snapHalf(value) {
  return Math.round(Number(value) || 0);
}

/**
 * 舞台网格：
 * - 行列均为 GRID_DIV_BASE(6) 的倍数，四宫/九宫可整除
 * - 格宽/格高可不同，铺满整个舞台（pad=0），上下左右都能拖到边
 * - cellPx 仅为兼容旧逻辑（取 min(cellW,cellH)）
 */
export function resolveSquareGrid(stageW, stageH) {
  const W = Math.max(80, Number(stageW) || 300);
  const H = Math.max(80, Number(stageH) || 400);
  const base = GRID_DIV_BASE;
  const target = Math.max(24, Math.min(48, MAG_TARGET_CELL_PX));

  let cols = snapToDivBase(Math.max(base, Math.round(W / target)), base);
  let rows = snapToDivBase(Math.max(base, Math.round(H / target)), base);
  let cellW = W / cols;
  let cellH = H / rows;

  const minCell = 20;
  while ((cellW < minCell || cellH < minCell) && (cols > base || rows > base)) {
    if (cellW <= cellH && cols > base) cols -= base;
    else if (rows > base) rows -= base;
    else break;
    cellW = W / cols;
    cellH = H / rows;
  }

  while (
    cellW > target * 1.4 &&
    cellH > target * 1.4 &&
    W / (cols + base) >= minCell &&
    H / (rows + base) >= minCell
  ) {
    cols += base;
    rows += base;
    cellW = W / cols;
    cellH = H / rows;
  }

  return {
    cols,
    rows,
    cellW,
    cellH,
    cellPx: Math.min(cellW, cellH),
    stageW: W,
    stageH: H,
    padX: 0,
    padY: 0,
    total: cols * rows,
  };
}

function gridMetrics(grid) {
  const G = grid || {};
  const C = Math.max(1, G.cols || MAG_PREFER_CELLS);
  const R = Math.max(1, G.rows || MAG_PREFER_CELLS);
  const W = Math.max(1, G.stageW || 300);
  const H = Math.max(1, G.stageH || 400);
  const cellW = Math.max(
    1,
    G.cellW != null ? G.cellW : G.cellPx != null ? G.cellPx : W / C
  );
  const cellH = Math.max(
    1,
    G.cellH != null ? G.cellH : G.cellPx != null ? G.cellPx : H / R
  );
  const padX = G.padX != null ? G.padX : 0;
  const padY = G.padY != null ? G.padY : 0;
  return { C, R, W, H, cellW, cellH, padX, padY };
}

export function gridMeta(cols, rows) {
  const c = Math.max(1, Math.floor(Number(cols) || 8));
  const r = Math.max(1, Math.floor(Number(rows) || 10));
  return { cols: c, rows: r, total: c * r };
}

/**
 * 占格 → 相对舞台 0~1（格宽/格高可不同，铺满舞台）
 */
export function cellToBox(cell, grid) {
  const { C, R, W, H, cellW, cellH, padX, padY } = gridMetrics(grid);
  const minS = MAG_MIN_SPAN;
  const raw = cell || { c: 0, r: 0, cs: minS, rs: minS };
  const c = clampInt(raw.c, 0, C - 1);
  const r = clampInt(raw.r, 0, R - 1);
  const cs = clampInt(raw.cs, minS, C - c);
  const rs = clampInt(raw.rs, minS, R - r);
  return {
    c,
    r,
    cs,
    rs,
    grid: C,
    gridRows: R,
    x: (padX + c * cellW) / W,
    y: (padY + r * cellH) / H,
    w: (cs * cellW) / W,
    h: (rs * cellH) / H,
  };
}

/** 旧 frame / 比例 → 当前网格占格 */
export function boxToCell(box, grid) {
  const G = grid || {};
  const { C, R, W, H, cellW, cellH, padX, padY } = gridMetrics(G);

  const sameGrid =
    box &&
    Number(box.grid) === C &&
    Number(box.gridRows) === R &&
    Number.isFinite(box.c) &&
    Number.isFinite(box.r) &&
    Number.isFinite(box.cs) &&
    Number.isFinite(box.rs);

  if (sameGrid) return cellToBox(box, G);

  if (
    box &&
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    Number.isFinite(box.w) &&
    Number.isFinite(box.h)
  ) {
    const left = box.x * W;
    const top = box.y * H;
    const width = box.w * W;
    const height = box.h * H;
    const c = clampInt(snapHalf((left - padX) / cellW), 0, C - 1);
    const r = clampInt(snapHalf((top - padY) / cellH), 0, R - 1);
    const cs = clampInt(
      Math.max(MAG_MIN_SPAN, snapHalf(width / cellW)),
      MAG_MIN_SPAN,
      C - c
    );
    const rs = clampInt(
      Math.max(MAG_MIN_SPAN, snapHalf(height / cellH)),
      MAG_MIN_SPAN,
      R - r
    );
    return cellToBox({ c, r, cs, rs }, G);
  }

  return null;
}

export function validFrame(frame) {
  if (!frame) return false;
  if (
    Number.isFinite(frame.c) &&
    Number.isFinite(frame.r) &&
    Number.isFinite(frame.cs) &&
    Number.isFinite(frame.rs) &&
    frame.cs >= 1 &&
    frame.rs >= 1
  ) {
    return true;
  }
  return (
    Number.isFinite(frame.x) &&
    Number.isFinite(frame.y) &&
    Number.isFinite(frame.w) &&
    Number.isFinite(frame.h) &&
    frame.w > 0.02 &&
    frame.h > 0.02
  );
}

/**
 * 展示用框：优先用编辑时存下的舞台比例 (x/y/w/h)。
 * 预览舞台尺寸常与编辑不同，若再按新方格吸附，相邻块高度会对不齐出现黑缝。
 */
export function frameDisplayBox(frame, grid) {
  if (!frame) return null;
  if (
    Number.isFinite(frame.x) &&
    Number.isFinite(frame.y) &&
    Number.isFinite(frame.w) &&
    Number.isFinite(frame.h) &&
    frame.w > 0.001 &&
    frame.h > 0.001
  ) {
    return {
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      c: frame.c,
      r: frame.r,
      cs: frame.cs,
      rs: frame.rs,
      grid: frame.grid,
      gridRows: frame.gridRows,
    };
  }
  const cell = boxToCell(frame, grid);
  return cell ? cellToBox(cell, grid) : null;
}

export function cellsOverlap(a, b) {
  if (!a || !b) return false;
  return !(
    a.c + a.cs <= b.c ||
    b.c + b.cs <= a.c ||
    a.r + a.rs <= b.r ||
    b.r + b.rs <= a.r
  );
}

export function inBounds(cell, grid) {
  const C = (grid && grid.cols) || MAG_PREFER_CELLS;
  const R = (grid && grid.rows) || MAG_PREFER_CELLS;
  if (!cell) return false;
  return (
    cell.c >= 0 &&
    cell.r >= 0 &&
    cell.cs >= 1 &&
    cell.rs >= 1 &&
    cell.c + cell.cs <= C &&
    cell.r + cell.rs <= R
  );
}

export function canPlace(cell, others, grid) {
  if (!inBounds(cell, grid)) return false;
  const list = (others || []).filter(Boolean);
  for (let i = 0; i < list.length; i += 1) {
    if (cellsOverlap(cell, list[i])) return false;
  }
  return true;
}

export function countFreeCells(cells, grid) {
  const C = (grid && grid.cols) || MAG_PREFER_CELLS;
  const R = (grid && grid.rows) || MAG_PREFER_CELLS;
  const total = C * R;
  const mask = new Array(total).fill(false);
  (cells || []).filter(Boolean).forEach((cell) => {
    for (let rr = cell.r; rr < cell.r + cell.rs; rr += 1) {
      for (let cc = cell.c; cc < cell.c + cell.cs; cc += 1) {
        if (rr >= 0 && rr < R && cc >= 0 && cc < C) mask[rr * C + cc] = true;
      }
    }
  });
  let free = 0;
  for (let i = 0; i < mask.length; i += 1) if (!mask[i]) free += 1;
  return free;
}

/**
 * 拖动：像素位移 → 半格吸附后的原点
 * @param originCell 起始占格
 * @param dxPx / dyPx 手指位移（像素）
 */
export function snapMoveByPx(originCell, dxPx, dyPx, grid) {
  const { C, R, cellW, cellH } = gridMetrics(grid);
  const c = clamp(
    snapHalf(originCell.c + dxPx / cellW),
    0,
    C - originCell.cs
  );
  const r = clamp(
    snapHalf(originCell.r + dyPx / cellH),
    0,
    R - originCell.rs
  );
  return cellToBox({ c, r, cs: originCell.cs, rs: originCell.rs }, grid);
}

/**
 * 缩放（右下角）：像素位移 → 半格吸附后的跨度
 * 超过半格就吸到下一格边
 */
export function snapResizeByPx(originCell, dxPx, dyPx, grid) {
  const { C, R, cellW, cellH } = gridMetrics(grid);
  const cs = clamp(
    snapHalf(originCell.cs + dxPx / cellW),
    MAG_MIN_SPAN,
    C - originCell.c
  );
  const rs = clamp(
    snapHalf(originCell.rs + dyPx / cellH),
    MAG_MIN_SPAN,
    R - originCell.r
  );
  return cellToBox(
    { c: originCell.c, r: originCell.r, cs, rs },
    grid
  );
}

function paintMask(mask, cell, cols, val) {
  for (let rr = cell.r; rr < cell.r + cell.rs; rr += 1) {
    for (let cc = cell.c; cc < cell.c + cell.cs; cc += 1) {
      mask[rr * cols + cc] = val;
    }
  }
}

function rectFreeOnMask(mask, cell, cols) {
  for (let rr = cell.r; rr < cell.r + cell.rs; rr += 1) {
    for (let cc = cell.c; cc < cell.c + cell.cs; cc += 1) {
      if (mask[rr * cols + cc]) return false;
    }
  }
  return true;
}

function buildMask(blocked, grid) {
  const C = grid.cols;
  const R = grid.rows;
  const mask = new Array(C * R).fill(false);
  (blocked || []).filter(Boolean).forEach((cell) => {
    paintMask(mask, cell, C, true);
  });
  return mask;
}

/** 是否贴边相邻（共边，含重叠）——原本贴在一起的要整组挪 */
function cellsAdjacent(a, b) {
  if (!a || !b) return false;
  if (cellsOverlap(a, b)) return true;
  const xTouch =
    a.c + a.cs === b.c ||
    b.c + b.cs === a.c;
  const yOverlap = !(a.r + a.rs <= b.r || b.r + b.rs <= a.r);
  const yTouch =
    a.r + a.rs === b.r ||
    b.r + b.rs === a.r;
  const xOverlap = !(a.c + a.cs <= b.c || b.c + b.cs <= a.c);
  return (xTouch && yOverlap) || (yTouch && xOverlap);
}

/** 被挤走的图按「原本是否贴在一起」分成连通组 */
function connectedDisplacedGroups(items) {
  const list = (items || []).filter((it) => it && it.cs > 0 && it.rs > 0);
  const n = list.length;
  const seen = new Array(n).fill(false);
  const groups = [];
  for (let i = 0; i < n; i += 1) {
    if (seen[i]) continue;
    const stack = [i];
    seen[i] = true;
    const group = [];
    while (stack.length) {
      const u = stack.pop();
      group.push(list[u]);
      for (let v = 0; v < n; v += 1) {
        if (seen[v]) continue;
        if (cellsAdjacent(list[u], list[v])) {
          seen[v] = true;
          stack.push(v);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

/**
 * 整组刚性平移：保持组内相对位置不变（两张贴在一起的小图不会被拆开）
 * @returns {Array<{id,cell}>|null}
 */
function tryPlaceGroupRigid(group, mask, grid, vacated) {
  if (!group || !group.length) return [];
  const C = grid.cols;
  const R = grid.rows;
  const minC = Math.min(...group.map((g) => g.c));
  const minR = Math.min(...group.map((g) => g.r));
  const rel = group.map((g) => ({
    id: g.id,
    dc: g.c - minC,
    dr: g.r - minR,
    cs: g.cs,
    rs: g.rs,
  }));
  const gw = Math.max(...rel.map((x) => x.dc + x.cs));
  const gh = Math.max(...rel.map((x) => x.dr + x.rs));

  const vacC = vacated ? vacated.c + vacated.cs / 2 : minC + gw / 2;
  const vacR = vacated ? vacated.r + vacated.rs / 2 : minR + gh / 2;
  const originC = minC + gw / 2;
  const originR = minR + gh / 2;

  let best = null;
  let bestScore = Infinity;

  for (let r = 0; r <= R - gh; r += 1) {
    for (let c = 0; c <= C - gw; c += 1) {
      let fit = true;
      for (let i = 0; i < rel.length; i += 1) {
        const cell = {
          c: c + rel[i].dc,
          r: r + rel[i].dr,
          cs: rel[i].cs,
          rs: rel[i].rs,
        };
        if (!rectFreeOnMask(mask, cell, C)) {
          fit = false;
          break;
        }
      }
      if (!fit) continue;
      const cx = c + gw / 2;
      const cy = r + gh / 2;
      const distVac = (cx - vacC) * (cx - vacC) + (cy - vacR) * (cy - vacR);
      const distOrg =
        (cx - originC) * (cx - originC) + (cy - originR) * (cy - originR);
      // 优先塞进腾出的空位，其次靠近原组位置
      const score = distVac * 5 + distOrg;
      if (score < bestScore) {
        bestScore = score;
        best = { c, r };
      }
    }
  }

  if (!best) return null;
  return rel.map((x) => ({
    id: x.id,
    cell: cellToBox(
      { c: best.c + x.dc, r: best.r + x.dr, cs: x.cs, rs: x.rs },
      grid
    ),
  }));
}

/**
 * 单张找空位（整组放不下时的兜底）；仍优先腾出区
 */
function findFreeSlotFor(item, mask, grid, vacated) {
  const C = grid.cols;
  const R = grid.rows;
  const cs = item.cs;
  const rs = item.rs;
  let best = null;
  let bestScore = Infinity;
  const preferC = item.c;
  const preferR = item.r;
  const vacC = vacated ? vacated.c + vacated.cs / 2 : preferC;
  const vacR = vacated ? vacated.r + vacated.rs / 2 : preferR;

  for (let r = 0; r <= R - rs; r += 1) {
    for (let c = 0; c <= C - cs; c += 1) {
      const cell = { c, r, cs, rs };
      if (!rectFreeOnMask(mask, cell, C)) continue;
      const oc = c + cs / 2;
      const or_ = r + rs / 2;
      const distOrigin =
        (c - preferC) * (c - preferC) + (r - preferR) * (r - preferR);
      const distVac = (oc - vacC) * (oc - vacC) + (or_ - vacR) * (or_ - vacR);
      const score = distVac * 5 + distOrigin;
      if (score < bestScore) {
        bestScore = score;
        best = cell;
      }
    }
  }
  return best;
}

/**
 * 只重排「被新占位挡住」的图；没被挡住的一律留在原位。
 * 原本贴在一起的被挤图 → 优先整组刚性平移，避免被拆开。
 */
export function placeDisplacedOnly(displaced, blocked, grid, vacated) {
  const C = grid.cols;
  const mask = buildMask(blocked, grid);
  const groups = connectedDisplacedGroups(displaced);
  // 先放大组，减少碎片
  groups.sort((a, b) => {
    const area = (g) => g.reduce((s, x) => s + x.cs * x.rs, 0);
    return area(b) - area(a);
  });

  const result = [];
  for (let gi = 0; gi < groups.length; gi += 1) {
    const group = groups[gi];
    const rigid = tryPlaceGroupRigid(group, mask, grid, vacated);
    if (rigid && rigid.length === group.length) {
      rigid.forEach((item) => {
        paintMask(mask, item.cell, C, true);
        result.push(item);
      });
      continue;
    }
    // 整组放不下再逐张（尽量仍靠近腾出区）
    const alone = group.slice().sort((a, b) => b.cs * b.rs - a.cs * a.rs);
    for (let i = 0; i < alone.length; i += 1) {
      const it = alone[i];
      const slot = findFreeSlotFor(it, mask, grid, vacated);
      if (!slot) return null;
      paintMask(mask, slot, C, true);
      result.push({ id: it.id, cell: cellToBox(slot, grid) });
    }
  }
  return result;
}

/**
 * 移动：
 * - 目标空着 → 直接放，别人不动
 * - 目标挡住别人 → 只挪被挡住的；没挡住的保持原位；被挪的优先填到腾出的空位
 * @param vacatedCell 拖动前的占格（腾出的空位）
 */
export function tryMoveCell(nextCell, others, grid, vacatedCell) {
  if (!inBounds(nextCell, grid)) return { ok: false, reason: 'out' };
  const rest = (others || []).filter(Boolean);
  if (canPlace(nextCell, rest, grid)) {
    return { ok: true, cell: nextCell, reflow: null };
  }

  const stay = [];
  const displaced = [];
  rest.forEach((o) => {
    if (cellsOverlap(nextCell, o)) displaced.push(o);
    else stay.push(o);
  });

  const blocked = [nextCell].concat(stay);
  const packed = placeDisplacedOnly(
    displaced,
    blocked,
    grid,
    vacatedCell || null
  );
  if (!packed) return { ok: false, reason: 'others' };
  return { ok: true, cell: nextCell, reflow: packed };
}

export function tryResizeCell(nextCell, originCell, others, grid) {
  if (!inBounds(nextCell, grid)) return { ok: false, reason: 'out' };
  if (nextCell.cs <= originCell.cs && nextCell.rs <= originCell.rs) {
    return { ok: true, cell: nextCell, reflow: null };
  }
  const rest = (others || []).filter(Boolean);
  if (canPlace(nextCell, rest, grid)) {
    return { ok: true, cell: nextCell, reflow: null };
  }
  // 放大挡住别人：只挪被挡住的，其余不动
  const stay = [];
  const displaced = [];
  rest.forEach((o) => {
    if (cellsOverlap(nextCell, o)) displaced.push(o);
    else stay.push(o);
  });
  const packed = placeDisplacedOnly(
    displaced,
    [nextCell].concat(stay),
    grid,
    null
  );
  if (packed) return { ok: true, cell: nextCell, reflow: packed };
  return { ok: false, reason: 'space' };
}

/** 把 total 尽量均分成 parts 段（每段至少 1） */
function splitSpans(total, parts) {
  const p = Math.max(1, Math.floor(parts) || 1);
  const T = Math.max(p, Math.floor(total) || p);
  const base = Math.floor(T / p);
  const rem = T % p;
  const out = [];
  for (let i = 0; i < p; i += 1) {
    out.push(base + (i < rem ? 1 : 0));
  }
  return out;
}

/**
 * 均分宫格预设（四宫格 2×2 / 九宫格 3×3）
 * 在当前细方格上铺满整块舞台，无缝贴合
 */
export function packEqualGrid(count, divCols, divRows, grid) {
  const C = (grid && grid.cols) || MAG_PREFER_CELLS;
  const R = (grid && grid.rows) || MAG_PREFER_CELLS;
  const dc = Math.max(1, Math.floor(divCols) || 2);
  const dr = Math.max(1, Math.floor(divRows) || 2);
  const maxN = dc * dr;
  const n = Math.max(0, Math.min(maxN, Math.floor(count) || 0));
  if (n <= 0) return [];

  const csList = splitSpans(C, dc);
  const rsList = splitSpans(R, dr);
  const slots = [];
  let r0 = 0;
  for (let row = 0; row < dr; row += 1) {
    let c0 = 0;
    for (let col = 0; col < dc; col += 1) {
      slots.push({
        c: c0,
        r: r0,
        cs: csList[col],
        rs: rsList[row],
      });
      c0 += csList[col];
    }
    r0 += rsList[row];
  }
  return slots.slice(0, n).map((cell) => cellToBox(cell, grid));
}

/** 杂志拼贴模板 key（网格族下的自由拼贴风格） */
export const MAGAZINE_LAYOUT_KEYS = [
  'magazine',
  'magazineTop',
  'magazineSplit',
  'magazineFocus',
];

export function isMagazineLayoutKey(layout) {
  const key = layout === 'grid' ? 'grid4' : layout || '';
  return MAGAZINE_LAYOUT_KEYS.indexOf(key) >= 0;
}

/** 网格族风格 → 默认占位；grid4 / grid9 / magazine* */
export function packStyleFrames(layout, count, grid) {
  const key = layout === 'grid' ? 'grid4' : layout || 'magazine';
  if (key === 'grid4') return packEqualGrid(count, 2, 2, grid);
  if (key === 'grid9') return packEqualGrid(count, 3, 3, grid);
  return packMagazineLayout(count, grid, key);
}

export function styleFrameMax(layout) {
  const key = layout === 'grid' ? 'grid4' : layout || 'magazine';
  if (key === 'grid4') return 4;
  if (key === 'grid9') return 9;
  return MAGAZINE_MAX;
}

function splitRow(c0, r, totalCs, rs, slots) {
  const n = Math.max(1, slots);
  const cells = [];
  let c = c0;
  const base = Math.max(1, Math.floor(totalCs / n));
  for (let i = 0; i < n; i += 1) {
    const cs = i === n - 1 ? c0 + totalCs - c : base;
    cells.push({ c, r, cs, rs });
    c += cs;
  }
  return cells;
}

function splitCol(c, r0, cs, totalRs, slots) {
  const n = Math.max(1, slots);
  const cells = [];
  let r = r0;
  const base = Math.max(1, Math.floor(totalRs / n));
  for (let i = 0; i < n; i += 1) {
    const rs = i === n - 1 ? r0 + totalRs - r : base;
    cells.push({ c, r, cs, rs });
    r += rs;
  }
  return cells;
}

/** 经典：左大图 + 右上下 + 底通栏 */
function cellsMagazineClassic(n, C, R) {
  const heroCs = Math.max(2, Math.min(C - 1, Math.round((C * 2) / 3)));
  const heroRs = Math.max(2, Math.min(R - 1, Math.round((R * 2) / 3)));
  const sideCs = Math.max(1, C - heroCs);
  const botRs = Math.max(1, R - heroRs);
  const sideTopRs = Math.max(1, Math.floor(heroRs / 2));
  const sideBotRs = Math.max(1, heroRs - sideTopRs);

  if (n === 1) {
    return [{ c: 0, r: 0, cs: Math.min(C, heroCs + 1), rs: Math.min(R, heroRs + 1) }];
  }
  if (n === 2) {
    return [
      { c: 0, r: 0, cs: heroCs, rs: R },
      { c: heroCs, r: 0, cs: sideCs, rs: R },
    ];
  }
  if (n === 3) {
    return [
      { c: 0, r: 0, cs: heroCs, rs: R },
      { c: heroCs, r: 0, cs: sideCs, rs: Math.ceil(R / 2) },
      { c: heroCs, r: Math.ceil(R / 2), cs: sideCs, rs: Math.floor(R / 2) },
    ];
  }
  if (n === 4) {
    return [
      { c: 0, r: 0, cs: heroCs, rs: heroRs },
      { c: heroCs, r: 0, cs: sideCs, rs: sideTopRs },
      { c: heroCs, r: sideTopRs, cs: sideCs, rs: sideBotRs },
      { c: 0, r: heroRs, cs: C, rs: botRs },
    ];
  }
  if (n === 5) {
    return [
      { c: 0, r: 0, cs: heroCs, rs: heroRs },
      { c: heroCs, r: 0, cs: sideCs, rs: sideTopRs },
      { c: heroCs, r: sideTopRs, cs: sideCs, rs: sideBotRs },
      { c: 0, r: heroRs, cs: Math.ceil(C / 2), rs: botRs },
      { c: Math.ceil(C / 2), r: heroRs, cs: Math.floor(C / 2), rs: botRs },
    ];
  }
  const list = [{ c: 0, r: 0, cs: heroCs, rs: heroRs }];
  const rest = n - 1;
  const sideSlots = Math.max(1, Math.floor(rest / 2));
  const botSlots = rest - sideSlots;
  return list
    .concat(splitCol(heroCs, 0, sideCs, heroRs, sideSlots))
    .concat(splitRow(0, heroRs, C, botRs, botSlots));
}

/**
 * 顶栏 / 底栏模板数字（列×行）：
 * 画布 12×18；小图 4×6；大图 12×12
 */
const MAG_BAND_COLS = 12;
const MAG_BAND_ROWS = 18;
const MAG_SMALL_CS = 4;
const MAG_SMALL_RS = 6;
const MAG_HERO_CS = 12;
const MAG_HERO_RS = 12;

/** 顶栏/底栏专用：12 列 × 18 行，格铺满舞台，模板数字可直接写 4×6 / 12×12 */
export function resolveMagazineBandGrid(stageW, stageH) {
  const W = Math.max(80, Number(stageW) || 300);
  const H = Math.max(80, Number(stageH) || 400);
  const cols = MAG_BAND_COLS;
  const rows = MAG_BAND_ROWS;
  return {
    cols,
    rows,
    cellW: W / cols,
    cellH: H / rows,
    cellPx: Math.min(W / cols, H / rows),
    stageW: W,
    stageH: H,
    padX: 0,
    padY: 0,
    total: cols * rows,
  };
}

export function isMagazineBandLayout(layout) {
  return layout === 'magazineTop' || layout === 'magazineFocus';
}

/** 按设计宽均分；3 张时正好每个宽 4 */
function splitBandWidths(slots) {
  const n = Math.max(1, Math.floor(slots) || 1);
  if (n === 3) return [4, 4, 4];
  const base = Math.max(1, Math.floor(MAG_BAND_COLS / n));
  const out = [];
  let used = 0;
  for (let i = 0; i < n; i += 1) {
    const v = i === n - 1 ? Math.max(1, MAG_BAND_COLS - used) : base;
    out.push(v);
    used += v;
  }
  return out;
}

/** 底栏主图：上排小图 4×6，下方大图 12×12 */
function cellsMagazineFocus(n) {
  if (n === 1) {
    return [{ c: 0, r: 0, cs: MAG_HERO_CS, rs: MAG_HERO_RS }];
  }
  const smallN = n - 1;
  const widths = splitBandWidths(smallN);
  const smalls = [];
  let cAcc = 0;
  for (let i = 0; i < smallN; i += 1) {
    smalls.push({
      c: cAcc,
      r: 0,
      cs: widths[i],
      rs: MAG_SMALL_RS,
    });
    cAcc += widths[i];
  }
  return smalls.concat([
    { c: 0, r: MAG_SMALL_RS, cs: MAG_HERO_CS, rs: MAG_HERO_RS },
  ]);
}

/** 顶栏主图：上方大图 12×12，下排小图 4×6 */
function cellsMagazineTop(n) {
  if (n === 1) {
    return [{ c: 0, r: 0, cs: MAG_HERO_CS, rs: MAG_HERO_RS }];
  }
  const smallN = n - 1;
  const widths = splitBandWidths(smallN);
  const smalls = [];
  let cAcc = 0;
  for (let i = 0; i < smallN; i += 1) {
    smalls.push({
      c: cAcc,
      r: MAG_HERO_RS,
      cs: widths[i],
      rs: MAG_SMALL_RS,
    });
    cAcc += widths[i];
  }
  return [{ c: 0, r: 0, cs: MAG_HERO_CS, rs: MAG_HERO_RS }].concat(smalls);
}

/** 左右对开：左栏主图，右栏竖排小图 */
function cellsMagazineSplit(n, C, R) {
  const leftCs = Math.max(2, Math.min(C - 1, Math.round(C / 2)));
  const rightCs = Math.max(1, C - leftCs);
  if (n === 1) return [{ c: 0, r: 0, cs: C, rs: R }];
  if (n === 2) {
    return [
      { c: 0, r: 0, cs: leftCs, rs: R },
      { c: leftCs, r: 0, cs: rightCs, rs: R },
    ];
  }
  return [{ c: 0, r: 0, cs: leftCs, rs: R }].concat(
    splitCol(leftCs, 0, rightCs, R, n - 1)
  );
}

/**
 * 杂志模板占位
 * @param {number} count
 * @param {object} grid
 * @param {string} [templateKey] magazine | magazineTop | magazineSplit | magazineFocus
 */
export function packMagazineLayout(count, grid, templateKey) {
  const n = Math.max(0, Math.min(MAGAZINE_MAX, Math.floor(count) || 0));
  const C = (grid && grid.cols) || MAG_PREFER_CELLS;
  const R = (grid && grid.rows) || MAG_PREFER_CELLS;
  if (n <= 0) return [];

  const key = isMagazineLayoutKey(templateKey) ? templateKey : 'magazine';
  let list;
  if (key === 'magazineTop') list = cellsMagazineTop(n);
  else if (key === 'magazineSplit') list = cellsMagazineSplit(n, C, R);
  else if (key === 'magazineFocus') list = cellsMagazineFocus(n);
  else list = cellsMagazineClassic(n, C, R);

  return list.map((cell) => cellToBox(cell, grid));
}

export function findFreeCell(occupied, cs, rs, grid) {
  const C = grid.cols;
  const R = grid.rows;
  let wantCs = clampInt(cs != null ? cs : 2, MAG_MIN_SPAN, C);
  let wantRs = clampInt(rs != null ? rs : 2, MAG_MIN_SPAN, R);
  for (let shrink = 0; shrink < 5; shrink += 1) {
    for (let r = 0; r <= R - wantRs; r += 1) {
      for (let c = 0; c <= C - wantCs; c += 1) {
        const cell = cellToBox({ c, r, cs: wantCs, rs: wantRs }, grid);
        if (canPlace(cell, occupied, grid)) return cell;
      }
    }
    wantCs = Math.max(MAG_MIN_SPAN, wantCs - 1);
    wantRs = Math.max(MAG_MIN_SPAN, wantRs - 1);
  }
  return null;
}

function sameCell(a, b) {
  return !!(
    a &&
    b &&
    a.c === b.c &&
    a.r === b.r &&
    a.cs === b.cs &&
    a.rs === b.rs
  );
}

/**
 * @param {Array} photos
 * @param {object} grid
 * @param {{ force?: boolean, layout?: string }} [opts]
 *        force=true 忽略已有 frame，按风格模板重排
 *        layout: grid4 | grid9 | magazine | magazineTop | magazineSplit | magazineFocus
 */
export function ensureMagazineFrames(photos, grid, opts = {}) {
  const G = grid || resolveSquareGrid(300, 400);
  const C = G.cols;
  const R = G.rows;
  const layout = (opts && opts.layout) || 'magazine';
  const layoutKey = layout === 'grid' ? 'grid4' : layout;
  const isEqual = layoutKey === 'grid4' || layoutKey === 'grid9';
  const raw = (photos || []).slice(0, styleFrameMax(layoutKey));
  let changed = false;
  const force = !!(opts && opts.force);

  const frames = raw.map((p) => {
    if (force || !p || !validFrame(p.frame)) return null;
    return boxToCell(p.frame, G);
  });

  const missingIdx = [];
  frames.forEach((f, i) => {
    if (raw[i] && !f) missingIdx.push(i);
  });
  const present = raw.filter(Boolean).length;
  // 均分风格：舞台行列变了（例如收到 6 的倍数）也要整表重套
  const gridMismatch =
    isEqual &&
    raw.some((p) => {
      if (!p || !validFrame(p.frame)) return false;
      return (
        Number(p.frame.grid) !== C || Number(p.frame.gridRows) !== R
      );
    });

  const applyPack = (n) => {
    const packed = packStyleFrames(layoutKey, n, G);
    let k = 0;
    for (let i = 0; i < frames.length; i += 1) {
      if (!raw[i]) continue;
      frames[i] = packed[k];
      k += 1;
    }
  };

  // 均分风格：缺图 / 换网格 → 整表重套，保证 2×2、3×3 贴满
  if (
    present > 0 &&
    (force ||
      missingIdx.length === present ||
      (isEqual && (missingIdx.length > 0 || gridMismatch)))
  ) {
    applyPack(present);
    changed = true;
  } else if (missingIdx.length > 0) {
    missingIdx.forEach((i) => {
      frames[i] =
        findFreeCell(frames.filter(Boolean), 2, 2, G) ||
        cellToBox({ c: 0, r: 0, cs: 1, rs: 1 }, G);
      changed = true;
    });
  }

  let overlap = false;
  const placed = frames.filter(Boolean);
  for (let i = 0; i < placed.length && !overlap; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      if (cellsOverlap(placed[i], placed[j])) {
        overlap = true;
        break;
      }
    }
  }
  if (overlap) {
    applyPack(placed.length);
    changed = true;
  }

  const list = raw.map((p, i) => {
    if (!p) return p;
    const frame = frames[i];
    if (!frame) return p;
    if (
      sameCell(p.frame, frame) &&
      Number(p.frame.grid) === C &&
      Number(p.frame.gridRows) === R
    ) {
      return p;
    }
    changed = true;
    return { ...p, frame: { ...frame } };
  });

  return { list, changed };
}

export function defaultFrameAt(index, total, grid, layout) {
  const G = grid || resolveSquareGrid(300, 400);
  const packed = packStyleFrames(layout || 'magazine', total, G);
  return packed[index] || findFreeCell(packed.slice(0, index), 2, 2, G);
}

export function frameToStyle(frame, grid) {
  const box = cellToBox(frame || boxToCell(frame, grid), grid);
  if (!box) return '';
  return `left:${box.x * 100}%;top:${box.y * 100}%;width:${box.w * 100}%;height:${box.h * 100}%;`;
}

export function clampFrameToPad(frame, grid) {
  return cellToBox(boxToCell(frame, grid) || frame, grid);
}

export const MAG_MIN_W = 1 / MAG_PREFER_CELLS;
export const MAG_MIN_H = 1 / MAG_PREFER_CELLS;
