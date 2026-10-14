const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

Component({
  properties: {
    visible: { type: Boolean, value: false },
    /** 当前层级，用于高亮 */
    value: { type: Number, value: 1 },
  },

  data: {
    levels: LEVELS,
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
      const { level } = e.currentTarget.dataset;
      if (level == null) return;
      this.triggerEvent('select', { layer: Number(level) });
    },
  },
});
