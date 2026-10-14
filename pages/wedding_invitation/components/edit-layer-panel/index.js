Component({
  properties: {
    visible: { type: Boolean, value: false },
    layers: { type: Array, value: [] },
    activeId: { type: String, value: '' },
  },

  methods: {
    noop() {},

    onMask() {
      this.triggerEvent('close');
    },

    onClose() {
      this.triggerEvent('close');
    },

    onSelect(e) {
      const { id } = e.currentTarget.dataset;
      if (!id) return;
      this.triggerEvent('select', { id });
    },

    onEditLayer(e) {
      const { id, layer } = e.currentTarget.dataset;
      if (!id) return;
      this.triggerEvent('editlayer', {
        id,
        layer: Number(layer) || 1,
      });
    },
  },
});
