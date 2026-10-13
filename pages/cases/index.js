const ALL_CASES = [
  {
    id: 1,
    title: '张府大院喜宴',
    venue: '自建房大院',
    style: '传统红喜',
    budget: '造价约 1.8万',
    tone: 'a',
    height: 280,
    hasVideo: true,
  },
  {
    id: 2,
    title: '李家 LED 大棚',
    venue: '乡村大棚',
    style: 'LED 大棚',
    budget: '造价约 2.6万',
    tone: 'b',
    height: 360,
    hasVideo: true,
  },
  {
    id: 3,
    title: '空地白纱仪式',
    venue: '空地',
    style: '梦幻西式',
    budget: '造价约 2.2万',
    tone: 'c',
    height: 240,
    hasVideo: false,
  },
  {
    id: 4,
    title: '王氏纯舞台',
    venue: '乡村大棚',
    style: '纯舞台',
    budget: '造价约 1.5万',
    tone: 'd',
    height: 300,
    hasVideo: false,
  },
  {
    id: 5,
    title: '陈府中式门楼',
    venue: '自建房大院',
    style: '传统红喜',
    budget: '造价约 2.0万',
    tone: 'e',
    height: 320,
    hasVideo: true,
  },
  {
    id: 6,
    title: '周家星空顶',
    venue: '空地',
    style: '梦幻西式',
    budget: '造价约 2.8万',
    tone: 'f',
    height: 260,
    hasVideo: true,
  },
];

Page({
  data: {
    venueFilters: ['全部场地', '自建房大院', '乡村大棚', '空地'],
    styleFilters: ['全部风格', '传统红喜', '梦幻西式', '纯舞台', 'LED 大棚'],
    venueIndex: 0,
    styleIndex: 0,
    leftList: [],
    rightList: [],
  },

  onLoad() {
    this.applyFilter();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 'cases' });
    }
  },

  onFilter(e) {
    const { index, type } = e.currentTarget.dataset;
    if (type === 'venue') {
      this.setData({ venueIndex: index }, () => this.applyFilter());
    } else {
      this.setData({ styleIndex: index }, () => this.applyFilter());
    }
  },

  applyFilter() {
    const { venueFilters, styleFilters, venueIndex, styleIndex } = this.data;
    const venue = venueFilters[venueIndex];
    const style = styleFilters[styleIndex];
    const list = ALL_CASES.filter((item) => {
      const okVenue = venueIndex === 0 || item.venue === venue;
      const okStyle = styleIndex === 0 || item.style === style;
      return okVenue && okStyle;
    });
    const leftList = [];
    const rightList = [];
    list.forEach((item, i) => {
      (i % 2 === 0 ? leftList : rightList).push(item);
    });
    this.setData({ leftList, rightList });
  },

  onOpen(e) {
    wx.showToast({ title: `${e.currentTarget.dataset.title}（示意）`, icon: 'none' });
  },
});
