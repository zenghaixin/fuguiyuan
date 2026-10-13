Page({
  data: {
    banners: [
      {
        id: 1,
        tone: 'red',
        badge: '收工实拍',
        title: 'LED 大棚喜宴',
        desc: '灯光矩阵 · 迎宾门楼 · 主舞台',
      },
      {
        id: 2,
        tone: 'gold',
        badge: '中式红喜',
        title: '自建房大院婚礼',
        desc: '传统红喜 · 花轿迎宾 · 喜字满堂',
      },
      {
        id: 3,
        tone: 'cream',
        badge: '梦幻西式',
        title: '空地纯白舞台',
        desc: '纱幔花艺 · 星空顶 · 仪式区',
      },
    ],
    quickEntries: [
      { id: 1, name: '电子喜帖', icon: 'mail', tone: 'red' },
      { id: 2, name: '现场互动', icon: 'play-circle', tone: 'gold' },
      { id: 3, name: '免费看场', icon: 'location', tone: 'wine' },
    ],
    featuredCases: [
      {
        id: 1,
        tone: 'a',
        style: '传统红喜',
        title: '张家大院 · 中式喜宴',
        venue: '自建房大院',
        budget: '参考 1.8万起',
      },
      {
        id: 2,
        tone: 'b',
        style: 'LED 大棚',
        title: '李府婚礼 · 灯光秀',
        venue: '乡村大棚',
        budget: '参考 2.6万起',
      },
      {
        id: 3,
        tone: 'c',
        style: '梦幻西式',
        title: '空地白纱仪式',
        venue: '户外空地',
        budget: '参考 2.2万起',
      },
      {
        id: 4,
        tone: 'd',
        style: '纯舞台',
        title: '王氏婚礼 · 主舞台',
        venue: '乡村大棚',
        budget: '参考 1.5万起',
      },
    ],
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 'home' });
    }
  },

  onQuickTap(e) {
    const { name } = e.currentTarget.dataset;
    if (name === '免费看场') {
      wx.switchTab({ url: '/pages/wedding/index' });
      return;
    }
    if (name === '电子喜帖') {
      wx.navigateTo({ url: '/pages/wedding_invitation/view/index' });
      return;
    }
    wx.showToast({ title: `${name}（示意）`, icon: 'none' });
  },

  goCases() {
    wx.switchTab({ url: '/pages/cases/index' });
  },

  onCaseTap(e) {
    wx.showToast({ title: e.currentTarget.dataset.title, icon: 'none' });
  },
});
