Component({
  properties: {
    photos: { type: Array, value: [] },
    /** 可视高度 px */
    height: { type: Number, value: 400 },
    /** 编辑态：显示删除 */
    editable: { type: Boolean, value: false },
    /** 外部指定当前页（上传后滚到最新） */
    current: { type: Number, value: 0 },
  },

  data: {
    innerCurrent: 0,
  },

  observers: {
    'photos, current': function (photos, current) {
      const list = photos || [];
      const max = Math.max(list.length - 1, 0);
      let next = Number(current);
      if (!Number.isFinite(next)) next = 0;
      next = Math.max(0, Math.min(max, next));
      if (next !== this.data.innerCurrent) {
        this.setData({ innerCurrent: next });
      }
    },
  },

  methods: {
    onChange(e) {
      const current = (e.detail && e.detail.current) || 0;
      this.setData({ innerCurrent: current });
      this.triggerEvent('change', { current });
    },

    onPreview(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index)) return;
      this.triggerEvent('preview', { index });
    },

    onDelete(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this.triggerEvent('delete', { id });
    },
  },
});
