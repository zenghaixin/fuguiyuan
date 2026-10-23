/**
 * 故事线页列表（对齐喜帖 invite-sheet）
 * 存 draft.storyLine.pages，点缩略图进喜帖同款画布（from=story）
 */
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
import {
  normalizeStoryLine,
  STORY_STYLE_PAGES,
  STORY_MAX_PAGES,
} from '../../utils/story-line';

const PAGES_URL = '/pages/wedding_invitation/edit/invite-pages/index';
const EDIT_URL = '/pages/wedding_invitation/edit/invite/index';

function pageLabel(index) {
  return `第${index + 1}页`;
}

Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    pages: [],
    maxPages: STORY_MAX_PAGES || MAX_INVITE_PAGES,
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
    const story = normalizeStoryLine(draft && draft.storyLine);
    this.setData(
      {
        pages: story.pages || [],
      },
      () => this.measureThumbBoard(),
    );
  },

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
    const list = (pages || []).map((p) => {
      if (!p || typeof p !== 'object') return p;
      const next = { ...p };
      delete next.src;
      return next;
    });
    return saveInviteDraft({
      inviteId: this.data.inviteId,
      storyLine: {
        style: STORY_STYLE_PAGES,
        pages: list,
        pageIndex: pageIndex != null ? pageIndex : 0,
      },
      designAspect: DESIGN_ASPECT,
      meta: { source: 'edit/story-line' },
    });
  },

  onBack() {
    navigateBackToRoute(
      PAGES_ROUTE,
      `${PAGES_URL}?id=${encodeURIComponent(this.data.inviteId)}`,
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
        url: `${EDIT_URL}?id=${this.data.inviteId}&page=${index}&from=story`,
      });
    });
  },

  onAddPage() {
    const cur = this.data.pages || [];
    const max = this.data.maxPages || STORY_MAX_PAGES;
    if (cur.length >= max) {
      wx.showToast({ title: `最多 ${max} 页`, icon: 'none' });
      return;
    }
    const pages = cur.length
      ? appendBlankPage(cur).slice(0, max)
      : [createBlankPage({ title: pageLabel(0) })];
    const pageIndex = pages.length - 1;
    this.persist(pages, pageIndex).then(() => {
      this.setData({ pages });
      wx.navigateTo({
        url: `${EDIT_URL}?id=${this.data.inviteId}&page=${pageIndex}&from=story`,
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
