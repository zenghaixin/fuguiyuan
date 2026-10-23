/**
 * 喜帖封面（第 1 页）截图
 * - 产出 JPG，路径写入草稿字段 coverThumbSrc（与喜帖数据同存）
 * - 本地先落 USER_DATA_PATH；对接接口后上传，把 coverThumbSrc 换成服务器 URL 即可
 * - 用离屏 canvas 按页面数据重绘，避免 DOM 截图与字号失真
 */

import { DESIGN_ASPECT } from './invite-canvas';

const THUMB_W = 270;
const THUMB_H = Math.round(THUMB_W / DESIGN_ASPECT);

function fontWeightNum(key) {
  if (key === 'bold') return 700;
  if (key === 'medium') return 500;
  return 400;
}

function loadCanvasImage(canvas, src) {
  return new Promise((resolve) => {
    if (!src || !canvas || typeof canvas.createImage !== 'function') {
      resolve(null);
      return;
    }
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawPage(ctx, canvas, page, W, H) {
  const bg = (page && page.bgColor) || '#f7f0ea';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  return loadCanvasImage(canvas, page && page.bgSrc).then((bgImg) => {
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    }
    const els = ((page && page.elements) || []).slice().sort((a, b) => {
      return (Number(a.layer) || 1) - (Number(b.layer) || 1);
    });
    els.forEach((el) => {
      if (!el) return;
      const x = (Number(el.x) || 0) * W;
      const y = (Number(el.y) || 0) * H;
      const w = Math.max((Number(el.w) || 0.1) * W, 2);
      const h = Math.max((Number(el.h) || 0.1) * H, 2);
      const rot = (Number(el.rotate) || 0) * (Math.PI / 180);
      const cx = x + w / 2;
      const cy = y + h / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-w / 2, -h / 2);

      const isText = el.type === 'text' || (el.text != null && el.text !== '' && !el.assetId);
      if (isText) {
        const text = el.text != null ? String(el.text) : '';
        const bgColor = el.bgColor || '';
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, w, h);
        }
        const fs = Math.max(1, ((Number(el.fontSize) || 28) / 750) * W);
        const fw = fontWeightNum(el.fontWeight);
        ctx.font = `${fw} ${fs}px sans-serif`;
        ctx.fillStyle = el.color || '#3d2914';
        const align = el.align === 'left' || el.align === 'right' ? el.align : 'center';
        ctx.textAlign = align;
        let tx = w / 2;
        if (align === 'left') tx = 4;
        if (align === 'right') tx = w - 4;
        let ty = h / 2;
        if (el.valign === 'top') {
          ctx.textBaseline = 'top';
          ty = 4;
        } else if (el.valign === 'bottom') {
          ctx.textBaseline = 'bottom';
          ty = h - 4;
        } else {
          ctx.textBaseline = 'middle';
        }
        if (text) ctx.fillText(text, tx, ty, Math.max(w - 8, 4));
      } else {
        ctx.fillStyle = el.color || '#b91c3a';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    });
  });
}

function exportCanvas(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error('no canvas'));
      return;
    }
    wx.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width: THUMB_W,
      height: THUMB_H,
      destWidth: THUMB_W,
      destHeight: THUMB_H,
      fileType: 'jpg',
      quality: 0.82,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    });
  });
}

function persistThumb(inviteId, tempPath) {
  const fs = wx.getFileSystemManager();
  const dest = `${wx.env.USER_DATA_PATH}/invite_cover_${inviteId}.jpg`;
  try {
    try {
      fs.accessSync(dest);
      fs.unlinkSync(dest);
    } catch (e) {
      /* no old file */
    }
    fs.copyFileSync(tempPath, dest);
    return dest;
  } catch (e) {
    // copy 失败则直接用临时路径（进程内仍可用）
    console.warn('[invite-cover-thumb] persist failed', e);
    return tempPath;
  }
}

/**
 * 根据第 1 页数据生成封面小图
 * @param {string} inviteId
 * @param {object} page pages[0]
 * @returns {Promise<string>} 本地文件路径
 */
export function captureCoverThumb(inviteId, page) {
  if (!inviteId || !page) return Promise.resolve('');

  let canvas;
  try {
    if (typeof wx.createOffscreenCanvas === 'function') {
      canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: THUMB_W,
        height: THUMB_H,
      });
    }
  } catch (e) {
    console.warn('[invite-cover-thumb] offscreen failed', e);
  }
  if (!canvas) return Promise.resolve('');

  try {
    canvas.width = THUMB_W;
    canvas.height = THUMB_H;
  } catch (e) {
    /* ignore */
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve('');

  return drawPage(ctx, canvas, page, THUMB_W, THUMB_H)
    .then(() => exportCanvas(canvas))
    .then((temp) => (temp ? persistThumb(inviteId, temp) : ''))
    .catch((e) => {
      console.warn('[invite-cover-thumb] capture failed', e);
      return '';
    });
}
