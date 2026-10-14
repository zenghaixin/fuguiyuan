const SNAP_RATIO = 0.1;
const HINT_BACK = '下滑返回';

Component({
  properties: {
    pages: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    active: { type: Boolean, value: false },
    /** 已离开封面模块（在照片墙/祝福板）→ 封面各页提示统一下滑 */
    leftBehind: { type: Boolean, value: false },
    /** 下方是否还有模块（无则末页上滑不切模块） */
    hasNextModule: { type: Boolean, value: true },
  },

  data: {
    pageIndex: 0,
    translateY: 0,
    trackHeight: 667,
    animating: false,
    pageHints: [],
  },

  observers: {
    'pages, windowHeight, pageIndex, leftBehind, hasNextModule': function () {
      const h = this.data.windowHeight || 667;
      const pages = this.data.pages || [];
      this.setData({
        trackHeight: h * Math.max(pages.length, 1),
        translateY: -this.data.pageIndex * h,
        pageHints: this.buildPageHints(),
      });
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
      this.setData({ pageHints: this.buildPageHints() });
    },
  },

  methods: {
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
