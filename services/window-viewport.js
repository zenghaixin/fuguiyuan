/** 读取当前窗口尺寸（含胶囊按钮位置） */
export function readWindowViewport() {
  const info = wx.getWindowInfo();
  const menu = wx.getMenuButtonBoundingClientRect();
  return {
    statusBarHeight: info.statusBarHeight,
    windowHeight: info.windowHeight,
    windowWidth: info.windowWidth,
    backTop: menu.top || info.statusBarHeight + 6,
    backSize: menu.height || 32,
  };
}

/**
 * 以页面 DOM 实测宽高为准（PC 拖拽时比 getWindowInfo 更可靠）
 * @param {WechatMiniprogram.Page.Instance} page
 * @param {string} [selector='.page']
 * @returns {Promise<{windowWidth:number, windowHeight:number}|null>}
 */
export function measurePageViewport(page, selector = '.page') {
  return new Promise((resolve) => {
    if (!page || typeof page.createSelectorQuery !== 'function') {
      resolve(null);
      return;
    }
    page
      .createSelectorQuery()
      .select(selector)
      .boundingClientRect((rect) => {
        if (!rect || !rect.width || !rect.height) {
          resolve(null);
          return;
        }
        resolve({
          windowWidth: Math.round(rect.width),
          windowHeight: Math.round(rect.height),
        });
      })
      .exec();
  });
}

/**
 * 监听窗口尺寸变化
 * - 优先 wx.onWindowResize
 * - PC 微信拖拽窗口经常不派发该事件，因此默认再加轮询兜底
 * @param {{ _windowResizeHandler?: Function, _windowResizePoll?: number, _windowResizeTimer?: number, _windowResizeLastKey?: string }} host
 * @param {(viewport: ReturnType<typeof readWindowViewport>) => void} onResize
 * @param {{ pollMs?: number }} [options]
 */
export function bindWindowResize(host, onResize, options = {}) {
  unbindWindowResize(host);
  const pollMs = options.pollMs == null ? 320 : options.pollMs;

  const emitIfChanged = async (force) => {
    const base = readWindowViewport();
    // 优先用页面真实渲染尺寸（解决 PC 微信拖拽后 getWindowInfo 不准）
    const measured = await measurePageViewport(host, options.selector || '.page');
    const viewport = measured
      ? { ...base, windowWidth: measured.windowWidth, windowHeight: measured.windowHeight }
      : base;
    const key = `${viewport.windowWidth}x${viewport.windowHeight}`;
    if (!force && key === host._windowResizeLastKey) return;
    host._windowResizeLastKey = key;
    onResize(viewport);
  };

  host._windowResizeLastKey = '';
  emitIfChanged(true);

  if (typeof wx.onWindowResize === 'function') {
    const handler = () => {
      if (host._windowResizeTimer) clearTimeout(host._windowResizeTimer);
      host._windowResizeTimer = setTimeout(() => {
        host._windowResizeTimer = null;
        emitIfChanged(true);
      }, 50);
    };
    host._windowResizeHandler = handler;
    wx.onWindowResize(handler);
  }

  // PC 端拖拽改宽的可靠兜底
  if (pollMs > 0) {
    host._windowResizePoll = setInterval(() => emitIfChanged(false), pollMs);
  }
}

export function unbindWindowResize(host) {
  if (host._windowResizeTimer) {
    clearTimeout(host._windowResizeTimer);
    host._windowResizeTimer = null;
  }
  if (host._windowResizePoll) {
    clearInterval(host._windowResizePoll);
    host._windowResizePoll = null;
  }
  if (host._windowResizeHandler && typeof wx.offWindowResize === 'function') {
    wx.offWindowResize(host._windowResizeHandler);
  }
  host._windowResizeHandler = null;
  host._windowResizeLastKey = '';
}
