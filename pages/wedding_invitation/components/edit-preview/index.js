/** Demo 全屏叠层组件，供 demo 独立页复用 */
Component({
  properties: {
    visible: { type: Boolean, value: false },
    /** 当前页数据 { bgColor, bgSrc, elements } */
    page: { type: Object, value: null },
    statusBarHeight: { type: Number, value: 20 },
  },

  data: {
    elements: [],
  },

  observers: {
    page(page) {
      const els = (page && page.elements) || [];
      // 低层先画，高层后画（同层按 id）
      const elements = els.slice().sort((a, b) => {
        const la = Number(a.layer) || 1;
        const lb = Number(b.layer) || 1;
        if (la !== lb) return la - lb;
        return String(a.id).localeCompare(String(b.id));
      });
      this.setData({ elements });
    },
  },

  methods: {
    noop() {},

    onClose() {
      this.triggerEvent('close');
    },
  },
});
