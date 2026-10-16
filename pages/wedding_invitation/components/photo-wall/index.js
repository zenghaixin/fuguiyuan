const { previewPhotos } = require('../../utils/preview-photos');

const SNAP_RATIO = 0.1;
const HINT_NEXT = '上滑留下祝福';
const HINT_BACK = '下滑返回照片墙';
const HINT_NEXT_PHOTO = '上滑查看下一张';

Component({

  properties: {
    photos: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    windowWidth: { type: Number, value: 375 },
    statusBarHeight: { type: Number, value: 20 },
    active: { type: Boolean, value: false },
    /** 已离开照片墙（在祝福板）→ 提示改为下滑返回 */
    leftBehind: { type: Boolean, value: false },
    /** 下方是否还有留言等模块 */
    hasNextModule: { type: Boolean, value: true },
    /** 进入时定位到第几张 */
    startIndex: { type: Number, value: 0 },
    /** 排版：carousel | column | grid4 | grid9 | stack */
    layout: { type: String, value: 'carousel' },
  },

  data: {
    current: 0,
    currentCaption: '',
    translateX: 0,
    translateY: 0,
    trackWidth: 375,
    trackHeight: 400,
    stageHeight: 400,
    animating: false,
    hintText: HINT_NEXT,
    hintBack: false,
    hintVisible: true,
    /** 无底部文案时收紧 footer，舞台下沉占满 */
    footerSlim: false,
    isGrid: false,
    isStack: false,
    gridCols: 2,
    subText: '左右滑动查看',
  },


  observers: {
    layout: function (layout) {
      let key = layout;
      if (key === 'grid') key = 'grid4';
      const isGrid = key === 'grid4' || key === 'grid9';
      const isStack = key === 'stack';
      let subText = '左右滑动查看';
      if (key === 'column') subText = '上下滑动查看';
      else if (key === 'grid4' || key === 'grid9') subText = '点击右上角查看大图';
      else if (key === 'stack') subText = '左右翻看，翻过沉底';

      this.setData({
        isGrid,
        isStack,
        gridCols: key === 'grid9' ? 3 : 2,
        subText,
      });
    },



    'photos, windowWidth, startIndex, layout': function (
      photos,
      windowWidth,
      startIndex
    ) {
      this.applyPhotos(photos, windowWidth, startIndex);
      this.scheduleMeasureStage();
    },
    'leftBehind, hasNextModule, layout': function () {
      this.syncHint();
    },
  },


  lifetimes: {
    attached() {
      this.resetTouch();
      this.syncHint();
      this.scheduleMeasureStage();
    },
    ready() {
      this.scheduleMeasureStage();
    },
  },

  methods: {
    scheduleMeasureStage() {
      if (this._measureTimer) clearTimeout(this._measureTimer);
      this._measureTimer = setTimeout(() => this.measureStage(), 32);
    },

    measureStage() {
      this.createSelectorQuery()
        .in(this)
        .select('.photo-wall__stage')
        .boundingClientRect((rect) => {
          if (!rect || !rect.height) return;
          const stageHeight = Math.floor(rect.height);
          if (stageHeight <= 0) return;
          const list = this.data.photos || [];
          const len = Math.max(list.length || 1, 1);
          const current = Math.min(this.data.current, len - 1);
          const patch = {
            stageHeight,
            trackHeight: stageHeight * len,
          };
          if (this.data.layout === 'column') {
            patch.translateY = -current * stageHeight;
          }
          if (
            stageHeight !== this.data.stageHeight ||
            patch.trackHeight !== this.data.trackHeight ||
            (this.data.layout === 'column' &&
              patch.translateY !== this.data.translateY)
          ) {
            this.setData(patch);
          }
        })
        .exec();
    },

    applyPhotos(photos, windowWidth, startIndex) {
      const w = windowWidth || 375;
      const list = photos || [];
      const len = Math.max(list.length || 1, 1);
      const max = len - 1;
      let current = this.data.current;
      if (!this._appliedStart) {
        const start = Number(startIndex);
        if (Number.isFinite(start)) current = start;
        this._appliedStart = true;
      }
      current = Math.max(0, Math.min(max, current));
      const stageHeight = this.data.stageHeight || 400;
      this.setData({
        trackWidth: w * len,
        trackHeight: stageHeight * len,
        current,
        currentCaption: (list[current] && list[current].caption) || '',
        translateX: -current * w,
        translateY: -current * stageHeight,
      });
      this.syncHint();
    },

    resetTouch() {
      this._touching = false;
      this._dragging = false;
      this._dir = '';
      this._startX = 0;
      this._startY = 0;
      this._baseX = 0;
      this._baseY = 0;
      this._moduleDragging = false;
      this._photoDragging = false;
      this._lastDy = 0;
    },

    syncHint() {
      let layout = this.data.layout;
      if (layout === 'grid') layout = 'grid4';
      const isGrid = layout === 'grid4' || layout === 'grid9';
      const isStack = layout === 'stack';
      const list = this.data.photos || [];
      const max = Math.max(list.length - 1, 0);
      const current = this.data.current || 0;
      const isColumn = layout === 'column';

      let hintVisible = false;
      let hintText = '';
      let hintBack = false;

      if (this.data.leftBehind) {
        hintVisible = true;
        hintText = HINT_BACK;
        hintBack = true;
      } else if (isGrid || isStack) {
        // 叠放翻牌本身已说明；仅提示下一部分
        if (this.data.hasNextModule) {
          hintVisible = true;
          hintText = HINT_NEXT;
        }
      } else if (isColumn && current < max) {
        hintVisible = true;
        hintText = HINT_NEXT_PHOTO;
      } else if (this.data.hasNextModule) {
        hintVisible = true;
        hintText = HINT_NEXT;
      }

      const showCaption = !!(this.data.currentCaption && !isGrid && !isStack);
      const showDots = list.length > 1 && !isGrid && !isStack;
      const footerSlim = !hintVisible && !showCaption && !showDots;

      const prev = this.data;
      if (
        prev.hintVisible !== hintVisible ||
        prev.hintText !== hintText ||
        prev.hintBack !== hintBack ||
        prev.footerSlim !== footerSlim
      ) {
        this.setData({ hintVisible, hintText, hintBack, footerSlim });
        // 提示显隐会改变 stage 高度，宫格需重测
        this.scheduleMeasureStage();
      }
    },

    onGridPreview(e) {
      // 宫格：刚大幅度切过模块时吞误触（叠放不再用此开关，见 onStackPreview）
      if (this._modMovedRecently) return;
      const index = Number(e.detail && e.detail.index);
      if (Number.isNaN(index) || index < 0) return;
      this.openViewer(index);
    },

    onStackPreview(e) {
      // 叠放点按不再看 _modMovedRecently：
      // 纵向手指轻抖会触发 moduledrag move，把该标志打真，导致后续点按全失效
      const index = Number(e.detail && e.detail.index);
      if (Number.isNaN(index) || index < 0) return;
      this.openViewer(index);
    },

    onStackChange(e) {
      const current = Number(e.detail && e.detail.current);
      if (Number.isNaN(current)) return;
      const list = this.data.photos || [];
      this.setData({
        current,
        currentCaption: (list[current] && list[current].caption) || '',
      });
      this.syncHint();
    },

    onStackModuleDrag(e) {
      const detail = e.detail || {};
      const phase = detail.phase;
      const dy = detail.dy || 0;
      if (phase === 'start' || phase === 'move' || phase === 'end' || phase === 'cancel') {
        // 只有真正较大的上下滑才记「刚切过模块」，避免轻抖锁死点按
        if (phase === 'end' && Math.abs(dy) >= 40) {
          this._modMovedRecently = true;
          clearTimeout(this._modMovedTimer);
          this._modMovedTimer = setTimeout(() => {
            this._modMovedRecently = false;
          }, 320);
        }
        if (phase === 'cancel') {
          // 微动取消不锁点按
        }
        this.emitModuleDrag(phase, dy);
      }
    },

    /** 宫格 / 叠放：头/底上下滑切模块 */
    onModuleTouchStart(e) {
      if ((!this.data.isGrid && !this.data.isStack) || !this.data.active) {
        return;
      }

      this._modTouching = true;
      this._modDragging = false;
      this._modStartY = e.touches[0].clientY;
      this._modStartX = e.touches[0].clientX;
      this._modLastDy = 0;
    },

    onModuleTouchMove(e) {
      if (
        !this._modTouching ||
        (!this.data.isGrid && !this.data.isStack) ||
        !this.data.active
      ) {
        return;
      }
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - this._modStartX;
      const dy = y - this._modStartY;
      if (!this._modDragging) {
        if (Math.abs(dy) < 10 && Math.abs(dx) < 10) return;
        // 横向滑动不切模块，留给点按 / 翻牌
        if (Math.abs(dx) > Math.abs(dy)) {
          this._modTouching = false;
          return;
        }
        this._modDragging = true;
        this._modMovedRecently = true;
        if (dy < 0 && !this.data.hasNextModule) return;
        this.emitModuleDrag('start', 0);
      }
      if (dy < 0 && !this.data.hasNextModule) return;
      this._modLastDy = dy;
      this.emitModuleDrag('move', dy);
    },

    onModuleTouchEnd() {
      if (!this._modTouching && !this._modDragging) return;
      const dragging = this._modDragging;
      const lastDy = this._modLastDy;
      this._modTouching = false;
      this._modDragging = false;
      if (dragging) this.emitModuleDrag('end', lastDy);
      if (this._modMovedRecently) {
        setTimeout(() => {
          this._modMovedRecently = false;
        }, 320);
      }
    },




    setPhoto(index) {
      const w = this.data.windowWidth;
      const h = this.data.stageHeight || 400;
      const list = this.data.photos || [];
      const max = Math.max(list.length - 1, 0);
      const current = Math.max(0, Math.min(max, index));
      const isColumn = this.data.layout === 'column';
      this.setData({
        current,
        currentCaption: (list[current] && list[current].caption) || '',
        translateX: isColumn ? 0 : -current * w,
        translateY: isColumn ? -current * h : 0,
        animating: true,
      });
      this.syncHint();
    },

    previewCurrent() {
      this.openViewer(this.data.current || 0);
    },

    /** 与叠放 / 编辑页同一套 wx.previewImage */
    openViewer(index) {
      previewPhotos(this.data.photos || [], index);
    },

    /** 系统预览由微信自己关；保留方法给页面返回键兼容 */
    closeViewerIfOpen() {
      return false;
    },

    noop() {},

    emitModuleDrag(phase, dy) {

      this.triggerEvent('moduledrag', { phase, dy });
    },

    onTouchStart(e) {
      if (!this.data.active) return;
      this._touching = true;
      this._dragging = false;
      this._dir = '';
      this._moduleDragging = false;
      this._photoDragging = false;
      this._startX = e.touches[0].clientX;
      this._startY = e.touches[0].clientY;
      this._baseX = -this.data.current * this.data.windowWidth;
      this._baseY = -this.data.current * (this.data.stageHeight || 400);
      this._lastDy = 0;
      this.setData({ animating: false });
      this.syncHint();
    },

    onTouchMove(e) {
      if (!this._touching || !this.data.active) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - this._startX;
      const dy = y - this._startY;

      if (!this._dir) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        this._dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }

      this._dragging = true;
      const isColumn = this.data.layout === 'column';
      const max = Math.max((this.data.photos || []).length - 1, 0);
      const current = this.data.current || 0;

      if (isColumn) {
        if (this._dir === 'h') return;
        this._lastDy = dy;
        // 首张继续下滑 / 末张继续上滑 → 切模块
        const atFirstDown = current <= 0 && dy > 0;
        const atLastUp = current >= max && dy < 0;
        if (atFirstDown || (atLastUp && this.data.hasNextModule)) {
          this._photoDragging = false;
          if (!this._moduleDragging) {
            this._moduleDragging = true;
            this.emitModuleDrag('start', 0);
          }
          this.emitModuleDrag('move', dy);
          return;
        }
        if (atLastUp && !this.data.hasNextModule) {
          if (this._moduleDragging) {
            this._moduleDragging = false;
            this.emitModuleDrag('cancel', 0);
          }
          // 末张无下模块时仍允许跟手回弹
        }
        this._moduleDragging = false;
        this._photoDragging = true;
        const h = this.data.stageHeight || 400;
        let next = this._baseY + dy;
        const minY = -max * h;
        if (next > 0) next *= 0.35;
        if (next < minY) next = minY + (next - minY) * 0.35;
        this.setData({ translateY: next });
        return;
      }

      // 左右排版
      if (this._dir === 'h') {
        const w = this.data.windowWidth;
        let next = this._baseX + dx;
        const minX = -max * w;
        if (next > 0) next *= 0.35;
        if (next < minX) next = minX + (next - minX) * 0.35;
        this.setData({ translateX: next });
        return;
      }

      this._lastDy = dy;
      if (dy < 0 && !this.data.hasNextModule) {
        if (this._moduleDragging) {
          this._moduleDragging = false;
          this.emitModuleDrag('cancel', 0);
        }
        return;
      }
      if (!this._moduleDragging) {
        this._moduleDragging = true;
        this.emitModuleDrag('start', 0);
      }
      this.emitModuleDrag('move', dy);
    },

    onTouchEnd(e) {
      if (!this._touching || !this.data.active) return;
      const wasDragging = this._dragging;
      const dir = this._dir;
      const moduleDragging = this._moduleDragging;
      const photoDragging = this._photoDragging;
      const startX = this._startX;
      const startY = this._startY;
      const lastDy = this._lastDy;
      this.resetTouch();

      if (!wasDragging) {
        this.previewCurrent();
        this.syncHint();
        return;
      }

      const isColumn = this.data.layout === 'column';

      if (isColumn && photoDragging && dir === 'v') {
        const endY = e.changedTouches[0].clientY;
        const dy = endY - startY;
        const h = this.data.stageHeight || 400;
        const threshold = h * SNAP_RATIO;
        let current = this.data.current;
        const max = Math.max((this.data.photos || []).length - 1, 0);
        if (dy < -threshold && current < max) current += 1;
        else if (dy > threshold && current > 0) current -= 1;
        this.setPhoto(current);
        return;
      }

      if (!isColumn && dir === 'h') {
        const endX = e.changedTouches[0].clientX;
        const dx = endX - startX;
        const w = this.data.windowWidth;
        const threshold = w * SNAP_RATIO;
        let current = this.data.current;
        const max = Math.max((this.data.photos || []).length - 1, 0);
        if (dx < -threshold && current < max) current += 1;
        else if (dx > threshold && current > 0) current -= 1;
        this.setPhoto(current);
        return;
      }

      if (moduleDragging) {
        this.emitModuleDrag('end', lastDy);
      } else if (isColumn) {
        this.setPhoto(this.data.current);
      }
      this.syncHint();
    },
  },
});
