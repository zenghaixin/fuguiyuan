Component({
  properties: {
    visible: { type: Boolean, value: false },
    assets: { type: Array, value: [] },
  },

  methods: {
    noop() {},

    onMask() {
      this.triggerEvent('close');
    },

    onClose() {
      this.triggerEvent('close');
    },

    onPick(e) {
      const { id } = e.currentTarget.dataset;
      if (!id) return;
      const asset = (this.data.assets || []).find((item) => item.id === id);
      if (!asset) return;
      this.triggerEvent('select', { asset });
    },
  },
});
