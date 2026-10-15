Component({
  properties: {
    visible: { type: Boolean, value: false },
    assets: { type: Array, value: [] },
    title: { type: String, value: '选择修饰' },
    hint: { type: String, value: '色块为占位素材，选中后放到画布正中' },
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
