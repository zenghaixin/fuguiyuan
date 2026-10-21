/**
 * 照片墙统一看大图。
 * 优先走自定义 photo-viewer（全黑全屏、缩放/镜像/旋转；顶部序号由 showIndex 传参决定）；
 * 未挂载 viewer 时回退 wx.previewImage。
 *
 * 必须在用户 tap 回调里同步调用 open（注册已在 attached 完成即可）。
 */

let _viewer = null;

function bindViewer(comp) {
  if (comp) _viewer = comp;
}

function unbindViewer(comp) {
  if (_viewer === comp) _viewer = null;
}

function getViewer() {
  return _viewer;
}

function isViewerOpen() {
  return !!( _viewer && typeof _viewer.isOpen === 'function' && _viewer.isOpen());
}

function closeViewer() {
  if (_viewer && typeof _viewer.close === 'function') {
    return !!_viewer.close();
  }
  return false;
}

/**
 * @param {Array<{src?: string, id?: string}>} photos
 * @param {number} index
 * @param {{ fail?: (err: any) => void, showIndex?: boolean, swipeable?: boolean }} [opts]
 *        showIndex：顶部序号，默认 true
 *        swipeable：是否可左右滑切图，默认 true（杂志单图预览传 false）
 * @returns {boolean}
 */
function previewPhotos(photos, index, opts = {}) {
  const raw = photos || [];
  const list = raw.filter((p) => p && p.src);
  if (!list.length) return false;

  const safeIndex = Math.max(0, Math.min(Number(index) || 0, list.length - 1));

  if (_viewer && typeof _viewer.open === 'function') {
    return !!_viewer.open({
      photos: list,
      index: safeIndex,
      showIndex: opts.showIndex !== false,
      swipeable: opts.swipeable !== false,
    });
  }

  // 回退：官方预览（无法关滑动时只传当前一张）
  const urls =
    opts.swipeable === false
      ? [list[safeIndex].src]
      : list.map((p) => p.src);
  const current = opts.swipeable === false ? urls[0] : urls[safeIndex];
  wx.previewImage({
    urls,
    current,
    fail: (err) => {
      if (typeof opts.fail === 'function') opts.fail(err);
    },
  });
  return true;
}

module.exports = {
  previewPhotos,
  bindViewer,
  unbindViewer,
  getViewer,
  isViewerOpen,
  closeViewer,
};

export {
  previewPhotos,
  bindViewer,
  unbindViewer,
  getViewer,
  isViewerOpen,
  closeViewer,
};
