Component({
  properties: {
    chapters: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    windowWidth: { type: Number, value: 375 },
    statusBarHeight: { type: Number, value: 20 },
    active: { type: Boolean, value: false },
    leftBehind: { type: Boolean, value: false },
    hasNextModule: { type: Boolean, value: false },
    startIndex: { type: Number, value: 0 },
  },

  data: {
    current: 0,
    pageText: '',
    hintText: '上滑继续',
    hintBack: false,
  },

  observers: {
    'chapters, startIndex': function (chapters, startIndex) {
      const list = chapters || [];
      const max = Math.max(list.length - 1, 0);
      let next = Number(startIndex);
      if (!Number.isFinite(next)) next = this.data.current || 0;
      next = Math.max(0, Math.min(max, next));
      this.setData({
        current: next,
        pageText: list.length ? `${next + 1} / ${list.length}` : '',
      });
      this.syncHint(next, list.length);
    },
    'leftBehind, hasNextModule, current': function () {
      this.syncHint(this.data.current, (this.data.chapters || []).length);
    },
  },

  methods: {
    syncHint(current, total) {
      let hintText = '';
      let hintBack = false;
      if (this.data.leftBehind) {
        hintText = '下滑返回';
        hintBack = true;
      } else if (total > 1 && current < total - 1) {
        hintText = '左右滑动切换章节';
      } else if (this.data.hasNextModule) {
        hintText = '上滑继续';
      } else {
        hintText = '';
      }
      if (
        hintText !== this.data.hintText ||
        hintBack !== this.data.hintBack
      ) {
        this.setData({ hintText, hintBack });
      }
    },

    onSwiperChange(e) {
      const current = Number(e.detail && e.detail.current) || 0;
      const total = (this.data.chapters || []).length;
      this.setData({
        current,
        pageText: total ? `${current + 1} / ${total}` : '',
      });
      this.syncHint(current, total);
    },

    onTouchStart(e) {
      const t = e.touches && e.touches[0];
      if (!t) return;
      this._touch = {
        x: t.clientX,
        y: t.clientY,
        dir: '',
        module: false,
      };
    },

    onTouchMove(e) {
      const touch = this._touch;
      const t = e.touches && e.touches[0];
      if (!touch || !t) return;
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      if (!touch.dir) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        touch.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        if (touch.dir === 'v') {
          touch.module = true;
          this.triggerEvent('moduledrag', { phase: 'start', dy: 0 });
        }
      }
      if (touch.dir === 'v' && touch.module) {
        this.triggerEvent('moduledrag', { phase: 'move', dy });
      }
    },

    onTouchEnd(e) {
      const touch = this._touch;
      this._touch = null;
      if (!touch) return;
      if (touch.dir === 'v' && touch.module) {
        const t = (e.changedTouches && e.changedTouches[0]) || {};
        const dy = (t.clientY || 0) - touch.y;
        this.triggerEvent('moduledrag', { phase: 'end', dy });
      }
    },
  },
});
