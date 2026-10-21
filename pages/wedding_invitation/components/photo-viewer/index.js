const { bindViewer, unbindViewer } = require('../../utils/preview-photos');

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;
const TAP_MOVE_SLOP = 12;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function dist(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function defaultTf() {
  return { scale: 1, tx: 0, ty: 0, rotate: 0, flipX: false };
}

/**
 * 图片 mode=aspectFit，盒子是整屏。
 * 竖屏下对整屏盒子做 rotate(90/270) 后，轴对齐包围盒会变成「高×宽」，超出屏幕被裁切。
 * 转 90/270 时再乘 min/max，让旋转后仍落在视口内。
 */
function rotationFit(vw, vh, rotate) {
  const r = ((Number(rotate) % 360) + 360) % 360;
  if (r !== 90 && r !== 270) return 1;
  if (!vw || !vh) return 1;
  return Math.min(vw / vh, vh / vw);
}

function tfToStyle(tf, vw, vh) {
  const t = tf || defaultTf();
  const fit = rotationFit(vw, vh, t.rotate);
  const s = t.scale * fit;
  const sx = t.flipX ? -s : s;
  const sy = s;
  return `transform: translate3d(${t.tx}px, ${t.ty}px, 0) rotate(${t.rotate}deg) scale(${sx}, ${sy});`;
}

function readWindowMetrics() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      const info = wx.getWindowInfo();
      return {
        statusBarHeight: (info && info.statusBarHeight) || 20,
        vw: (info && info.windowWidth) || 375,
        vh: (info && info.windowHeight) || 667,
      };
    }
  } catch (e) {
    /* ignore */
  }
  try {
    const sys = wx.getSystemInfoSync();
    return {
      statusBarHeight: (sys && sys.statusBarHeight) || 20,
      vw: (sys && sys.windowWidth) || 375,
      vh: (sys && sys.windowHeight) || 667,
    };
  } catch (e2) {
    return { statusBarHeight: 20, vw: 375, vh: 667 };
  }
}

Component({
  data: {
    visible: false,
    items: [],
    current: 0,
    showIndex: true,
    swipeable: true,
    chromeOn: true,
    zoomed: false,
    transforms: [],
    statusBarHeight: 20,
  },

  lifetimes: {
    attached() {
      this._tfList = [];
      this.refreshMetrics();
      bindViewer(this);
    },
    detached() {
      unbindViewer(this);
      this.clearTimers();
    },
  },

  pageLifetimes: {
    show() {
      this.refreshMetrics();
      bindViewer(this);
    },
  },

  methods: {
    noop() {},

    refreshMetrics() {
      const m = readWindowMetrics();
      this._vw = m.vw;
      this._vh = m.vh;
      this.setData({ statusBarHeight: m.statusBarHeight });
    },

    styleOf(tf) {
      return tfToStyle(tf, this._vw, this._vh);
    },

    clearTimers() {
      if (this._tapTimer) {
        clearTimeout(this._tapTimer);
        this._tapTimer = null;
      }
      if (this._deleteTimer) {
        clearTimeout(this._deleteTimer);
        this._deleteTimer = null;
      }
    },

    isOpen() {
      return !!this.data.visible;
    },

    /**
     * @param {{ urls?: string[], photos?: Array<{src?: string, id?: string}>, index?: number, showIndex?: boolean, swipeable?: boolean }} payload
     */
    open(payload = {}) {
      this.refreshMetrics();
      const rawPhotos = payload.photos || [];
      let items = [];
      if (rawPhotos.length) {
        items = rawPhotos
          .map((p, i) => ({
            id: (p && p.id) || `pv-${i}`,
            src: (p && p.src) || '',
          }))
          .filter((p) => p.src);
      } else {
        const urls = payload.urls || [];
        items = urls.filter(Boolean).map((src, i) => ({ id: `pv-${i}-${src}`, src }));
      }
      if (!items.length) return false;

      const n = items.length;
      let current = Number(payload.index) || 0;
      current = ((current % n) + n) % n;

      this._tfList = items.map(() => defaultTf());
      this._moved = false;
      this._pinch = null;
      this.clearTimers();

      this.setData({
        visible: true,
        items,
        current,
        showIndex: payload.showIndex !== false,
        swipeable: payload.swipeable !== false,
        chromeOn: true,
        zoomed: false,
        transforms: this._tfList.map((tf) => this.styleOf(tf)),
      });
      return true;
    },

    close() {
      if (!this.data.visible) return false;
      this.clearTimers();
      this.setData({
        visible: false,
        items: [],
        transforms: [],
        zoomed: false,
        chromeOn: true,
      });
      this._tfList = [];
      this.triggerEvent('close');
      return true;
    },

    onClose() {
      this.close();
    },

    getTf(index) {
      if (!this._tfList[index]) this._tfList[index] = defaultTf();
      return this._tfList[index];
    },

    commitTf(index, patch) {
      const next = Object.assign({}, this.getTf(index), patch || {});
      next.scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
      if (next.scale <= 1.01) {
        next.scale = 1;
        next.tx = 0;
        next.ty = 0;
      }
      next.rotate = ((next.rotate % 360) + 360) % 360;
      this._tfList[index] = next;
      const transforms = this.data.transforms.slice();
      transforms[index] = this.styleOf(next);
      const zoomed = next.scale > 1.01;
      this.setData({
        transforms,
        zoomed: index === this.data.current ? zoomed : this.data.zoomed,
      });
    },

    syncZoomedFlag() {
      const tf = this.getTf(this.data.current);
      this.setData({ zoomed: tf.scale > 1.01 });
    },

    onSwiperChange(e) {
      const current = (e.detail && e.detail.current) || 0;
      // 切页复位缩放平移，保留旋转/镜像（更贴近「换一张」）
      const tf = this.getTf(current);
      tf.scale = 1;
      tf.tx = 0;
      tf.ty = 0;
      const transforms = this.data.transforms.slice();
      transforms[current] = this.styleOf(tf);
      this.setData({ current, transforms, zoomed: false });
    },

    onFlip() {
      const i = this.data.current;
      const tf = this.getTf(i);
      this.commitTf(i, { flipX: !tf.flipX });
    },

    /** 左右旋转按 90° 步进：0 → 90 → 180 → 270 → 0 */
    onRotate(e) {
      const step = Number(e.currentTarget.dataset.deg) || 0;
      const i = this.data.current;
      const tf = this.getTf(i);
      const next = (((Math.round(tf.rotate / 90) * 90 + step) % 360) + 360) % 360;
      // 旋转后重置拖拽偏移，避免长图转后仍偏出可视区
      this.commitTf(i, { rotate: next, tx: 0, ty: 0 });
    },

    onTouchStart(e) {
      const touches = e.touches || [];
      this._moved = false;
      this._gesture = '';
      if (touches.length >= 2) {
        this._gesture = 'pinch';
        this._pinch = {
          startDist: dist(touches[0], touches[1]) || 1,
          startScale: this.getTf(this.data.current).scale,
        };
        return;
      }
      if (touches.length === 1) {
        this._gesture = 'one';
        this._lastX = touches[0].clientX;
        this._lastY = touches[0].clientY;
        this._startX = touches[0].clientX;
        this._startY = touches[0].clientY;
      }
    },

    onTouchMove(e) {
      const touches = e.touches || [];
      const i = this.data.current;
      const tf = this.getTf(i);

      if (touches.length >= 2) {
        if (!this._pinch) {
          this._pinch = {
            startDist: dist(touches[0], touches[1]) || 1,
            startScale: tf.scale,
          };
        }
        this._gesture = 'pinch';
        const d = dist(touches[0], touches[1]) || 1;
        const scale = this._pinch.startScale * (d / this._pinch.startDist);
        this.commitTf(i, { scale });
        this._moved = true;
        return;
      }

      if (this._gesture === 'pinch') return;

      // 放大后单指拖动；未放大时放给 swiper（不拦截横向）
      if (tf.scale > 1.01 && touches.length === 1) {
        const x = touches[0].clientX;
        const y = touches[0].clientY;
        const dx = x - this._lastX;
        const dy = y - this._lastY;
        this._lastX = x;
        this._lastY = y;
        this.commitTf(i, { tx: tf.tx + dx, ty: tf.ty + dy });
        this._moved = true;
      } else if (touches.length === 1) {
        const dx = Math.abs(touches[0].clientX - this._startX);
        const dy = Math.abs(touches[0].clientY - this._startY);
        if (dx > TAP_MOVE_SLOP || dy > TAP_MOVE_SLOP) this._moved = true;
      }
    },

    onTouchEnd() {
      this._pinch = null;
      if (this._gesture === 'pinch') {
        this.syncZoomedFlag();
      }
      this._gesture = '';
    },

    onStageTap() {
      if (this._moved) return;

      const now = Date.now();
      if (this._lastTapAt && now - this._lastTapAt < DOUBLE_TAP_MS) {
        // 双击缩放；单击留给下面延时关闭
        if (this._tapTimer) {
          clearTimeout(this._tapTimer);
          this._tapTimer = null;
        }
        this._lastTapAt = 0;
        this.toggleZoom();
        return;
      }

      this._lastTapAt = now;
      if (this._tapTimer) clearTimeout(this._tapTimer);
      // 单击退出查看（稍等以区分双击）
      this._tapTimer = setTimeout(() => {
        this._tapTimer = null;
        this.close();
      }, DOUBLE_TAP_MS);
    },

    toggleZoom() {
      const i = this.data.current;
      const tf = this.getTf(i);
      if (tf.scale > 1.01) {
        this.commitTf(i, { scale: 1, tx: 0, ty: 0 });
      } else {
        this.commitTf(i, { scale: 2.5, tx: 0, ty: 0 });
      }
    },
  },
});
