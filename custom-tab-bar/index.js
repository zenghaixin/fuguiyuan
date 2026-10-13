Component({
  data: {
    value: '',
    list: [
      { icon: 'home', value: 'home', label: '首页' },
      { icon: 'image', value: 'cases', label: '案例库' },
      { icon: 'gift', value: 'wedding', label: '办婚礼' },
      { icon: 'user', value: 'my', label: '我的' },
    ],
  },
  lifetimes: {
    ready() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        const nameRe = /pages\/(\w+)\/index/.exec(curPage.route);
        if (nameRe && nameRe[1]) {
          this.setData({ value: nameRe[1] });
        }
      }
    },
  },
  methods: {
    handleChange(e) {
      const { value } = e.detail;
      wx.switchTab({ url: `/pages/${value}/index` });
    },
  },
});
