Page({
  data: {
    packages: [
      {
        id: 1,
        name: '基础搭建套餐',
        price: '¥9,800 起',
        desc: '主舞台 + 基础灯光 + 迎宾区布置',
        tags: ['适合自建房', '1天搭建'],
      },
      {
        id: 2,
        name: '豪华大棚套餐',
        price: '¥18,800 起',
        desc: 'LED 大棚 + 灯光矩阵 + 音响全套',
        tags: ['乡村大棚', '灯光秀'],
      },
      {
        id: 3,
        name: '一站式全包套餐',
        price: '¥28,800 起',
        desc: '搭建 + 摄像摄影 + 喜帖互动全包',
        tags: ['含交片', '含互动'],
      },
    ],
    pkgIndex: 1,
    venues: ['自建房', '大棚', '空地'],
    styles: ['中式', '西式'],
    extras: ['灯光矩阵', '音响', '迎宾门楼', '桌数加项'],
    venue: '大棚',
    style: '中式',
    extrasSelected: {
      灯光矩阵: true,
      音响: true,
      迎宾门楼: false,
      桌数加项: false,
    },
    estimateText: '¥1.8万 - ¥2.6万',
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 'wedding' });
    }
  },

  onSelectPkg(e) {
    this.setData({ pkgIndex: e.currentTarget.dataset.index });
    this.recalc();
  },

  onPick(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({ [field]: value }, () => this.recalc());
  },

  onToggleExtra(e) {
    const key = e.currentTarget.dataset.value;
    const extrasSelected = { ...this.data.extrasSelected };
    extrasSelected[key] = !extrasSelected[key];
    this.setData({ extrasSelected }, () => this.recalc());
  },

  recalc() {
    const base = [9800, 18800, 28800][this.data.pkgIndex] || 18800;
    let add = 0;
    Object.keys(this.data.extrasSelected).forEach((k) => {
      if (this.data.extrasSelected[k]) add += 1500;
    });
    if (this.data.venue === '空地') add += 2000;
    if (this.data.style === '西式') add += 1000;
    const low = Math.round((base + add) / 1000) / 10;
    const high = Math.round((base + add * 1.6) / 1000) / 10;
    this.setData({ estimateText: `¥${low}万 - ¥${high}万` });
  },

  onSubmit() {
    wx.showModal({
      title: '提交成功（示意）',
      content: '已记录需求，后台将提示师傅联系您精确报价。正式版将走微信手机号授权。',
      showCancel: false,
    });
  },
});
