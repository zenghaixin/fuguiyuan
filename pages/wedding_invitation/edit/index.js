import { EDIT_MODULES } from './modules';
import { TEMP_INVITE_ID } from '~/services/invite-draft';

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

  /** 正式预览：读本地草稿，不展示留言/婚礼现场 */
  onPreview() {
    wx.navigateTo({
      url: `/pages/wedding_invitation/view/index?mode=draft&id=${TEMP_INVITE_ID}`,
    });
  },

  /** 静态 Demo：此前做好的完整请柬浏览版 */
  onPreviewDemo() {
    wx.navigateTo({
      url: '/pages/wedding_invitation/demo/index',
    });
  },
});
