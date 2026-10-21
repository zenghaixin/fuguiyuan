import {
  loadInviteDraft,
  saveInviteDraft,
  renameInviteWork,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';
import { DESIGN_ASPECT } from '~/services/invite-canvas';
import { writeDraftPreviewSnap } from '~/services/invite-preview';
import { navigateBackToRoute, WORKS_ROUTE, WORKS_URL } from '../nav-route';
import { normalizeStoryLine } from '../../utils/story-line';

Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    workTitle: '未命名喜帖',
    modules: [],
    coverPage: null,
    coverThumbSrc: '',
    photoCoverSrc: '',
    /** 模块封面小图宽 88rpx → px */
    thumbBoardW: 44,
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
    },
  },

  onLoad(query) {
    const { statusBarHeight, windowWidth } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    this.setData({
      statusBarHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      inviteId,
      thumbBoardW: Math.max(40, (88 / 750) * windowWidth),
    });
  },

  onShow() {
    this.reloadHub();
    this.measureThumbBoard();
  },

  measureThumbBoard() {
    wx.nextTick(() => {
      this.createSelectorQuery()
        .select('.mod-card__cover')
        .boundingClientRect((rect) => {
          if (!rect || !(rect.width > 0)) return;
          if (Math.abs(rect.width - (this.data.thumbBoardW || 0)) < 0.5) return;
          this.setData({ thumbBoardW: rect.width });
        })
        .exec();
    });
  },

  reloadHub() {
    const draft = loadInviteDraft(this.data.inviteId);
    const pages = (draft && draft.pages) || [];
    const photos = (draft && draft.photoWall) || [];
    const chapters =
      (normalizeStoryLine(draft && draft.storyLine).chapters) || [];
    const coverPage = pages[0] || null;
    const photoCoverSrc =
      (photos[0] && photos[0].src) || '';

    const modules = [
      {
        key: 'invite',
        name: '喜帖',
        meta: pages.length ? `${pages.length} 页` : '尚未添加页面',
        tone: 'red',
        icon: 'mail',
      },
      {
        key: 'story',
        name: '故事线',
        meta: chapters.length
          ? `${chapters.length} 章`
          : '可选 · 讲述你们的故事',
        tone: 'rose',
        icon: 'heart',
      },
      {
        key: 'photo',
        name: '照片墙',
        meta: photos.length
          ? `${photos.length} 张`
          : '可选 · 合影与瞬间',
        tone: 'gold',
        icon: 'image',
      },
    ];

    this.setData({
      workTitle: (draft && draft.title) || '未命名喜帖',
      modules,
      coverPage,
      coverThumbSrc: (draft && draft.coverThumbSrc) || '',
      photoCoverSrc,
      pageCount: pages.length,
    });
  },

  persistPagesHint() {
    const draft = loadInviteDraft(this.data.inviteId) || {};
    return saveInviteDraft({
      ...draft,
      inviteId: this.data.inviteId,
      title: this.data.workTitle,
      pages: draft.pages || [],
      photoWall: draft.photoWall || [],
      photoWallLayout: draft.photoWallLayout || 'carousel',
      pageIndex: draft.pageIndex || 0,
      designAspect: DESIGN_ASPECT,
      meta: { ...(draft.meta || {}), source: 'edit/invite-pages' },
    });
  },

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

  onDialogCancel() {
    this.closeDialog();
  },

  onDialogConfirm(e) {
    const { action } = this.data.dialog;
    const value = (e.detail && e.detail.value) || '';
    this.closeDialog();
    if (action === 'renameWork') {
      renameInviteWork(this.data.inviteId, value).then((draft) => {
        this.setData({ workTitle: draft.title });
      });
    }
  },

  onOpenModule(e) {
    const key = e.currentTarget.dataset.key;
    const id = this.data.inviteId;
    if (key === 'invite') {
      wx.navigateTo({
        url: `/pages/wedding_invitation/edit/invite-sheet/index?id=${id}`,
      });
      return;
    }
    if (key === 'story') {
      wx.navigateTo({
        url: `/pages/wedding_invitation/edit/story-line/index?id=${id}`,
      });
      return;
    }
    if (key === 'photo') {
      wx.navigateTo({
        url: `/pages/wedding_invitation/edit/photo-wall/index?id=${id}`,
      });
    }
  },

  onPreviewAll() {
    if (!this.data.pageCount) {
      wx.showToast({ title: '请先添加喜帖页', icon: 'none' });
      return;
    }
    const id = this.data.inviteId;
    this.persistPagesHint().then(() => {
      const draft = loadInviteDraft(id);
      const pages = (draft && draft.pages) || [];
      writeDraftPreviewSnap({
        inviteId: id,
        pages,
        pageIndex: 0,
      });
      wx.navigateTo({
        url: `/pages/wedding_invitation/view/index?mode=draft&id=${encodeURIComponent(id)}&module=invite`,
        success(res) {
          if (res.eventChannel && typeof res.eventChannel.emit === 'function') {
            res.eventChannel.emit('previewDraft', {
              inviteId: id,
              pages,
              pageIndex: 0,
            });
          }
        },
      });
    });
  },

  noop() {},
});
