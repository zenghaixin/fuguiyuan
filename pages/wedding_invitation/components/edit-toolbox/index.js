Component({
  properties: {
    tools: { type: Array, value: [] },
    activeKey: { type: String, value: '' },
  },

  methods: {
    noop() {},

    onTap(e) {
      const { key } = e.currentTarget.dataset;
      if (!key) return;
      const tool = (this.data.tools || []).find((item) => item.key === key);
      this.triggerEvent('select', { key, tool });
    },
  },
});
