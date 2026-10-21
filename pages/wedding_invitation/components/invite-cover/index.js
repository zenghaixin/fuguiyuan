import {
  previewDesignFrame,
  fitDesignFrame,
  PREVIEW_INSET,
  DESIGN_ASPECT,
} from '~/services/invite-canvas';

const SNAP_RATIO = 0.1;
const HINT_BACK = '下滑返回';

Component({
  properties: {
    pages: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    windowWidth: { type: Number, value: 375 },
    active: { type: Boolean, value: false },
    /** 已离开封面模块（在照片墙/祝福板）→ 封面各页提示统一下滑 */
    leftBehind: { type: Boolean, value: false },
    /** 下方是否还有模块（无则末页上滑不切模块） */
    hasNextModule: { type: Boolean, value: true },
    /** 初始停留页（编辑预览从当前页进入） */
    startPageIndex: { type: Number, value: 0 },
    /** 全铺无白边（demo / 正式浏览）；编辑预览仍用内缩 */
    fullBleed: { type: Boolean, value: false },
  },

  data: {
    pageIndex: 0,
    translateY: 0,
    trackHeight: 667,
    animating: false,
    pageHints: [],
    frameW: 0,
    frameH: 0,
    frameL: 0,
    frameT: 0,
    bleedInset: PREVIEW_INSET,
    /** 画布外留白底色：草稿跟当前页，避免黑边像 demo */
    coverBg: '#1a0c10',
  },

  observers: {
    'pages, windowHeight, windowWidth, pageIndex, leftBehind, hasNextModule, fullBleed': function () {
      const fullBleed = !!this.data.fullBleed;
      const pages = this.data.pages || [];
      const cur = pages[this.data.pageIndex] || pages[0] || {};
      const coverBg = fullBleed
        ? '#1a0c10'
        : cur.bgColor || '#f3efe9';
      this.setData({ bleedInset: fullBleed ? 0 : PREVIEW_INSET, coverBg });
      this.syncFrame();
      const h = this.data.windowHeight || 667;
      this.setData({
        trackHeight: h * Math.max(pages.length, 1),
        translateY: -this.data.pageIndex * h,
        pageHints: this.buildPageHints(),
      });
    },

    startPageIndex(idx) {
      const pages = this.data.pages || [];
      const max = Math.max(pages.length - 1, 0);
      const next = Math.max(0, Math.min(max, Number(idx) || 0));
      if (next !== this.data.pageIndex) {
        this.setPage(next);
      }
    },
  },

  lifetimes: {
    attached() {
      this._touching = false;
      this._dragging = false;
      this._moduleDragging = false;
      this._startY = 0;
      this._baseY = 0;
      this._lastDy = 0;
      const pages = this.data.pages || [];
      const max = Math.max(pages.length - 1, 0);
      const start = Math.max(0, Math.min(max, Number(this.data.startPageIndex) || 0));
      this.setData({ pageIndex: start });
      this.syncFrame();
      this.startFrameWatch();
      this.setData({ pageHints: this.buildPageHints() });
    },
    detached() {
      this.stopFrameWatch();
    },
  },

  pageLifetimes: {
    show() {
      this.startFrameWatch();
      this.syncFrame();
    },
    hide() {
      this.stopFrameWatch();
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

    /** 按封面容器真实宽高计算 9:19.5，避免 PC 拖拽后 window* 不准 */
    syncFrame(fromWatch) {
      this.createSelectorQuery()
        .select('.invite-cover')
        .boundingClientRect((rect) => {
          let w = this.data.windowWidth || 375;
          let h = this.data.windowHeight || 667;
          if (rect && rect.width && rect.height) {
            w = rect.width;
            h = rect.height;
          }
          const sizeKey = `${Math.round(w)}x${Math.round(h)}`;
          if (fromWatch && sizeKey === this._frameSizeKey) return;

          const fullBleed = !!this.data.fullBleed;
          const frame = fullBleed
            ? {
                ...fitDesignFrame(w, h, 0, DESIGN_ASPECT),
                mode: 'contain',
                aspect: DESIGN_ASPECT,
                inset: 0,
              }
            : previewDesignFrame(w, h);
          const frameKey = `${fullBleed ? 'f' : 'p'}_${Math.round(frame.width)}x${Math.round(frame.height)}x${Math.round(frame.left)}x${Math.round(frame.top)}`;
          if (frameKey === this._frameKey && sizeKey === this._frameSizeKey) return;

          this._frameSizeKey = sizeKey;
          this._frameKey = frameKey;
          this.setData({
            frameW: frame.width,
            frameH: frame.height,
            frameL: frame.left,
            frameT: frame.top,
            bleedInset: fullBleed ? 0 : PREVIEW_INSET,
          });
        })
        .exec();
    },


    /**
     * 在这一页 → 上滑；不在这一页了 → 下滑返回
     * （已离开整块封面时，所有页都显示下滑）
     */
    buildPageHints() {
      const list = this.data.pages || [];
      const { pageIndex, leftBehind } = this.data;
      const last = list.length - 1;

      return list.map((item, i) => {
        const left = leftBehind || i < pageIndex;
        if (left) {
          return {
            text: item.backHint || HINT_BACK,
            back: true,
          };
        }
        // 整份最后一页（下方无模块）：不显示底部提示
        if (i >= last && !this.data.hasNextModule) {
          return null;
        }
        // 当前页（及未到达的页）：上滑
        let text = item.hint || '上滑继续';
        if (i >= last) {
          text = item.hint || '上滑查看照片墙';
        }
        return { text, back: false };
      });
    },

    setPage(pageIndex) {
      const h = this.data.windowHeight;
      const max = Math.max((this.data.pages || []).length - 1, 0);
      const next = Math.max(0, Math.min(max, pageIndex));
      this.setData({
        pageIndex: next,
        translateY: -next * h,
        animating: true,
      });
    },

    emitModuleDrag(phase, dy) {
      this.triggerEvent('moduledrag', { phase, dy });
    },

    onTouchStart(e) {
      if (!this.data.active) return;
      this._touching = true;
      this._dragging = false;
      this._moduleDragging = false;
      this._startY = e.touches[0].clientY;
      this._baseY = -this.data.pageIndex * this.data.windowHeight;
      this._lastDy = 0;
      this.setData({ animating: false });
    },

    onTouchMove(e) {
      if (!this._touching || !this.data.active) return;
      const dy = e.touches[0].clientY - this._startY;
      this._lastDy = dy;
      if (!this._dragging && Math.abs(dy) < 8) return;
      this._dragging = true;

      const h = this.data.windowHeight;
      const max = Math.max((this.data.pages || []).length - 1, 0);
      const pageIndex = this.data.pageIndex;
      const minY = -max * h;

      const atLastUp = pageIndex >= max && dy < 0;
      const atFirstDown = pageIndex <= 0 && dy > 0;
      if (atLastUp || atFirstDown) {
        // 末页上滑且无下一模块：橡皮筋，不切模块
        if (atLastUp && !this.data.hasNextModule) {
          this.setData({ translateY: minY + dy * 0.35 });
          return;
        }
        this.setData({ translateY: pageIndex >= max ? minY : 0 });
        if (!this._moduleDragging) {
          this._moduleDragging = true;
          this.emitModuleDrag('start', 0);
        }
        this.emitModuleDrag('move', dy);
        return;
      }

      if (this._moduleDragging) {
        this._moduleDragging = false;
        this.emitModuleDrag('cancel', 0);
      }

      let next = this._baseY + dy;
      if (next > 0) next *= 0.35;
      if (next < minY) next = minY + (next - minY) * 0.35;
      this.setData({ translateY: next });
    },

    onTouchEnd() {
      if (!this._touching || !this.data.active) return;
      const wasDragging = this._dragging;
      const moduleDragging = this._moduleDragging;
      const lastDy = this._lastDy;
      this._touching = false;
      this._dragging = false;
      this._moduleDragging = false;
      this._lastDy = 0;

      if (!wasDragging) return;

      if (moduleDragging) {
        this.setPage(this.data.pageIndex);
        this.emitModuleDrag('end', lastDy);
        return;
      }

      const h = this.data.windowHeight;
      const threshold = h * SNAP_RATIO;
      const delta = this.data.translateY - this._baseY;
      const max = Math.max((this.data.pages || []).length - 1, 0);
      let pageIndex = this.data.pageIndex;

      if (delta < -threshold && pageIndex < max) pageIndex += 1;
      else if (delta > threshold && pageIndex > 0) pageIndex -= 1;

      this.setPage(pageIndex);
    },
  },
});
