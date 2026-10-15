import { fitDesignFrame, DESIGN_ASPECT } from '~/services/invite-canvas';

const STAGE_PAD = 6;

Component({
  properties: {
    pages: { type: Array, value: [] },
    pageIndex: { type: Number, value: 0 },
    activeElementId: { type: String, value: '' },
    /** position | size | angle */
    elementEditMode: { type: String, value: 'position' },
    windowHeight: { type: Number, value: 667 },
    windowWidth: { type: Number, value: 375 },
    statusBarHeight: { type: Number, value: 20 },
    backTop: { type: Number, value: 48 },
    backSize: { type: Number, value: 32 },
  },

  data: {
    canvasWidth: 0,
    canvasHeight: 0,
    canvasLeft: 0,
    canvasTop: 0,
    safeStyle: '',
    frostStyle: '',
  },

  lifetimes: {
    ready() {
      this.measureCanvas();
      this.startStageWatch();
    },
    detached() {
      this.stopStageWatch();
    },
  },

  pageLifetimes: {
    show() {
      this.startStageWatch();
      this.measureCanvas();
    },
    hide() {
      this.stopStageWatch();
    },
  },

  observers: {
    'windowHeight, windowWidth': function () {
      wx.nextTick(() => this.measureCanvas());
    },
    pages(pages) {
      if (pages && pages.length) {
        wx.nextTick(() => {
          this.measureCanvas();
          this._canvasReady = true;
        });
      } else {
        this._canvasReady = false;
      }
    },
  },

  methods: {
    startStageWatch() {
      this.stopStageWatch();
      this._stageWatch = setInterval(() => this.measureCanvas(true), 320);
      if (typeof wx.onWindowResize === 'function') {
        this._onWindowResize = () => {
          if (this._resizeTimer) clearTimeout(this._resizeTimer);
          this._resizeTimer = setTimeout(() => {
            this._resizeTimer = null;
            this.measureCanvas();
          }, 50);
        };
        wx.onWindowResize(this._onWindowResize);
      }
    },

    stopStageWatch() {
      if (this._stageWatch) {
        clearInterval(this._stageWatch);
        this._stageWatch = null;
      }
      if (this._resizeTimer) {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = null;
      }
      if (this._onWindowResize && typeof wx.offWindowResize === 'function') {
        wx.offWindowResize(this._onWindowResize);
      }
      this._onWindowResize = null;
    },

    measureCanvas(fromWatch) {
      this.createSelectorQuery()
        .select('.stage')
        .boundingClientRect((rect) => {
          if (!rect || !rect.width || !rect.height) {
            if (fromWatch) return;
            if (!this._measureRetry) {
              this._measureRetry = true;
              setTimeout(() => {
                this._measureRetry = false;
                this.measureCanvas();
              }, 50);
            }
            return;
          }
          const sizeKey = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
          if (fromWatch && sizeKey === this._stageSizeKey) return;

          const frame = fitDesignFrame(
            rect.width,
            rect.height,
            STAGE_PAD,
            DESIGN_ASPECT
          );
          const frameKey = `${Math.round(frame.width)}x${Math.round(frame.height)}x${Math.round(frame.left)}x${Math.round(frame.top)}`;
          if (frameKey === this._frameKey && sizeKey === this._stageSizeKey) return;

          this._stageSizeKey = sizeKey;
          this._frameKey = frameKey;
          this.setData({
            safeStyle: `width:${frame.width}px;height:${frame.height}px;left:${frame.left}px;top:${frame.top}px;`,
            frostStyle: `padding:${frame.top}px ${frame.right}px ${frame.bottom}px ${frame.left}px;`,
            canvasWidth: frame.width,
            canvasHeight: frame.height,
            canvasLeft: rect.left + frame.left,
            canvasTop: rect.top + frame.top,
          });
        })
        .exec();
    },

    _findActive() {
      const { pages, pageIndex, activeElementId } = this.data;
      const els = (pages[pageIndex] && pages[pageIndex].elements) || [];
      return els.find((el) => el.id === activeElementId) || null;
    },

    onPickTemplate() {
      this.triggerEvent('picktemplate');
    },

    onSelectElement(e) {
      const { id } = e.detail || {};
      if (!id) return;
      if (this.data.activeElementId && id !== this.data.activeElementId) return;
      this.triggerEvent('selectelement', { id });
    },

    onElementChange(e) {
      this.triggerEvent('elementchange', e.detail || {});
    },

    onPageTap() {
      if (this.data.activeElementId) return;
      this.triggerEvent('selectelement', { id: '' });
    },

    onPageTouchStart(e) {
      if (!this.data.activeElementId) return;
      if (this.data.elementEditMode !== 'position') return;
      const t = e.touches[0];
      const el = this._findActive();
      const { canvasWidth, canvasHeight } = this.data;
      if (!t || !el || !canvasWidth || !canvasHeight) return;
      this._pageDrag = {
        startX: t.clientX,
        startY: t.clientY,
        ox: el.x,
        oy: el.y,
        moved: false,
      };
    },

    onPageTouchMove(e) {
      const drag = this._pageDrag;
      if (!drag || !this.data.activeElementId) return;
      if (this.data.elementEditMode !== 'position') return;
      const t = e.touches[0];
      const { canvasWidth, canvasHeight, activeElementId } = this.data;
      if (!t || !canvasWidth || !canvasHeight) return;
      const dx = (t.clientX - drag.startX) / canvasWidth;
      const dy = (t.clientY - drag.startY) / canvasHeight;
      if (!drag.moved && Math.abs(dx) < 0.004 && Math.abs(dy) < 0.004) return;
      drag.moved = true;
      this.triggerEvent('elementchange', {
        id: activeElementId,
        x: drag.ox + dx,
        y: drag.oy + dy,
      });
    },

    onPageTouchEnd() {
      this._pageDrag = null;
    },
  },
});
