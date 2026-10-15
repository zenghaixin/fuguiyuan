import {
  createBlankPage,
  appendBlankPage,
  removePageAt,
  MAX_INVITE_PAGES,
} from '../canvas-model';
import {
  loadInviteDraft,
  saveInviteDraft,
  renameInviteWork,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';
import { DESIGN_ASPECT } from '~/services/invite-canvas';
import { navigateBackToRoute, WORKS_ROUTE, WORKS_URL } from '../nav-route';

function pageLabel(index) {
  return `第${index + 1}页`;
}

Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    workTitle: '未命名喜帖',
    pages: [],
    maxPages: MAX_INVITE_PAGES,
    dialog: {
      visible: false,
      mode: 'prompt',
      title: '',
      content: '',
      value: '',
      placeholder: '请输入名称',
      confirmText: '确定',
      danger: false,
      action: '',
      targetIndex: -1,
    },
  },

  onLoad(query) {
    const { statusBarHeight } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    this.setData({
      statusBarHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      inviteId,
    });
  },

  onShow() {
    this.reloadPages();
  },

  reloadPages() {
    const draft = loadInviteDraft(this.data.inviteId);
    this.setData({
      workTitle: (draft && draft.title) || '未命名喜帖',
      pages: (draft && draft.pages) || [],
    });
  },

  persist(pages, pageIndex) {
    return saveInviteDraft({
      inviteId: this.data.inviteId,
      title: this.data.workTitle,
      pages,
      pageIndex: pageIndex != null ? pageIndex : 0,
      designAspect: DESIGN_ASPECT,
      meta: { source: 'edit/invite-pages' },
    });
  },

  /** 固定入口：从「我的喜帖」进来（新建也会落在这层）→ 固定回作品列表 */
  onBack() {
    navigateBackToRoute(WORKS_ROUTE, WORKS_URL);
  },


  openDialog(patch) {
    this.setData({
      dialog: {
        visible: true,
        mode: 'prompt',
        title: '',
        content: '',
        value: '',
        placeholder: '请输入名称',
        confirmText: '确定',
        danger: false,
        action: '',
        targetIndex: -1,
        ...patch,
      },
    });
  },

  closeDialog() {
    this.setData({ 'dialog.visible': false });
  },

  onRenameWork() {
    this.openDialog({
      mode: 'prompt',
      title: '修改喜帖名称',
      value: this.data.workTitle || '',
      placeholder: '请输入名称',
      confirmText: '确定',
      danger: false,
      action: 'renameWork',
    });
  },

  onOpenPage(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index) || index < 0) return;
    this.persist(this.data.pages, index).then(() => {
      wx.navigateTo({
        url: `/pages/wedding_invitation/edit/invite/index?id=${this.data.inviteId}&page=${index}`,
      });
    });
  },

  onAddPage() {
    const cur = this.data.pages || [];
    if (cur.length >= MAX_INVITE_PAGES) {
      wx.showToast({ title: `最多 ${MAX_INVITE_PAGES} 页`, icon: 'none' });
      return;
    }
    const pages = cur.length
      ? appendBlankPage(cur)
      : [createBlankPage({ title: pageLabel(0) })];
    const pageIndex = pages.length - 1;
    this.persist(pages, pageIndex).then(() => {
      this.setData({ pages });
      wx.navigateTo({
        url: `/pages/wedding_invitation/edit/invite/index?id=${this.data.inviteId}&page=${pageIndex}`,
      });
    });
  },

  onDeletePage(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index) || index < 0) return;
    this.openDialog({
      mode: 'confirm',
      title: '删除页面',
      content: `确定删除「${pageLabel(index)}」吗？`,
      confirmText: '删除',
      danger: true,
      action: 'deletePage',
      targetIndex: index,
    });
  },

  onDialogCancel() {
    this.closeDialog();
  },

  onDialogConfirm(e) {
    const { action, targetIndex } = this.data.dialog;
    const value = (e.detail && e.detail.value) || '';
    this.closeDialog();

    if (action === 'renameWork') {
      renameInviteWork(this.data.inviteId, value).then((draft) => {
        this.setData({ workTitle: draft.title });
      });
      return;
    }

    if (action === 'deletePage') {
      const pages = removePageAt(this.data.pages, targetIndex);
      const pageIndex = Math.max(0, Math.min(pages.length - 1, targetIndex - 1));
      this.persist(pages, pageIndex).then(() => {
        this.setData({ pages });
      });
    }
  },

  onEditPhotoWall() {
    wx.navigateTo({
      url: `/pages/wedding_invitation/edit/photo-wall/index?id=${this.data.inviteId}`,
    });
  },

  onPreviewAll() {
    if (!(this.data.pages || []).length) {
      wx.showToast({ title: '请先添加喜帖页', icon: 'none' });
      return;
    }
    this.persist(this.data.pages, 0).then(() => {
      wx.navigateTo({
        url: `/pages/wedding_invitation/view/index?mode=draft&id=${this.data.inviteId}`,
      });
    });
  },
});
