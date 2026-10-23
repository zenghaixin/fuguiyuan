import { fitDesignFrame, DESIGN_ASPECT } from '~/services/invite-canvas';
import {
  snapToGrid,
  gridLinePositions,
  DEFAULT_COLS,
  DEFAULT_ROWS,
} from '../../utils/snap-grid';

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
    /** 顶栏标题，故事文案页可改为「编辑文案」 */
    editorTitle: { type: String, value: '编辑喜帖' },
    /** 顶栏副标题。故事线用来显示「第2/2块」，不传则用画布提示 */
    editorSub: { type: String, value: '' },
    /** 为 true 时拦截画布空白处滑动，避免带动外层故事线 swiper */
    lockOuterSwipe: { type: Boolean, value: false },
    /** 网格吸附开关（暂关） */
    snapEnabled: { type: Boolean, value: false },
    snapCols: { type: Number, value: DEFAULT_COLS },
    snapRows: { type: Number, value: DEFAULT_ROWS },
    /** 递增后强制变换框与数据对齐 */
    layoutRev: { type: Number, value: 0 },
  },

  data: {
    canvasWidth: 0,
    canvasHeight: 0,
    canvasLeft: 0,
    canvasTop: 0,
    safeStyle: '',
    frostStyle: '',
    snapActive: false,
    snapGridV: [],
    snapGridH: [],
  },

  lifetimes: {
    ready() {
      this.measureCanvas();
      this.startStageWatch();
      this._refreshGridBase();
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
    'snapCols, snapRows': function () {
      this._refreshGridBase();
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

    _snapOpts() {
      return {
        cols: this.data.snapCols || DEFAULT_COLS,
        rows: this.data.snapRows || DEFAULT_ROWS,
        thresholdPx: 6,
        canvasWidth: this.data.canvasWidth || 0,
      };
    },

    _refreshGridBase(activeGuides) {
      const cols = this.data.snapCols || DEFAULT_COLS;
      const rows = this.data.snapRows || DEFAULT_ROWS;
      const base = gridLinePositions(cols, rows);
      const av = (activeGuides && activeGuides.vertical) || [];
      const ah = (activeGuides && activeGuides.horizontal) || [];
      const near = (a, b) => Math.abs(a - b) < 1e-4;
      this.setData({
        snapGridV: base.vertical.map((pos) => ({
          pos: pos * 100,
          on: av.some((v) => near(v, pos)),
        })),
        snapGridH: base.horizontal.map((pos) => ({
          pos: pos * 100,
          on: ah.some((v) => near(v, pos)),
        })),
      });
    },

    _setSnapActive(active, guides) {
      if (active) {
        const cols = this.data.snapCols || DEFAULT_COLS;
        const rows = this.data.snapRows || DEFAULT_ROWS;
        const base = gridLinePositions(cols, rows);
        const av = (guides && guides.vertical) || [];
        const ah = (guides && guides.horizontal) || [];
        const near = (a, b) => Math.abs(a - b) < 1e-4;
        this.setData({
          snapActive: true,
          snapGridV: base.vertical.map((pos) => ({
            pos: pos * 100,
            on: av.some((v) => near(v, pos)),
          })),
          snapGridH: base.horizontal.map((pos) => ({
            pos: pos * 100,
            on: ah.some((v) => near(v, pos)),
          })),
        });
      } else if (this.data.snapActive) {
        this.setData({ snapActive: false });
      }
    },

    /**
     * 统一吸附闸门：合并当前元素几何后 snap，写回 partial。
     * @returns {{ partial: object, guides: object }}
     */
    applySnap(partial, modeHint) {
      if (!this.data.snapEnabled) {
        return { partial: partial || {}, guides: { vertical: [], horizontal: [] } };
      }
      const el = this._findActive();
      if (!el || !partial) {
        return { partial: partial || {}, guides: { vertical: [], horizontal: [] } };
      }

      const hasPos =
        partial.x != null ||
        partial.y != null ||
        partial.w != null ||
        partial.h != null;
      if (!hasPos) {
        return { partial, guides: { vertical: [], horizontal: [] } };
      }

      const box = {
        x: partial.x != null ? partial.x : el.x,
        y: partial.y != null ? partial.y : el.y,
        w: partial.w != null ? partial.w : el.w,
        h: partial.h != null ? partial.h : el.h,
      };

      const resizing = partial.w != null || partial.h != null;
      const mode = modeHint || (resizing ? 'resize' : 'move');
      const result = snapToGrid(box, { ...this._snapOpts(), mode });
      const next = { ...partial };
      if (mode === 'move') {
        if (partial.x != null) next.x = result.box.x;
        if (partial.y != null) next.y = result.box.y;
      } else {
        if (partial.x != null || partial.w != null) next.x = result.box.x;
        if (partial.y != null || partial.h != null) next.y = result.box.y;
        if (partial.w != null) next.w = result.box.w;
        if (partial.h != null) next.h = result.box.h;
      }

      return { partial: next, guides: result.guides };
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

    onSnapStart(e) {
      const mode = (e.detail && e.detail.mode) || '';
      if (mode === 'rotate') return;
      this._snapGestureMode = mode === 'resize' ? 'resize' : 'move';
      this._setSnapActive(true, null);
    },

    onSnapEnd() {
      this._snapGestureMode = '';
      this._setSnapActive(false);
    },

    onElementChange(e) {
      const detail = e.detail || {};
      const { id } = detail;
      if (!id) return;

      const patch = {};
      if (detail.x != null) patch.x = detail.x;
      if (detail.y != null) patch.y = detail.y;
      if (detail.w != null) patch.w = detail.w;
      if (detail.h != null) patch.h = detail.h;
      if (detail.rotate != null) patch.rotate = detail.rotate;
      if (detail.layer != null) patch.layer = detail.layer;

      const modeHint =
        this._snapGestureMode ||
        (patch.w != null || patch.h != null ? 'resize' : 'move');
      const { partial, guides } = this.applySnap(patch, modeHint);

      if (this.data.snapActive || this._pageDrag) {
        this._setSnapActive(true, guides);
      }

      this.triggerEvent('elementchange', { id, ...partial });
    },

    onPageTap() {
      if (this.data.activeElementId) return;
      this.triggerEvent('selectelement', { id: '' });
    },

    /** 空白处拖页已关：改位请拖元素本身，避免每帧回写父级导致慢半拍 */
    onPageTouchStart() {},

    onPageTouchMove() {},

    onPageTouchEnd() {
      this._pageDrag = null;
      this._snapGestureMode = '';
      this._setSnapActive(false);
    },

    noop() {},
  },
});
