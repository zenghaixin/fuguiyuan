import { createInviteWork, saveInviteDraft } from '~/services/invite-draft';
import {
  getInviteTemplateById,
  cloneTemplatePages,
} from '../template-mock';
import { editPagesToCoverPages } from '~/services/invite-preview';
import { enterInvitePagesAfterCreate } from '../nav-after-create';
import { DESIGN_ASPECT } from '~/services/invite-canvas';
import { navigateBackToRoute, INVITE_ROUTE } from '../nav-route';


Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
    windowHeight: 667,
    windowWidth: 375,
    templateId: '',
    templateName: '',
    pages: [],
    from: 'create',
    inviteId: '',
  },

  onLoad(query) {
    const { statusBarHeight, windowHeight, windowWidth } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const id = (query && query.id) || '';
    const tpl = getInviteTemplateById(id);
    if (!tpl) {
      wx.showToast({ title: '模板不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 400);
      return;
    }
    const editPages = cloneTemplatePages(tpl);
    const pages = editPagesToCoverPages(editPages, { hasPhotoWall: false });
    this._editPages = editPages;
    this.setData({
      statusBarHeight,
      windowHeight,
      windowWidth,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      templateId: tpl.id,
      templateName: tpl.name,
      pages,
      from: (query && query.from) === 'edit' ? 'edit' : 'create',
      inviteId: (query && query.inviteId) || '',
    });
  },

  /** 只从模板列表进 → 回上一页 */
  onBack() {
    wx.navigateBack({ delta: 1 });
  },


  onUseTemplate() {
    if (this._using) return;
    this._using = true;
    const pages = this._editPages || [];
    const { from, inviteId, templateName } = this.data;

    if (from === 'edit' && inviteId) {
      saveInviteDraft({
        inviteId,
        title: templateName || undefined,
        pages,
        pageIndex: 0,
        designAspect: DESIGN_ASPECT,
        meta: { mode: 'template', source: 'edit/template-preview' },
      })
        .then(() => {
          this._backToInviteEditor();
        })
        .catch(() => {
          this._using = false;
          wx.showToast({ title: '应用失败', icon: 'none' });
        });
      return;
    }

    createInviteWork({
      title: templateName || '未命名喜帖',
      mode: 'template',
      pages,
    })
      .then((draft) => {
        enterInvitePagesAfterCreate(draft.inviteId);
      })
      .catch(() => {
        this._using = false;
        wx.showToast({ title: '创建失败', icon: 'none' });
      });
  },

  /** 编辑态用模板：固定回到画布页 */
  _backToInviteEditor() {
    const { inviteId } = this.data;
    const fallback = inviteId
      ? `/pages/wedding_invitation/edit/invite/index?id=${inviteId}`
      : undefined;
    navigateBackToRoute(INVITE_ROUTE, fallback);
  },
});
