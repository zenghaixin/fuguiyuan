Component({
  properties: {
    photos: { type: Array, value: [] },
    /** 当前轮播高亮 */
    activeIndex: { type: Number, value: 0 },
    /** 网格区域固定高度 px */
    height: { type: Number, value: 320 },
    /** 排序列数：2=四宫格，3=九宫格/默认 */
    cols: { type: Number, value: 3 },
  },


  data: {
    dragging: false,
    dragFrom: -1,
    hoverIndex: -1,
    ghostSrc: '',
    ghostX: 0,
    ghostY: 0,
  },

  methods: {
    onTap(e) {
      if (this._dragging || this.data.dragging) return;
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index)) return;
      this.triggerEvent('select', { index });
    },

    onLongPress(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index)) return;
      const list = this.data.photos || [];
      const item = list[index];
      if (!item) return;

      this._dragging = true;
      this._fromIndex = index;
      this._moved = false;

      const touch = (e.touches && e.touches[0]) || {};
      try {
        wx.vibrateShort({ type: 'light' });
      } catch (err) {
        /* ignore */
      }

      this.setData({
        dragging: true,
        dragFrom: index,
        hoverIndex: index,
        ghostSrc: item.src,
        ghostX: touch.clientX || 0,
        ghostY: touch.clientY || 0,
      });

      this._measureItems();
    },

    _measureItems() {
      this.createSelectorQuery()
        .in(this)
        .selectAll('.sort-grid__item')
        .boundingClientRect((rects) => {
          this._rects = rects || [];
        })
        .exec();
    },

    _hitIndex(x, y) {
      const rects = this._rects || [];
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (!r) continue;
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return i;
        }
      }
      // 落在空隙时找最近中心
      let best = this._fromIndex;
      let bestDist = Infinity;
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (!r) continue;
        const cx = (r.left + r.right) / 2;
        const cy = (r.top + r.bottom) / 2;
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },

    onItemTouchMove(e) {
      if (!this._dragging) return;
      const touch = e.touches && e.touches[0];
      if (!touch) return;
      this._moved = true;

      const x = touch.clientX;
      const y = touch.clientY;
      const hover = this._hitIndex(x, y);

      this.setData({
        ghostX: x,
        ghostY: y,
        hoverIndex: hover,
      });
    },

    onTouchEnd() {
      if (!this._dragging) return;
      const from = this._fromIndex;
      const to = this.data.hoverIndex;
      this._dragging = false;

      this.setData({
        dragging: false,
        dragFrom: -1,
        hoverIndex: -1,
        ghostSrc: '',
      });

      if (this._moved && to >= 0 && to !== from) {
        this.triggerEvent('reorder', { from, to });
      }
      this._fromIndex = -1;
      this._moved = false;
    },
  },
});
