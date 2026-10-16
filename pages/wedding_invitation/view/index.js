import {
  loadBlessings,
  saveBlessings,
  getDisplayName,
  createBlessing,
  withTimeText,
} from '~/services/blessing';
import { resolveInviteViewModel } from '~/services/invite-preview';
import {
  readWindowViewport,
  bindWindowResize,
  unbindWindowResize,
} from '~/services/window-viewport';
import {
  invitePages as mockInvitePages,
  photoWall as mockPhotoWall,
  stagePhotos as mockStagePhotos,
} from './mock';

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
    moduleCount: 1,
    showCover: true,
    showPhotoWall: false,
    showGuestModules: false,
    photoModuleIndex: -1,
    blessModuleIndex: -1,
    hasNextAfterCover: false,
    hasNextAfterPhoto: false,
    /** 草稿预览显示安全区虚线开关 */
    enableSafeGuide: false,
    blessVisible: false,
    blessFocus: false,
    blessContent: '',
    keyboardHeight: 0,
    invite: {
      groom: '张晨',
      bride: '李婉',
    },
    invitePages: mockInvitePages,
    photoWall: [],
    stagePhotos: [],
    blessings: [],
    coverStartPage: 0,
    /** 进入照片墙时的起始张 */
    photoStartIndex: 0,
    photoWallLayout: 'carousel',
  },



  onLoad(query) {
    const viewport = readWindowViewport();

    // 编辑预览显式 mode=draft；直接打开 / 分享默认正式请帖（暂用 mock）
    const mode = (query && query.mode) || 'published';
    const model = resolveInviteViewModel({
      mode,
      inviteId: (query && (query.id || query.inviteId)) || '',
    });

    let invitePages = model.invitePages;
    let photoWall = model.photoWall || [];
    let photoWallLayout = model.photoWallLayout || 'carousel';
    let showCover = true;
    let showPhotoWall = model.showPhotoWall;

    let showGuestModules = model.showGuestModules;
    let moduleCount = model.moduleCount;
    let photoModuleIndex = model.photoModuleIndex;
    let blessModuleIndex = model.blessModuleIndex;
    let stagePhotos = [];
    let blessings = [];
    let enableSafeGuide = mode === 'draft';

    // 正式请帖暂无接口：用本页 mock（含留言/现场）
    if (mode !== 'draft' || invitePages == null) {
      invitePages = mockInvitePages;
      photoWall = mockPhotoWall;
      photoWallLayout = 'carousel';
      stagePhotos = mockStagePhotos;
      showCover = true;
      showPhotoWall = mockPhotoWall.length > 0;

      showGuestModules = true;
      moduleCount = 1 + (showPhotoWall ? 1 : 0) + 1;
      photoModuleIndex = showPhotoWall ? 1 : -1;
      blessModuleIndex = showPhotoWall ? 2 : 1;
      blessings = loadBlessings();
      enableSafeGuide = false;
    }

    // 编辑预览分镜：请帖只看请帖，照片墙只看照片墙
    const startModule = (query && query.module) || '';
    let moduleIndex = 0;
    let moduleTranslateY = 0;
    let photoStartIndex = 0;

    if (mode === 'draft' && startModule === 'invite') {
      showCover = true;
      showPhotoWall = false;
      showGuestModules = false;
      moduleCount = 1;
      photoModuleIndex = -1;
      blessModuleIndex = -1;
      invitePages = (invitePages || []).map((page, i, arr) => {
        if (i < arr.length - 1) return page;
        return { ...page, hint: '' };
      });
    } else if (mode === 'draft' && startModule === 'photo') {
      showCover = false;
      showPhotoWall = (photoWall || []).length > 0;
      showGuestModules = false;
      moduleCount = 1;
      photoModuleIndex = showPhotoWall ? 0 : -1;
      blessModuleIndex = -1;
      photoStartIndex = 0;
      enableSafeGuide = false;
    }

    const coverStartPage = Math.max(
      0,
      Math.min(
        Math.max((invitePages || []).length - 1, 0),
        Number(query && query.page) || 0
      )
    );

    this.setData({
      ...viewport,
      invitePages,
      photoWall,
      photoWallLayout,
      stagePhotos,
      blessings,
      showCover,
      showPhotoWall,
      showGuestModules,
      moduleCount,
      photoModuleIndex,
      blessModuleIndex,
      enableSafeGuide,
      hasNextAfterCover: showCover && (showPhotoWall || showGuestModules),
      hasNextAfterPhoto: showGuestModules,
      moduleTrackHeight: viewport.windowHeight * moduleCount,
      moduleTranslateY,
      moduleIndex,
      coverStartPage,
      photoStartIndex,
    });


    this._submitting = false;
    this._moduleDragBase = 0;
    bindWindowResize(this, (next) => {
      const patch = { ...next };
      patch.moduleTrackHeight = next.windowHeight * this.data.moduleCount;
      // 保持当前模块对齐
      patch.moduleTranslateY = -this.data.moduleIndex * next.windowHeight;
      this.setData(patch);
    });
  },

  onUnload() {
    unbindWindowResize(this);
  },

  onBack() {
    // 大图是浮层不是页面：返回先关看图，再退出预览页
    const wall = this.selectComponent('#photoWall');
    if (wall && typeof wall.closeViewerIfOpen === 'function' && wall.closeViewerIfOpen()) {
      return;
    }
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.switchTab({ url: '/pages/home/index' });
  },

  /** Android 物理返回同上 */
  onBackPress() {
    const wall = this.selectComponent('#photoWall');
    if (wall && typeof wall.closeViewerIfOpen === 'function' && wall.closeViewerIfOpen()) {
      return true;
    }
    return false;
  },


  onShow() {
    if (this.data.showGuestModules && this.data.blessings && this.data.blessings.length) {
      this.setData({ blessings: withTimeText(this.data.blessings) });
    }
  },

  onShareAppMessage() {
    const { groom, bride } = this.data.invite;
    return {
      title: `${groom} & ${bride} 的婚礼请柬`,
      path: '/pages/wedding_invitation/view/index?mode=published',
    };
  },

  clampModuleY(y) {
    const min = -(this.data.moduleCount - 1) * this.data.windowHeight;
    return Math.max(min, Math.min(0, y));
  },

  setModule(index) {
    const max = Math.max(this.data.moduleCount - 1, 0);
    const moduleIndex = Math.max(0, Math.min(max, index));
    const h = this.data.windowHeight;
    this.setData({
      moduleIndex,
      moduleTranslateY: -moduleIndex * h,
      moduleAnimating: true,
    });
  },

  /** 子组件纵向拖动：跟手切换模块 */
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
    if (!this.data.showGuestModules) return;
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
    if (!this.data.showGuestModules || this._submitting) return;

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
