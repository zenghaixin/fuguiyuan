Component({
  properties: {
    photos: { type: Array, value: [] },
    /** 可视高度 px */
    height: { type: Number, value: 400 },
    /** 2=四宫格，3=九宫格（均铺满舞台） */
    cols: { type: Number, value: 2 },
    /** 编辑态：显示删除 + 长按拖排序 */
    editable: { type: Boolean, value: false },
  },

  data: {
    cells: [],
    cellCount: 4,
    dragging: false,
    dragFrom: -1,
    hoverIndex: -1,
    ghostSrc: '',
    ghostX: 0,
    ghostY: 0,
  },

  observers: {
    'photos, cols': function (photos, cols) {
      const c = cols === 3 ? 3 : 2;
      const cellCount = c * c;
      const list = (photos || []).slice(0, cellCount);
      const cells = [];
      for (let i = 0; i < cellCount; i += 1) {
        cells.push(list[i] || null);
      }
      this.setData({ cells, cellCount });
    },
  },

  methods: {
    onPreview(e) {
      if (this._dragging || this.data.dragging || this._suppressTap) {
        this._suppressTap = false;
        return;
      }
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index)) return;
      const cell = (this.data.cells || [])[index];
      if (!cell) {
        this.triggerEvent('add');
        return;
      }
      this.triggerEvent('preview', { index });
    },

    onDelete(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this.triggerEvent('delete', { id });
    },

    onLongPress(e) {
      if (!this.data.editable) return;
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index)) return;
      const cell = (this.data.cells || [])[index];
      if (!cell) return;
      const filled = (this.data.photos || []).length;
      if (filled < 2) {
        wx.showToast({ title: '至少两张才能排序', icon: 'none' });
        return;
      }

      this._dragging = true;
      this._fromIndex = index;
      this._moved = false;
      this._suppressTap = true;

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
        ghostSrc: cell.src,
        ghostX: touch.clientX || 0,
        ghostY: touch.clientY || 0,
      });

      this._measureItems();
    },

    _measureItems() {
      this.createSelectorQuery()
        .in(this)
        .selectAll('.pw-grid__cell')
        .boundingClientRect((rects) => {
          this._rects = rects || [];
        })
        .exec();
    },

    _hitIndex(x, y) {
      const rects = this._rects || [];
      const filled = (this.data.photos || []).length;
      // 只允许落到有图的格，或紧挨末尾的空位（用于挪到末尾）
      let best = this._fromIndex;
      let bestDist = Infinity;
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (!r) continue;
        if (i > filled) continue;
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return Math.min(i, Math.max(filled - 1, 0));
        }
        const cx = (r.left + r.right) / 2;
        const cy = (r.top + r.bottom) / 2;
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (i <= filled && d < bestDist) {
          bestDist = d;
          best = Math.min(i, Math.max(filled - 1, 0));
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
      this.setData({
        ghostX: x,
        ghostY: y,
        hoverIndex: this._hitIndex(x, y),
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
      // 松手后短暂吞掉 tap，避免误开预览
      setTimeout(() => {
        this._suppressTap = false;
      }, 280);
    },
  },
});
