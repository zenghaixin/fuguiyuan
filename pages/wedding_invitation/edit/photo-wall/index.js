import { PHOTO_TOOLS } from '../toolbox';
import {
  saveInviteDraft,
  loadInviteDraft,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    photoWall: [],
    toolboxTools: PHOTO_TOOLS,
    toolboxActive: '',
  },

  onLoad() {
    const { statusBarHeight, windowHeight } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const draft = loadInviteDraft(TEMP_INVITE_ID);
    this.setData({
      statusBarHeight,
      windowHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      inviteId: TEMP_INVITE_ID,
      photoWall: (draft && draft.photoWall) || [],
    });
  },

  onHide() {
    this.persistDraft();
  },

  onUnload() {
    this.persistDraft();
  },

  onBack() {
    this.persistDraft();
    wx.navigateBack({ delta: 1 });
  },

  persistDraft() {
    return saveInviteDraft({
      inviteId: this.data.inviteId || TEMP_INVITE_ID,
      photoWall: this.data.photoWall,
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
    this.setData({ toolboxActive: 'upload' });
    wx.showToast({ title: '照片上传稍后接', icon: 'none' });
  },
});
