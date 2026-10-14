import { EDIT_MODULES } from './modules';

Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
    modules: EDIT_MODULES,
  },

  onLoad() {
    const { statusBarHeight } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusBarHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
    });
  },

  onBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.switchTab({ url: '/pages/home/index' });
  },

  onOpenModule(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) return;
    wx.navigateTo({ url: path });
  },

  onPreview() {
    wx.navigateTo({ url: '/pages/wedding_invitation/view/index' });
  },
});
