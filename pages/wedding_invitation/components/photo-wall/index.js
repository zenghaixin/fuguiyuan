const SNAP_RATIO = 0.1;
const HINT_NEXT = '上滑留下祝福';
const HINT_BACK = '下滑返回照片墙';

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
  },

  data: {
    current: 0,
    currentCaption: '',
    translateX: 0,
    trackWidth: 375,
    animating: false,
    hintText: HINT_NEXT,
    hintBack: false,
    hintVisible: true,
  },

  observers: {
    'photos, windowWidth': function (photos, windowWidth) {
      const w = windowWidth || 375;
      const list = photos || [];
      const len = Math.max(list.length || 1, 1);
      const current = Math.min(this.data.current, len - 1);
      this.setData({
        trackWidth: w * len,
        current,
        currentCaption: (list[current] && list[current].caption) || '',
        translateX: -current * w,
      });
    },
    'leftBehind, hasNextModule': function () {
      this.syncHint();
    },
  },

  lifetimes: {
    attached() {
      this.resetTouch();
      this.syncHint();
    },
  },

  methods: {
    resetTouch() {
      this._touching = false;
      this._dragging = false;
      this._dir = '';
      this._startX = 0;
      this._startY = 0;
      this._baseX = 0;
      this._moduleDragging = false;
      this._lastDy = 0;
    },

    /** 在这一页上滑；不在了下滑；已是整份末页则隐藏提示 */
    syncHint() {
      if (this.data.leftBehind) {
        this.setData({
          hintVisible: true,
          hintText: HINT_BACK,
          hintBack: true,
        });
      } else if (this.data.hasNextModule) {
        this.setData({
          hintVisible: true,
          hintText: HINT_NEXT,
          hintBack: false,
        });
      } else {
        this.setData({ hintVisible: false, hintText: '', hintBack: false });
      }
    },

    setPhoto(index) {
      const w = this.data.windowWidth;
      const list = this.data.photos || [];
      const max = Math.max(list.length - 1, 0);
      const current = Math.max(0, Math.min(max, index));
      this.setData({
        current,
        currentCaption: (list[current] && list[current].caption) || '',
        translateX: -current * w,
        animating: true,
      });
      this.syncHint();
    },

    emitModuleDrag(phase, dy) {
      this.triggerEvent('moduledrag', { phase, dy });
    },

    onTouchStart(e) {
      if (!this.data.active) return;
      this._touching = true;
      this._dragging = false;
      this._dir = '';
      this._moduleDragging = false;
      this._startX = e.touches[0].clientX;
      this._startY = e.touches[0].clientY;
      this._baseX = -this.data.current * this.data.windowWidth;
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

      if (this._dir === 'h') {
        const w = this.data.windowWidth;
        const max = Math.max((this.data.photos || []).length - 1, 0);
        let next = this._baseX + dx;
        const minX = -max * w;
        if (next > 0) next *= 0.35;
        if (next < minX) next = minX + (next - minX) * 0.35;
        this.setData({ translateX: next });
        return;
      }

      this._lastDy = dy;
      // 无下一模块时禁止上滑切走，仍允许下滑回请帖
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
      const startX = this._startX;
      const lastDy = this._lastDy;
      this.resetTouch();

      if (!wasDragging) {
        this.syncHint();
        return;
      }

      if (dir === 'h') {
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
      }
      this.syncHint();
    },
  },
});
