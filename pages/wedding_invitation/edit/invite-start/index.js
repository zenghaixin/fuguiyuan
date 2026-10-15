import { createInviteWork } from '~/services/invite-draft';
import { createBlankPage } from '../canvas-model';
import { enterInvitePagesAfterCreate } from '../nav-after-create';
import { navigateBackToRoute, WORKS_ROUTE, WORKS_URL } from '../nav-route';

Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
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

  /**
   * 固定入口：仅「我的喜帖」→ 新建
   * 返回只回「我的喜帖」，不依赖栈上一页是谁
   */
  onBack() {
    navigateBackToRoute(WORKS_ROUTE, WORKS_URL);
  },

  /**
   * 与选模板互斥占栈：redirect 掉本页，避免 新建↔选模板 互相压栈
   */
  onPickTemplate() {
    wx.redirectTo({
      url: '/pages/wedding_invitation/edit/template-list/index?from=create',
    });
  },

  onPickCustom() {
    createInviteWork({
      title: '未命名喜帖',
      mode: 'custom',
      pages: [createBlankPage({ title: '第1页' })],
    }).then((draft) => {
      enterInvitePagesAfterCreate(draft.inviteId);
    });
  },
});
