/**
 * 网格吸附（纯函数，与 UI 无关）
 * 坐标均为相对画布 0~1。
 *
 * 一期：move 吸左上角保持 w/h；resize 吸对应边。
 * 照片墙可复用同一 API，改 cols 即可。
 */

export const DEFAULT_COLS = 12;
export const DEFAULT_ROWS = 12;
const MIN_SIZE = 0.06;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildLines(count) {
  const n = Math.max(1, Math.floor(Number(count) || 1));
  const lines = [];
  for (let i = 0; i <= n; i += 1) {
    lines.push(i / n);
  }
  return lines;
}

function resolveThreshold(opts = {}) {
  if (opts.threshold != null && Number.isFinite(opts.threshold)) {
    return Math.max(0, Number(opts.threshold));
  }
  const px = opts.thresholdPx != null ? Number(opts.thresholdPx) : 6;
  const canvasWidth = Number(opts.canvasWidth) || 0;
  if (canvasWidth > 0) return Math.max(0.004, px / canvasWidth);
  return 0.012;
}

function nearestLine(value, lines, threshold) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const d = Math.abs(value - line);
    if (d <= threshold && d < bestDist) {
      bestDist = d;
      best = line;
    }
  }
  return best;
}

/**
 * @param {{ x: number, y: number, w: number, h: number }} box
 * @param {{
 *   cols?: number,
 *   rows?: number,
 *   threshold?: number,
 *   thresholdPx?: number,
 *   canvasWidth?: number,
 *   mode?: 'move' | 'resize',
 *   edges?: { left?: boolean, top?: boolean, right?: boolean, bottom?: boolean },
 *   minW?: number,
 *   minH?: number,
 * }} [opts]
 */
export function snapToGrid(box, opts = {}) {
  const x = Number(box && box.x) || 0;
  const y = Number(box && box.y) || 0;
  let w = Number(box && box.w) || 0;
  let h = Number(box && box.h) || 0;
  const minW = opts.minW != null ? Number(opts.minW) : MIN_SIZE;
  const minH = opts.minH != null ? Number(opts.minH) : MIN_SIZE;
  const cols = Math.max(1, Math.floor(Number(opts.cols) || DEFAULT_COLS));
  const rows = Math.max(1, Math.floor(Number(opts.rows) || DEFAULT_ROWS));
  const threshold = resolveThreshold(opts);
  const mode = opts.mode === 'resize' ? 'resize' : 'move';
  const edges = opts.edges || {};

  const vLines = buildLines(cols);
  const hLines = buildLines(rows);

  let nextX = x;
  let nextY = y;
  let nextW = w;
  let nextH = h;
  const guides = { vertical: [], horizontal: [] };

  const pushUnique = (arr, v) => {
    if (v == null) return;
    if (arr.indexOf(v) === -1) arr.push(v);
  };

  if (mode === 'move') {
    const sx = nearestLine(x, vLines, threshold);
    const sy = nearestLine(y, hLines, threshold);
    if (sx != null) {
      nextX = sx;
      pushUnique(guides.vertical, sx);
    }
    if (sy != null) {
      nextY = sy;
      pushUnique(guides.horizontal, sy);
    }
  } else {
    // resize：传入任一 edge=true 时只吸这些边；否则四边都可吸
    const hasAny =
      edges.left === true ||
      edges.top === true ||
      edges.right === true ||
      edges.bottom === true;
    const leftOn = hasAny ? !!edges.left : true;
    const topOn = hasAny ? !!edges.top : true;
    const rightOn = hasAny ? !!edges.right : true;
    const bottomOn = hasAny ? !!edges.bottom : true;

    let left = x;
    let top = y;
    let right = x + w;
    let bottom = y + h;

    if (leftOn) {
      const s = nearestLine(left, vLines, threshold);
      if (s != null) {
        left = s;
        pushUnique(guides.vertical, s);
      }
    }
    if (rightOn) {
      const s = nearestLine(right, vLines, threshold);
      if (s != null) {
        right = s;
        pushUnique(guides.vertical, s);
      }
    }
    if (topOn) {
      const s = nearestLine(top, hLines, threshold);
      if (s != null) {
        top = s;
        pushUnique(guides.horizontal, s);
      }
    }
    if (bottomOn) {
      const s = nearestLine(bottom, hLines, threshold);
      if (s != null) {
        bottom = s;
        pushUnique(guides.horizontal, s);
      }
    }

    nextX = left;
    nextY = top;
    nextW = right - left;
    nextH = bottom - top;
    if (nextW < minW) {
      if (rightOn && !leftOn) nextX = right - minW;
      else if (leftOn && !rightOn) {
        /* keep left, expand right implicitly via minW */
      }
      nextW = minW;
    }
    if (nextH < minH) {
      if (bottomOn && !topOn) nextY = bottom - minH;
      nextH = minH;
    }
  }

  nextW = clamp(nextW, minW, 1.5);
  nextH = clamp(nextH, minH, 1.5);
  nextX = clamp(nextX, -0.25, 1.25);
  nextY = clamp(nextY, -0.25, 1.25);

  return {
    box: { x: nextX, y: nextY, w: nextW, h: nextH },
    guides,
    meta: { cols, rows, threshold },
  };
}

/** 生成全量网格线（叠加层淡线用） */
export function gridLinePositions(cols, rows) {
  return {
    vertical: buildLines(cols),
    horizontal: buildLines(rows),
  };
}
