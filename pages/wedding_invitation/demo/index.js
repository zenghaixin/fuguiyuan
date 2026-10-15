/**
 * 静态 Demo：此前做好的请柬浏览完整版（封面图 + 照片墙 + 留言/现场）
 * 与编辑草稿预览 view?mode=draft 分离，数据固定走本地 mock
 */
import {
  loadBlessings,
  saveBlessings,
  getDisplayName,
  createBlessing,
  withTimeText,
} from '~/services/blessing';
import { invitePages, photoWall, stagePhotos } from '../view/mock';
import {
  readWindowViewport,
  bindWindowResize,
  unbindWindowResize,
} from '~/services/window-viewport';

const MODULE_COUNT = 3;
const SNAP_RATIO = 0.1;

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    windowWidth: 375,
    backTop: 48,
    backSize: 32,
    moduleIndex: 0,
    moduleTranslateY: 0,
    moduleTrackHeight: 2001,
    moduleAnimating: true,
    blessVisible: false,
    blessFocus: false,
    blessContent: '',
    keyboardHeight: 0,
    invite: {
      groom: '张晨',
      bride: '李婉',
    },
    invitePages,
    photoWall,
    stagePhotos,
    blessings: [],
  },

  onLoad() {
    const viewport = readWindowViewport();
    this.setData({
      ...viewport,
      moduleTrackHeight: viewport.windowHeight * MODULE_COUNT,
      moduleTranslateY: 0,
      blessings: loadBlessings(),
    });
    this._submitting = false;
    this._moduleDragBase = 0;
    bindWindowResize(this, (next) => {
      this.setData({
        ...next,
        moduleTrackHeight: next.windowHeight * MODULE_COUNT,
        moduleTranslateY: -this.data.moduleIndex * next.windowHeight,
      });
    });
  },

  onUnload() {
    unbindWindowResize(this);
  },

  onBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({
      url: '/pages/wedding_invitation/edit/invite-works/index',
    });
  },

  onShow() {
    if (this.data.blessings && this.data.blessings.length) {
      this.setData({ blessings: withTimeText(this.data.blessings) });
    }
  },

  onShareAppMessage() {
    const { groom, bride } = this.data.invite;
    return {
      title: `${groom} & ${bride} 的婚礼请柬（Demo）`,
      path: '/pages/wedding_invitation/demo/index',
    };
  },

  clampModuleY(y) {
    const min = -(MODULE_COUNT - 1) * this.data.windowHeight;
    return Math.max(min, Math.min(0, y));
  },

  setModule(index) {
    const max = MODULE_COUNT - 1;
    const moduleIndex = Math.max(0, Math.min(max, index));
    const h = this.data.windowHeight;
    this.setData({
      moduleIndex,
      moduleTranslateY: -moduleIndex * h,
      moduleAnimating: true,
    });
  },

  onModuleDrag(e) {
    const { phase, dy = 0 } = e.detail || {};
    const h = this.data.windowHeight;

    if (phase === 'start') {
      this._moduleDragBase = -this.data.moduleIndex * h;
      this.setData({ moduleAnimating: false });
      return;
    }

    if (phase === 'move') {
      this.setData({
        moduleAnimating: false,
        moduleTranslateY: this.clampModuleY(this._moduleDragBase + dy),
      });
      return;
    }

    if (phase === 'cancel') {
      this.setModule(this.data.moduleIndex);
      return;
    }

    if (phase === 'end') {
      const threshold = h * SNAP_RATIO;
      let next = this.data.moduleIndex;
      if (dy < -threshold) next += 1;
      else if (dy > threshold) next -= 1;
      this.setModule(next);
    }
  },

  noop() {},

  onBless() {
    this.setData({
      blessVisible: true,
      blessFocus: false,
      blessContent: '',
      keyboardHeight: 0,
    });
    setTimeout(() => {
      this.setData({ blessFocus: true });
    }, 280);
  },

  closeBlessSheet() {
    this.setData({
      blessVisible: false,
      blessFocus: false,
      keyboardHeight: 0,
    });
  },

  onKeyboardHeightChange(e) {
    this.setData({ keyboardHeight: e.detail.height || 0 });
  },

  onBlessContentInput(e) {
    this.setData({ blessContent: e.detail.value });
  },

  onSubmitBless() {
    if (this._submitting) return;

    const content = (this.data.blessContent || '').trim();
    if (!content) {
      wx.showToast({ title: '请写下祝福内容', icon: 'none' });
      return;
    }
    if (content.length < 2) {
      wx.showToast({ title: '祝福再写长一点吧', icon: 'none' });
      return;
    }

    this._submitting = true;
    const item = createBlessing({ name: getDisplayName(), content });
    const rawList = [item, ...this.data.blessings];
    saveBlessings(rawList);

    this.setData({
      blessings: withTimeText(rawList),
      blessVisible: false,
      blessFocus: false,
      blessContent: '',
      keyboardHeight: 0,
    });

    const board = this.selectComponent('#blessBoard');
    if (board && board.showBlessTab) board.showBlessTab();

    wx.showToast({ title: '祝福已送达', icon: 'success' });
    setTimeout(() => {
      this._submitting = false;
    }, 400);
  },
});
