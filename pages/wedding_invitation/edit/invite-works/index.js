import {
  listInviteWorks,
  deleteInviteWork,
  renameInviteWork,
} from '~/services/invite-draft';
import { captureWorksEntry, leaveWorksToEntry } from '../nav-route';


Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
    works: [],
    /** 作品封面小图宽 88rpx → px */
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
      targetId: '',
    },
  },

  onLoad(query) {
    // 记住从哪个 Tab 进来（from 或栈上一页）；reLaunch 后不覆盖
    captureWorksEntry(query);
    const { statusBarHeight, windowWidth } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusBarHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      thumbBoardW: Math.max(40, (88 / 750) * windowWidth),
    });
    // 新建完成后 reLaunch 到此，再打开对应作品的页列表
    const openId = query && query.open;
    if (openId) {
      this._openAfterCreate = openId;
    }
  },

  onShow() {
    this.reload();
    this.measureThumbBoard();
    if (this._openAfterCreate) {
      const id = this._openAfterCreate;
      this._openAfterCreate = '';
      wx.navigateTo({
        url: `/pages/wedding_invitation/edit/invite-pages/index?id=${id}`,
      });
    }
  },


  reload() {
    this.setData({ works: listInviteWorks() });
  },

  measureThumbBoard() {
    wx.nextTick(() => {
      this.createSelectorQuery()
        .select('.work-card__cover')
        .boundingClientRect((rect) => {
          if (!rect || !(rect.width > 0)) return;
          if (Math.abs(rect.width - (this.data.thumbBoardW || 0)) < 0.5) return;
          this.setData({ thumbBoardW: rect.width });
        })
        .exec();
    });
  },

  noop() {},

  /** 多入口：回进入时的 Tab（首页 / 我的）；脏栈不退子页 */
  onBack() {
    leaveWorksToEntry();
  },


  onCreate() {
    wx.navigateTo({
      url: '/pages/wedding_invitation/edit/invite-start/index',
    });
  },

  onOpenWork(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/wedding_invitation/edit/invite-pages/index?id=${id}`,
    });
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
        targetId: '',
        ...patch,
      },
    });
  },

  closeDialog() {
    this.setData({ 'dialog.visible': false });
  },

  onRenameWork(e) {
    const { id, title } = e.currentTarget.dataset;
    if (!id) return;
    this.openDialog({
      mode: 'prompt',
      title: '修改喜帖名称',
      value: title || '',
      placeholder: '请输入名称',
      confirmText: '确定',
      danger: false,
      action: 'rename',
      targetId: id,
    });
  },

  onDeleteWork(e) {
    const { id, title } = e.currentTarget.dataset;
    if (!id) return;
    this.openDialog({
      mode: 'confirm',
      title: '删除喜帖',
      content: `确定删除「${title || '未命名喜帖'}」吗？`,
      confirmText: '删除',
      danger: true,
      action: 'delete',
      targetId: id,
    });
  },

  onDialogCancel() {
    this.closeDialog();
  },

  onDialogConfirm(e) {
    const { action, targetId } = this.data.dialog;
    const value = (e.detail && e.detail.value) || '';
    this.closeDialog();
    if (action === 'rename') {
      renameInviteWork(targetId, value).then(() => this.reload());
      return;
    }
    if (action === 'delete') {
      deleteInviteWork(targetId).then(() => this.reload());
    }
  },
});
