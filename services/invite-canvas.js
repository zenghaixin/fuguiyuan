/**
 * 喜帖设计画幅
 * - 内容区固定 9:19.5（即常见竖屏 19.5:9；编辑虚线 / 预览内容板）
 * - 背景全铺：预览留白处用背景补齐，不裁切内容
 * - 预览相对屏幕内缩，避免安全区虚线贴边看不清
 */

/** 内容区宽 / 高 */
export const DESIGN_ASPECT = 9 / 19.5;

/** 预览相对全屏的内边距（px） */
export const PREVIEW_INSET = 10;

/** @deprecated 兼容旧名 */
export const FALLBACK_ASPECT = DESIGN_ASPECT;

/**
 * @param {number} windowWidth
 * @param {number} windowHeight
 * @returns {number} 宽/高
 */
export function getDeviceAspect(windowWidth, windowHeight) {
  const w = Math.max(Number(windowWidth) || 0, 1);
  const h = Math.max(Number(windowHeight) || 0, 1);
  return w / h;
}

function frameResult(cw, ch, width, height) {
  const left = (cw - width) / 2;
  const top = (ch - height) / 2;
  return {
    width,
    height,
    left,
    top,
    right: cw - left - width,
    bottom: ch - top - height,
  };
}

/**
 * contain：按指定画幅完整放入容器
 * @param {number} containerW
 * @param {number} containerH
 * @param {number} [padding=0]
 * @param {number} [aspect] 宽/高；缺省用 DESIGN_ASPECT (9:19.5)
 */
export function fitDesignFrame(containerW, containerH, padding = 0, aspect) {
  const cw = Math.max(Number(containerW) || 0, 0);
  const ch = Math.max(Number(containerH) || 0, 0);
  const pad = Math.max(Number(padding) || 0, 0);
  const a = Number(aspect) > 0 ? Number(aspect) : DESIGN_ASPECT;
  const availW = Math.max(cw - pad * 2, 0);
  const availH = Math.max(ch - pad * 2, 0);

  let width = 0;
  let height = 0;
  if (availW > 0 && availH > 0) {
    if (availW / availH > a) {
      height = availH;
      width = height * a;
    } else {
      width = availW;
      height = width / a;
    }
  }

  return frameResult(cw, ch, width, height);
}

/**
 * cover：等比铺满（会裁切）
 */
export function coverDesignFrame(containerW, containerH, aspect) {
  const cw = Math.max(Number(containerW) || 0, 0);
  const ch = Math.max(Number(containerH) || 0, 0);
  const a = Number(aspect) > 0 ? Number(aspect) : DESIGN_ASPECT;
  if (cw <= 0 || ch <= 0) {
    return frameResult(0, 0, 0, 0);
  }

  let width;
  let height;
  if (cw / ch > a) {
    width = cw;
    height = width / a;
  } else {
    height = ch;
    width = height * a;
  }

  return frameResult(cw, ch, width, height);
}

/**
 * 预览内容区：固定 9:19.5 contain，相对全屏内缩 PREVIEW_INSET
 */
export function previewDesignFrame(containerW, containerH) {
  return {
    ...fitDesignFrame(containerW, containerH, PREVIEW_INSET, DESIGN_ASPECT),
    mode: 'contain',
    aspect: DESIGN_ASPECT,
    inset: PREVIEW_INSET,
  };
}
