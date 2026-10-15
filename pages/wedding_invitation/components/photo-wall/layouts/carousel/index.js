Component({
  properties: {
    photos: { type: Array, value: [] },
    /** 可视高度 px */
    height: { type: Number, value: 400 },
    /** 编辑态：显示删除 */
    editable: { type: Boolean, value: false },
  },

  data: {
    current: 0,
  },

  observers: {
    photos(photos) {
      const list = photos || [];
      const max = Math.max(list.length - 1, 0);
      if (this.data.current > max) {
        this.setData({ current: max });
      }
    },
  },

  methods: {
    onChange(e) {
      const current = (e.detail && e.detail.current) || 0;
      this.setData({ current });
      this.triggerEvent('change', { current });
    },

    onDelete(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this.triggerEvent('delete', { id });
    },
  },
});
