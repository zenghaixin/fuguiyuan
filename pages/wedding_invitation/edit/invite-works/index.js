import {
  listInviteWorks,
  deleteInviteWork,
  renameInviteWork,
} from '~/services/invite-draft';
import { navigateBackOne } from '../nav-route';


Page({
  data: {
    statusBarHeight: 20,
    backTop: 48,
    backSize: 32,
    works: [],
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

  onLoad() {
    const { statusBarHeight } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusBarHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
    });
  },

  onShow() {
    this.reload();
  },

  reload() {
    this.setData({ works: listInviteWorks() });
  },

  noop() {},

  /** 多入口（首页 / 我的）→ 只回上一页 */
  onBack() {
    navigateBackOne();
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
