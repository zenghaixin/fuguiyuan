/**
 * 排版（族）→ 风格（具体 layout key）
 * 存储仍写具体 key：carousel | column | fade | thumbs | grid4 | grid9 |
 * magazine | magazineTop | magazineSplit | magazineFocus | stack
 */

const STYLE_BY_KEY = {
  carousel: {
    key: 'carousel',
    label: '左右滑动',
    desc: '一张一张横滑看',
  },
  column: {
    key: 'column',
    label: '上下浏览',
    desc: '竖向一张张看',
  },
  fade: {
    key: 'fade',
    label: '淡入淡出',
    desc: '定格切换，柔和过渡',
  },
  thumbs: {
    key: 'thumbs',
    label: '缩略导览',
    desc: '大图浏览，点底部缩略图跳转',
  },
  grid4: {
    key: 'grid4',
    label: '四宫格',
    desc: '2×2 均分拼图，最多 4 张',
  },
  grid9: {
    key: 'grid9',
    label: '九宫格',
    desc: '3×3 均分拼图，适合人身照',
  },
  magazine: {
    key: 'magazine',
    label: '经典拼贴',
    desc: '左大图 + 右小图 + 底栏',
  },
  magazineTop: {
    key: 'magazineTop',
    label: '顶栏主图',
    desc: '上方主图，下方分格',
  },
  magazineSplit: {
    key: 'magazineSplit',
    label: '左右对开',
    desc: '左栏主图，右栏竖排',
  },
  magazineFocus: {
    key: 'magazineFocus',
    label: '底栏主图',
    desc: '上排小图，底部大图',
  },
  stack: {
    key: 'stack',
    label: '叠放翻看',
    desc: '随意叠放，翻走沉底循环',
  },
};

/** 排版族：先选这一层 */
const FAMILIES = [
  {
    id: 'browse',
    label: '翻页',
    desc: '一张张看，可左右或上下',
    /** 族卡片示意用哪种 ghost */
    preview: 'carousel',
    styles: ['carousel', 'column', 'fade', 'thumbs'],
  },
  {
    id: 'grid',
    label: '网格',
    desc: '一屏多图，均分或自由拼贴',
    preview: 'grid4',
    styles: [
      'grid4',
      'grid9',
      'magazine',
      'magazineTop',
      'magazineSplit',
      'magazineFocus',
    ],
  },
  {
    id: 'stack',
    label: '叠放',
    desc: '照片叠在一起翻看',
    preview: 'stack',
    styles: ['stack'],
  },
];

function familyIdOf(layoutKey) {
  const key = layoutKey === 'grid' ? 'grid4' : layoutKey;
  for (let i = 0; i < FAMILIES.length; i += 1) {
    if (FAMILIES[i].styles.indexOf(key) >= 0) return FAMILIES[i].id;
  }
  return 'browse';
}

function buildFamilyCards(value) {
  const familyId = familyIdOf(value);
  return FAMILIES.map((f) => ({
    id: f.id,
    label: f.label,
    desc: f.desc,
    preview: f.preview,
    selected: f.id === familyId,
  }));
}

function buildStyleCards(familyId, value) {
  const family = FAMILIES.find((f) => f.id === familyId) || FAMILIES[0];
  return family.styles.map((key) => {
    const s = STYLE_BY_KEY[key];
    return {
      key: s.key,
      label: s.label,
      desc: s.desc,
      selected: value === s.key,
    };
  });
}

Component({
  properties: {
    visible: { type: Boolean, value: false },
    value: { type: String, value: 'carousel' },
  },

  data: {
    step: 'family', // family | style
    familyId: 'browse',
    familyCards: buildFamilyCards('carousel'),
    styleCards: [],
    title: '选择排版',
    tip: '先选排版类型，再选具体风格',
    scrollIntoView: '',
    /** 定位完成后再显示列表，避免先顶后跳闪一下 */
    listReady: false,
  },

  observers: {
    visible(v) {
      if (!v) {
        clearTimeout(this._scrollTimer);
        this.setData({ listReady: false, scrollIntoView: '' });
        return;
      }
      this.openForCurrentValue();
    },
    value(v) {
      if (!this.data.visible) return;
      if (this.data.step === 'family') {
        this.setData({ familyCards: buildFamilyCards(v) });
      } else {
        this.setData({
          styleCards: buildStyleCards(this.data.familyId, v),
        });
      }
    },
  },

  methods: {
    _revealList() {
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => {
        this.setData({ listReady: true });
      }, 16);
    },

    resetToFamily() {
      const value = this.properties.value || 'carousel';
      this.setData({
        step: 'family',
        familyId: familyIdOf(value),
        familyCards: buildFamilyCards(value),
        styleCards: [],
        title: '选择排版',
        tip: '先选排版类型，再选具体风格',
        scrollIntoView: '',
        listReady: true,
      });
    },

    /** 已有风格时：直接进对应风格页，并定位到当前项 */
    openForCurrentValue() {
      const value = this.properties.value || 'carousel';
      const familyId = familyIdOf(value);
      const family = FAMILIES.find((f) => f.id === familyId) || FAMILIES[0];

      // 族下只有一种风格（如叠放）：仍停在族列表
      if (!family || family.styles.length <= 1) {
        this.resetToFamily();
        return;
      }

      // 先藏列表 → 带 scrollIntoView 一次写好 → 再显示，避免闪顶
      this.setData(
        {
          step: 'style',
          familyId,
          familyCards: buildFamilyCards(value),
          styleCards: buildStyleCards(familyId, value),
          title: '选择风格',
          tip: '',
          listReady: false,
          scrollIntoView: `layout-style-${value}`,
        },
        () => this._revealList()
      );
    },

    onMask() {
      this.triggerEvent('close');
    },

    onBack() {
      this.resetToFamily();
    },

    onPickFamily(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      const family = FAMILIES.find((f) => f.id === id);
      if (!family) return;

      // 只有一种风格：直接选定
      if (family.styles.length === 1) {
        this.triggerEvent('select', { layout: family.styles[0] });
        return;
      }

      const value = this.properties.value || 'carousel';
      const needScroll = family.styles.indexOf(value) >= 0;
      this.setData(
        {
          step: 'style',
          familyId: id,
          styleCards: buildStyleCards(id, value),
          title: '选择风格',
          tip: '',
          listReady: !needScroll,
          scrollIntoView: needScroll ? `layout-style-${value}` : '',
        },
        () => {
          if (needScroll) this._revealList();
        }
      );
    },

    onPickStyle(e) {
      const key = e.currentTarget.dataset.key;
      if (!key) return;
      this.triggerEvent('select', { layout: key });
    },

    noop() {},
  },
});
