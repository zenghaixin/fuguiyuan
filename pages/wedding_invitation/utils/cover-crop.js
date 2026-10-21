/**
 * 网格格内裁剪：用图片 UV 矩形 {x,y,w,h}（0~1）描述可视区域
 */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function clamp01(n) {
  return clamp(Number(n) || 0, 0, 1);
}

export function normalizeCoverCrop(crop) {
  if (!crop) return null;
  let x = clamp01(crop.x);
  let y = clamp01(crop.y);
  let w = clamp(Number(crop.w) || 0, 0.05, 1);
  let h = clamp(Number(crop.h) || 0, 0.05, 1);
  if (x + w > 1) x = Math.max(0, 1 - w);
  if (y + h > 1) y = Math.max(0, 1 - h);
  return { x, y, w, h };
}

/** 接近整图的窗视为未裁剪（避免 scaleToFill 拉变形） */
export function isActiveCoverCrop(crop) {
  const c = normalizeCoverCrop(crop);
  if (!c) return false;
  if (c.x <= 0.02 && c.y <= 0.02 && c.w >= 0.96 && c.h >= 0.96) {
    return false;
  }
  return true;
}

/** coverFocus(0~100) + 单元格/图片宽高比 → 初始裁剪窗 */
export function coverFocusToCrop(focus, cellAspect, imgAspect) {
  const fx =
    focus && Number.isFinite(Number(focus.x)) ? Number(focus.x) / 100 : 0.5;
  const fy =
    focus && Number.isFinite(Number(focus.y)) ? Number(focus.y) / 100 : 0.5;
  const ca = Math.max(0.05, Number(cellAspect) || 1);
  const ia = Math.max(0.05, Number(imgAspect) || ca);

  if (ia >= ca) {
    const w = clamp(ca / ia, 0.05, 1);
    const x = clamp((1 - w) * fx, 0, 1 - w);
    return { x, y: 0, w, h: 1 };
  }
  const h = clamp(ia / ca, 0.05, 1);
  const y = clamp((1 - h) * fy, 0, 1 - h);
  return { x: 0, y, w: 1, h };
}

export function defaultCoverCrop(cellAspect, imgAspect) {
  return coverFocusToCrop({ x: 50, y: 50 }, cellAspect, imgAspect);
}

/**
 * 格子屏幕宽高比：
 * frame.w/h 是相对舞台宽高的 0~1，不能直接相除；
 * 应用 (w*stageW)/(h*stageH)，或占格 × 格宽高。
 */
export function tileCellAspect(frame, grid) {
  const f = frame || {};
  const g = grid || {};
  const stageW = Math.max(1, Number(g.stageW) || 1);
  const stageH = Math.max(1, Number(g.stageH) || 1);
  if (Number(f.w) > 0 && Number(f.h) > 0) {
    return (Number(f.w) * stageW) / (Number(f.h) * stageH);
  }
  const cellW = Math.max(
    1,
    g.cellW != null ? Number(g.cellW) : Number(g.cellPx) || stageW / Math.max(1, g.cols || 1)
  );
  const cellH = Math.max(
    1,
    g.cellH != null ? Number(g.cellH) : Number(g.cellPx) || stageH / Math.max(1, g.rows || 1)
  );
  const cs = Math.max(1, Number(f.cs) || 1);
  const rs = Math.max(1, Number(f.rs) || 1);
  return (cs * cellW) / (rs * cellH);
}

/** 把裁剪窗校正为格子宽高比，尽量保持中心 */
export function fitCoverCropToAspect(crop, cellAspect, imgAspect) {
  const aspect =
    Math.max(0.05, Number(cellAspect) || 1) /
    Math.max(0.05, Number(imgAspect) || 1);
  let c = normalizeCoverCrop(crop) || { x: 0, y: 0, w: 1, h: 1 };
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  let w = c.w;
  let h = w / aspect;
  if (h > 1) {
    h = 1;
    w = h * aspect;
  }
  if (w > 1) {
    w = 1;
    h = w / aspect;
  }
  const minW = 0.12;
  if (w < minW) {
    w = minW;
    h = w / aspect;
  }
  if (h < minW) {
    h = minW;
    w = h * aspect;
  }
  let x = cx - w / 2;
  let y = cy - h / 2;
  x = clamp(x, 0, 1 - w);
  y = clamp(y, 0, 1 - h);
  return { x, y, w, h };
}

/**
 * 自由裁剪 → 展示用窗：在用户选区内取格子比例的居中切片（铺满格子、不拉变形）
 * 选区比例已接近格子时原样返回。
 */
export function cropToCellCover(crop, cellAspect, imgAspect) {
  const c = normalizeCoverCrop(crop);
  if (!c) return null;
  const ca = Math.max(0.05, Number(cellAspect) || 1);
  const ia = Math.max(0.05, Number(imgAspect) || ca);
  const targetUV = ca / ia; // 目标 w/h（UV）
  const curUV = c.w / Math.max(0.05, c.h);
  if (Math.abs(curUV - targetUV) < 0.02) return c;

  if (curUV > targetUV) {
    // 选区更宽：收窄宽度
    const nw = clamp(c.h * targetUV, 0.05, c.w);
    const nx = c.x + (c.w - nw) / 2;
    return normalizeCoverCrop({ x: nx, y: c.y, w: nw, h: c.h });
  }
  const nh = clamp(c.w / targetUV, 0.05, c.h);
  const ny = c.y + (c.h - nh) / 2;
  return normalizeCoverCrop({ x: c.x, y: ny, w: c.w, h: nh });
}

/** 按格子比例生成展示用裁剪样式 */
export function photoCropDisplayForCell(photo, cellAspect) {
  const crop = normalizeCoverCrop(photo && photo.coverCrop);
  if (!isActiveCoverCrop(crop)) {
    return { useCrop: false, imgBoxStyle: '', displayCrop: null };
  }
  const imgRatio = Number(photo && photo.imgRatio) || 0;
  const displayCrop =
    imgRatio > 0
      ? cropToCellCover(crop, cellAspect, imgRatio) || crop
      : crop;
  return {
    useCrop: true,
    imgBoxStyle: cropToImgBoxStyle(displayCrop),
    displayCrop,
  };
}

/** 裁剪窗 → 近似 coverFocus，兼容旧渲染 */
export function cropToCoverFocus(crop) {
  const c = normalizeCoverCrop(crop);
  if (!c) return { x: 50, y: 50 };
  const x = c.w >= 0.999 ? 50 : (c.x / (1 - c.w)) * 100;
  const y = c.h >= 0.999 ? 50 : (c.y / (1 - c.h)) * 100;
  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
  };
}

/**
 * 格内 image 定位：把 UV 裁剪区铺满格子（scaleToFill + 超大图盒）
 */
export function cropToImgBoxStyle(crop) {
  const c = normalizeCoverCrop(crop);
  if (!c) return '';
  const w = Math.max(0.05, c.w);
  const h = Math.max(0.05, c.h);
  return `position:absolute;width:${100 / w}%;height:${100 / h}%;left:${(-c.x / w) * 100}%;top:${(-c.y / h) * 100}%;`;
}

/** 给轮播/叠放等布局用的裁剪展示字段 */
export function photoCropDisplay(photo) {
  const crop = normalizeCoverCrop(photo && photo.coverCrop);
  if (!isActiveCoverCrop(crop)) {
    return { useCrop: false, imgBoxStyle: '' };
  }
  return {
    useCrop: true,
    imgBoxStyle: cropToImgBoxStyle(crop),
  };
}

/** 屏幕上的图显示框 + UV 裁剪 → 屏幕裁剪框 */
export function cropToScreenRect(imgDisp, crop) {
  const c = normalizeCoverCrop(crop);
  if (!imgDisp || !c) return null;
  return {
    left: imgDisp.left + c.x * imgDisp.width,
    top: imgDisp.top + c.y * imgDisp.height,
    width: c.w * imgDisp.width,
    height: c.h * imgDisp.height,
  };
}

/** 屏幕裁剪框 → UV（相对 imgDisp） */
export function screenRectToCrop(imgDisp, rect) {
  if (!imgDisp || !rect || imgDisp.width <= 0 || imgDisp.height <= 0) {
    return null;
  }
  const x = (rect.left - imgDisp.left) / imgDisp.width;
  const y = (rect.top - imgDisp.top) / imgDisp.height;
  const w = rect.width / imgDisp.width;
  const h = rect.height / imgDisp.height;
  return normalizeCoverCrop({ x, y, w, h });
}

/**
 * 图片在舞台内 aspectFit 后的显示矩形
 * @param {{nw:number,nh:number}} img
 * @param {{left:number,top:number,width:number,height:number}} stage
 */
export function aspectFitRect(img, stage) {
  const nw = Math.max(1, img.nw || 1);
  const nh = Math.max(1, img.nh || 1);
  const sw = Math.max(1, stage.width || 1);
  const sh = Math.max(1, stage.height || 1);
  const scale = Math.min(sw / nw, sh / nh);
  const width = nw * scale;
  const height = nh * scale;
  return {
    left: stage.left + (sw - width) / 2,
    top: stage.top + (sh - height) / 2,
    width,
    height,
  };
}

