Component({
  properties: {
    pages: { type: Array, value: [] },
    pageIndex: { type: Number, value: 0 },
    activeElementId: { type: String, value: '' },
    /** position | size | angle */
    elementEditMode: { type: String, value: 'position' },
    windowHeight: { type: Number, value: 667 },
    statusBarHeight: { type: Number, value: 20 },
  },

  data: {
    canvasWidth: 0,
    canvasHeight: 0,
    canvasLeft: 0,
    canvasTop: 0,
  },

  lifetimes: {
    ready() {
      this.measureCanvas();
    },
  },

  observers: {
    windowHeight() {
      wx.nextTick(() => this.measureCanvas());
    },
    pages(pages) {
      if (pages && pages.length && !this._canvasReady) {
        wx.nextTick(() => {
          this.measureCanvas();
          this._canvasReady = true;
        });
      }
      if (!pages || !pages.length) {
        this._canvasReady = false;
      }
    },
  },

  methods: {
    measureCanvas() {
      this.createSelectorQuery()
        .select('.stage__safe')
        .boundingClientRect((rect) => {
          if (!rect || !rect.width) return;
          this.setData({
            canvasWidth: rect.width,
            canvasHeight: rect.height,
            canvasLeft: rect.left,
            canvasTop: rect.top,
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
      // 已锁定时忽略点选其他元素（只能点「完成」或从图层面板切换）
      if (this.data.activeElementId && id !== this.data.activeElementId) return;
      this.triggerEvent('selectelement', { id });
    },

    onElementChange(e) {
      this.triggerEvent('elementchange', e.detail || {});
    },

    onPageTap() {
      // 锁定中不取消选中
      if (this.data.activeElementId) return;
      this.triggerEvent('selectelement', { id: '' });
    },

    /** 锁定 + 位置模式：空白处拖动也移动当前元素 */
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
