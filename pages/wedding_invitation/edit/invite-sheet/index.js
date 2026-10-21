import {
  createBlankPage,
  appendBlankPage,
  removePageAt,
  MAX_INVITE_PAGES,
} from '../canvas-model';
import {
  loadInviteDraft,
  saveInviteDraft,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';
import { DESIGN_ASPECT } from '~/services/invite-canvas';
import { navigateBackToRoute, PAGES_ROUTE } from '../nav-route';

const PAGES_URL = '/pages/wedding_invitation/edit/invite-pages/index';

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
    /** 缩略图画板宽（px），字号按此换算 */
    thumbBoardW: 160,
    dialog: {
      visible: false,
      mode: 'confirm',
      title: '',
      content: '',
      value: '',
      placeholder: '',
      confirmText: '确定',
      danger: false,
      action: '',
      targetIndex: -1,
    },
  },

  onLoad(query) {
    const win = wx.getWindowInfo();
    const { statusBarHeight, windowWidth } = win;
    const menu = wx.getMenuButtonBoundingClientRect();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    // 双列卡片：左右 padding 28rpx + 列间距 24rpx
    const rpx = windowWidth / 750;
    const thumbBoardW = (windowWidth - 28 * 2 * rpx - 24 * rpx) / 2;
    this.setData({
      statusBarHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      inviteId,
      thumbBoardW: Math.max(80, thumbBoardW),
    });
  },

  onShow() {
    this.reloadPages();
    this.measureThumbBoard();
  },

  reloadPages() {
    const draft = loadInviteDraft(this.data.inviteId);
    this.setData(
      {
        workTitle: (draft && draft.title) || '未命名喜帖',
        pages: (draft && draft.pages) || [],
      },
      () => this.measureThumbBoard(),
    );
  },

  /** 量真实缩略图宽，保证字号按小图比例缩小（跟编辑里设的 fontSize 成正比） */
  measureThumbBoard() {
    wx.nextTick(() => {
      this.createSelectorQuery()
        .select('.page-card__thumb')
        .boundingClientRect((rect) => {
          if (!rect || !(rect.width > 0)) return;
          if (Math.abs(rect.width - (this.data.thumbBoardW || 0)) < 0.5) return;
          this.setData({ thumbBoardW: rect.width });
        })
        .exec();
    });
  },

  persist(pages, pageIndex) {
    return saveInviteDraft({
      inviteId: this.data.inviteId,
      title: this.data.workTitle,
      pages,
      pageIndex: pageIndex != null ? pageIndex : 0,
      designAspect: DESIGN_ASPECT,
      meta: { source: 'edit/invite-sheet' },
    });
  },

  onBack() {
    // 固定回总控 invite-pages，不与编辑页抢 navigateBack
    navigateBackToRoute(
      PAGES_ROUTE,
      `${PAGES_URL}?id=${encodeURIComponent(this.data.inviteId)}`
    );
  },

  onBackPress() {
    this.onBack();
    return true;
  },

  openDialog(patch) {
    this.setData({
      dialog: {
        visible: true,
        mode: 'confirm',
        title: '',
        content: '',
        value: '',
        placeholder: '',
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

  onDialogConfirm() {
    const { action, targetIndex } = this.data.dialog;
    this.closeDialog();
    if (action === 'deletePage') {
      const pages = removePageAt(this.data.pages, targetIndex);
      const pageIndex = Math.max(0, Math.min(pages.length - 1, targetIndex - 1));
      this.persist(pages, pageIndex).then(() => {
        this.setData({ pages });
      });
    }
  },
});
