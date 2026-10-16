/** 照片墙排版选项（示意卡 + 文案） */
const LAYOUT_OPTIONS = [
  { key: 'carousel', label: '左右滑动', desc: '一张一张滑看' },
  { key: 'column', label: '上下浏览', desc: '竖向一张张看' },
  { key: 'grid4', label: '四宫格', desc: '2×2 拼图，最多 4 张' },
  { key: 'grid9', label: '九宫格', desc: '3×3 拼图，适合人身照' },
  { key: 'stack', label: '叠放翻看', desc: '随意叠放，翻走沉底循环' },
];

Component({
  properties: {
    visible: { type: Boolean, value: false },
    value: { type: String, value: 'carousel' },
  },

  data: {
    options: LAYOUT_OPTIONS,
  },

  methods: {
    onMask() {
      this.triggerEvent('close');
    },

    onClose() {
      this.triggerEvent('close');
    },

    onPick(e) {
      const key = e.currentTarget.dataset.key;
      if (!key) return;
      this.triggerEvent('select', { layout: key });
    },

    noop() {},
  },
});
