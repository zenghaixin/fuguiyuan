import { PHOTO_TOOLS } from '../toolbox';

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    backTop: 48,
    backSize: 32,
    photoWall: [],
    toolboxTools: PHOTO_TOOLS,
    toolboxActive: '',
  },

  onLoad() {
    const { statusBarHeight, windowHeight } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusBarHeight,
      windowHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
    });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onToolboxSelect(e) {
    const { key, tool } = e.detail || {};
    if (!key) return;
    this.setData({ toolboxActive: key });

    if (key === 'preview') {
      wx.navigateTo({ url: '/pages/wedding_invitation/view/index' });
      return;
    }
    if (key === 'upload') {
      this.onAddPhoto();
      return;
    }

    wx.showToast({
      title: `${(tool && tool.label) || key}（稍后接）`,
      icon: 'none',
    });
  },

  onAddPhoto() {
    this.setData({ toolboxActive: 'upload' });
    wx.showToast({ title: '照片上传稍后接', icon: 'none' });
  },
});
