/**
 * 照片墙统一看大图：wx.previewImage。
 * 必须在用户 tap 回调里同步调用，否则微信会报 until user taps。
 *
 * 注意：部分基础库即使用对 current，仍会从 urls[0] 滚到目标图。
 * 因此把目标图旋到 urls 首位，current 用同一字符串引用，直接落在点中的那张。
 *
 * @param {Array<{src?: string}>} photos
 * @param {number} index
 * @param {{ fail?: (err: any) => void }} [opts]
 * @returns {boolean}
 */
function previewPhotos(photos, index, opts = {}) {
  const raw = photos || [];
  const urls = raw.map((p) => p && p.src).filter(Boolean);
  if (!urls.length) return false;

  const safeIndex = Math.max(0, Math.min(Number(index) || 0, raw.length - 1));
  const wantSrc = (raw[safeIndex] && raw[safeIndex].src) || '';
  let i = wantSrc ? urls.indexOf(wantSrc) : -1;
  if (i < 0) {
    i = Math.max(0, Math.min(safeIndex, urls.length - 1));
  }

  // 目标图放到第一位，避免从第 1 张滚动过来
  const ordered = urls.slice(i).concat(urls.slice(0, i));
  const current = ordered[0];

  wx.previewImage({
    urls: ordered,
    current,
    fail: (err) => {
      if (typeof opts.fail === 'function') opts.fail(err);
    },
  });
  return true;
}

module.exports = {
  previewPhotos,
};
