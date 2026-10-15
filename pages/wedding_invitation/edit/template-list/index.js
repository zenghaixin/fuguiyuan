import { INVITE_TEMPLATES } from '../template-mock';

const START_URL = '/pages/wedding_invitation/edit/invite-start/index';

Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
    templates: INVITE_TEMPLATES,
    /** create | edit */
    from: 'create',
    inviteId: '',
  },

  onLoad(query) {
    const { statusBarHeight } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusBarHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      from: (query && query.from) === 'edit' ? 'edit' : 'create',
      inviteId: (query && query.id) || '',
    });
  },

  onBack() {
    // 新建流程：选模板是 redirect 上来的，固定回到「新建喜帖」
    if (this.data.from === 'create') {
      wx.redirectTo({ url: START_URL });
      return;
    }
    // 编辑画布进来：只回上一页
    wx.navigateBack({ delta: 1 });
  },

  onOpenPreview(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const { from, inviteId } = this.data;
    let url = `/pages/wedding_invitation/edit/template-preview/index?id=${id}&from=${from}`;
    if (inviteId) url += `&inviteId=${inviteId}`;
    wx.navigateTo({ url });
  },
});
