import { PHOTO_TOOLS } from '../toolbox';
import {
  saveInviteDraft,
  loadInviteDraft,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';
import {
  chooseAndPersistPhotos,
  removeLocalImage,
  MAX_PHOTO_WALL,
  DEFAULT_PHOTO_LAYOUT,
} from '~/services/invite-photo-local';

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    photoWall: [],
    photoWallLayout: DEFAULT_PHOTO_LAYOUT,
    toolboxTools: PHOTO_TOOLS,
    toolboxActive: '',
    uploading: false,
  },

  onLoad(query) {
    const { statusBarHeight, windowHeight } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    const draft = loadInviteDraft(inviteId);
    this.setData({
      statusBarHeight,
      windowHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      inviteId,
      photoWall: (draft && draft.photoWall) || [],
      photoWallLayout:
        (draft && draft.photoWallLayout) || DEFAULT_PHOTO_LAYOUT,
    });
  },

  onShow() {
    const draft = loadInviteDraft(this.data.inviteId);
    if (!draft) return;
    this.setData({
      photoWall: draft.photoWall || [],
      photoWallLayout: draft.photoWallLayout || DEFAULT_PHOTO_LAYOUT,
    });
  },

  onHide() {
    this.persistDraft();
  },

  onUnload() {
    this.persistDraft();
  },

  /** 从页列表进 → 回上一页 */
  onBack() {
    this.persistDraft();
    wx.navigateBack({ delta: 1 });
  },

  persistDraft() {
    return saveInviteDraft({
      inviteId: this.data.inviteId || TEMP_INVITE_ID,
      photoWall: this.data.photoWall,
      photoWallLayout: this.data.photoWallLayout || DEFAULT_PHOTO_LAYOUT,
      meta: { source: 'edit/photo-wall' },
    });
  },

  onToolboxSelect(e) {
    const { key, tool } = e.detail || {};
    if (!key) return;
    this.setData({ toolboxActive: key });

    if (key === 'preview') {
      this.openPreview();
      return;
    }
    if (key === 'upload') {
      this.onAddPhoto();
      return;
    }
    if (key === 'layout') {
      wx.showToast({ title: '排版稍后接，当前为左右滑动', icon: 'none' });
      return;
    }

    wx.showToast({
      title: `${(tool && tool.label) || key}（稍后接）`,
      icon: 'none',
    });
  },

  openPreview() {
    this.setData({ toolboxActive: '' });
    this.persistDraft().then(() => {
      const id = this.data.inviteId || TEMP_INVITE_ID;
      wx.navigateTo({
        url: `/pages/wedding_invitation/view/index?mode=draft&id=${id}`,
      });
    });
  },

  onAddPhoto() {
    if (this.data.uploading) return;
    this.setData({ toolboxActive: 'upload' });
    const cur = this.data.photoWall || [];
    const remain = MAX_PHOTO_WALL - cur.length;
    if (remain <= 0) {
      wx.showToast({ title: `最多 ${MAX_PHOTO_WALL} 张`, icon: 'none' });
      return;
    }

    this.setData({ uploading: true });
    chooseAndPersistPhotos({ count: Math.min(9, remain) })
      .then((added) => {
        if (!added.length) return;
        const photoWall = cur.concat(added);
        this.setData({
          photoWall,
          photoWallLayout:
            this.data.photoWallLayout || DEFAULT_PHOTO_LAYOUT,
        });
        return this.persistDraft().then(() => {
          wx.showToast({ title: `已添加 ${added.length} 张`, icon: 'success' });
        });
      })
      .catch(() => {
        wx.showToast({ title: '添加失败', icon: 'none' });
      })
      .then(() => {
        this.setData({ uploading: false, toolboxActive: '' });
      });
  },

  onDeletePhoto(e) {
    const id = e.detail && e.detail.id;
    if (!id) return;
    const cur = this.data.photoWall || [];
    const target = cur.find((p) => p.id === id);
    const photoWall = cur.filter((p) => p.id !== id);
    this.setData({ photoWall });
    this.persistDraft();
    if (target && target.src) {
      removeLocalImage(target.src);
    }
  },
});
