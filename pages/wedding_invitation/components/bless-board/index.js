const SNAP_RATIO = 0.1;

Component({
  properties: {
    blessings: { type: Array, value: [] },
    stagePhotos: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    windowWidth: { type: Number, value: 375 },
    statusBarHeight: { type: Number, value: 20 },
    active: { type: Boolean, value: false },
  },

  data: {
    activeTab: 'bless',
    tabIndex: 0,
    tabTranslateX: 0,
    tabSliderWidth: 750,
    tabAnimating: false,
  },

  observers: {
    windowWidth(w) {
      const width = w || 375;
      this.setData({
        tabSliderWidth: width * 2,
        tabTranslateX: -this.data.tabIndex * width,
      });
    },
  },

  lifetimes: {
    attached() {
      this._listScrollTop = 0;
      this._touching = false;
      this._moduleDragging = false;
      this._contentTouching = false;
      this._contentDir = '';
      this._tabDragging = false;
      this._startX = 0;
      this._startY = 0;
      this._baseTabX = 0;
      this._lastDy = 0;
      const w = this.data.windowWidth || 375;
      this.setData({
        tabSliderWidth: w * 2,
        tabTranslateX: 0,
      });
    },
  },

  methods: {
    onWrite() {
      this.triggerEvent('write');
    },

    onListScroll(e) {
      this._listScrollTop = e.detail.scrollTop || 0;
    },

    emitModuleDrag(phase, dy) {
      this.triggerEvent('moduledrag', { phase, dy });
    },

    setTab(tabIndex) {
      const w = this.data.windowWidth || 375;
      const next = tabIndex === 1 ? 1 : 0;
      this._listScrollTop = 0;
      this.setData({
        tabIndex: next,
        activeTab: next === 1 ? 'stage' : 'bless',
        tabTranslateX: -next * w,
        tabAnimating: true,
      });
    },

    onTabTap(e) {
      const tab = e.currentTarget.dataset.tab;
      if (!tab || tab === this.data.activeTab) return;
      this._contentTouching = false;
      this._tabDragging = false;
      this.setTab(tab === 'stage' ? 1 : 0);
    },

    clampTabX(x) {
      const min = -(this.data.windowWidth || 375);
      return Math.max(min, Math.min(0, x));
    },

    onChromeTouchStart(e) {
      this.beginModulePull(e);
    },

    onChromeTouchMove(e) {
      this.moveModulePull(e);
    },

    onChromeTouchEnd() {
      this.endModulePull();
    },

    onContentTouchStart(e) {
      if (!this.data.active) return;
      this._contentTouching = true;
      this._contentDir = '';
      this._tabDragging = false;
      this._moduleDragging = false;
      this._touching = false;
      this._startX = e.touches[0].clientX;
      this._startY = e.touches[0].clientY;
      this._baseTabX = -this.data.tabIndex * (this.data.windowWidth || 375);
      this._lastDy = 0;
    },

    onContentTouchMove(e) {
      if (!this._contentTouching || !this.data.active) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - this._startX;
      const dy = y - this._startY;

      if (!this._contentDir) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        this._contentDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }

      if (this._contentDir === 'h') {
        this._tabDragging = true;
        this.setData({
          tabAnimating: false,
          tabTranslateX: this.clampTabX(this._baseTabX + dx),
        });
        return;
      }

      if (this._listScrollTop > 2 && !this._moduleDragging) return;

      this._lastDy = dy;
      if (dy > 8 && this._listScrollTop <= 2) {
        this._touching = true;
        if (!this._moduleDragging) {
          this._moduleDragging = true;
          this.emitModuleDrag('start', 0);
        }
        this.emitModuleDrag('move', dy);
      } else if (this._moduleDragging && dy <= 0) {
        this._moduleDragging = false;
        this._touching = false;
        this.emitModuleDrag('cancel', 0);
      }
    },

    onContentTouchEnd() {
      if (!this._contentTouching) return;
      const dir = this._contentDir;
      const tabDragging = this._tabDragging;
      const moduleDragging = this._moduleDragging;
      const lastDy = this._lastDy;
      this._contentTouching = false;
      this._contentDir = '';
      this._tabDragging = false;
      this._moduleDragging = false;
      this._touching = false;
      this._lastDy = 0;

      if (dir === 'h' && tabDragging) {
        const w = this.data.windowWidth || 375;
        const x = this.data.tabTranslateX;
        const threshold = w * SNAP_RATIO;
        let tabIndex = this.data.tabIndex;
        if (this.data.tabIndex === 0) {
          tabIndex = x < -threshold ? 1 : 0;
        } else {
          tabIndex = x > -w + threshold ? 0 : 1;
        }
        this.setTab(tabIndex);
        return;
      }

      if (moduleDragging) {
        this.emitModuleDrag('end', lastDy);
      }
    },

    beginModulePull(e) {
      if (!this.data.active) return;
      this._touching = true;
      this._moduleDragging = false;
      this._startY = e.touches[0].clientY;
      this._lastDy = 0;
    },

    moveModulePull(e) {
      if (!this._touching || !this.data.active) return;
      const dy = e.touches[0].clientY - this._startY;
      this._lastDy = dy;

      if (dy > 8) {
        if (!this._moduleDragging) {
          this._moduleDragging = true;
          this.emitModuleDrag('start', 0);
        }
        this.emitModuleDrag('move', dy);
        return;
      }

      if (this._moduleDragging && dy <= 0) {
        this._moduleDragging = false;
        this.emitModuleDrag('cancel', 0);
      }
    },

    endModulePull() {
      if (!this._touching || !this.data.active) return;
      const moduleDragging = this._moduleDragging;
      const lastDy = this._lastDy;
      this._touching = false;
      this._moduleDragging = false;
      this._lastDy = 0;
      if (moduleDragging) {
        this.emitModuleDrag('end', lastDy);
      }
    },

    showBlessTab() {
      this.setTab(0);
    },
  },
});
