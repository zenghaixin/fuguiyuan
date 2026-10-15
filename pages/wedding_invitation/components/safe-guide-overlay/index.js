import { previewDesignFrame } from '~/services/invite-canvas';

const COLLAPSE_DELAY = 2000;
const TAP_MOVE_LIMIT = 8;

/** 预览页独立浮层：安全区虚线（透明底），不侵入 invite-cover */
Component({
  properties: {
    visible: { type: Boolean, value: false },
    windowWidth: { type: Number, value: 375 },
    windowHeight: { type: Number, value: 667 },
  },

  data: {
    guideOn: true,
    expanded: true,
    frameW: 0,
    frameH: 0,
    frameL: 0,
    frameT: 0,
  },

  observers: {
    visible(visible) {
      if (visible) {
        this.syncFrame();
        this.startFrameWatch();
        // 仅刚进入预览时展开一次，滑动/尺寸变化不再唤起文案
        if (!this._wasVisible) {
          this.expandThenCollapse();
        }
      } else {
        this.stopFrameWatch();
        this.clearCollapseTimer();
      }
      this._wasVisible = !!visible;
    },
    'windowWidth, windowHeight': function () {
      this.syncFrame();
    },
  },

  lifetimes: {
    attached() {
      this._wasVisible = !!this.data.visible;
      this.syncFrame();
      if (this.data.visible) {
        this.startFrameWatch();
        this.expandThenCollapse();
      }
    },
    detached() {
      this.stopFrameWatch();
      this.clearCollapseTimer();
    },
  },

  methods: {
    startFrameWatch() {
      this.stopFrameWatch();
      this._frameWatch = setInterval(() => this.syncFrame(true), 320);
    },

    stopFrameWatch() {
      if (this._frameWatch) {
        clearInterval(this._frameWatch);
        this._frameWatch = null;
      }
    },

    /** 按浮层真实全屏尺寸计算，与 invite-cover 对齐 */
    syncFrame(fromWatch) {
      if (!this.data.visible) return;
      this.createSelectorQuery()
        .select('.safe-guide')
        .boundingClientRect((rect) => {
          let w = this.data.windowWidth || 375;
          let h = this.data.windowHeight || 667;
          if (rect && rect.width && rect.height) {
            w = rect.width;
            h = rect.height;
          }
          const sizeKey = `${Math.round(w)}x${Math.round(h)}`;
          if (fromWatch && sizeKey === this._frameSizeKey) return;

          const frame = previewDesignFrame(w, h);
          const frameKey = `${Math.round(frame.width)}x${Math.round(frame.height)}x${Math.round(frame.left)}x${Math.round(frame.top)}`;
          if (frameKey === this._frameKey && sizeKey === this._frameSizeKey) return;

          this._frameSizeKey = sizeKey;
          this._frameKey = frameKey;
          this.setData({
            frameW: frame.width,
            frameH: frame.height,
            frameL: frame.left,
            frameT: frame.top,
          });
        })
        .exec();
    },

    clearCollapseTimer() {
      if (this._collapseTimer) {
        clearTimeout(this._collapseTimer);
        this._collapseTimer = null;
      }
    },

    /** 展开完整文案，3 秒后向右收成仅 icon */
    expandThenCollapse() {
      this.clearCollapseTimer();
      this.setData({ expanded: true });
      this._collapseTimer = setTimeout(() => {
        this.setData({ expanded: false });
        this._collapseTimer = null;
      }, COLLAPSE_DELAY);
    },

    onBtnTouchStart(e) {
      const t = e.touches && e.touches[0];
      this._tap = t
        ? { x: t.clientX, y: t.clientY, moved: false }
        : null;
    },

    onBtnTouchMove(e) {
      const tap = this._tap;
      const t = e.touches && e.touches[0];
      if (!tap || !t) return;
      if (
        Math.abs(t.clientX - tap.x) > TAP_MOVE_LIMIT ||
        Math.abs(t.clientY - tap.y) > TAP_MOVE_LIMIT
      ) {
        tap.moved = true;
      }
    },

    onBtnTouchEnd() {
      const tap = this._tap;
      this._tap = null;
      // 滑动经过按钮不唤起；仅点击切换并展开文案
      if (!tap || tap.moved) return;
      this.setData({ guideOn: !this.data.guideOn });
      this.expandThenCollapse();
    },

    onBtnTouchCancel() {
      this._tap = null;
    },
  },
});
