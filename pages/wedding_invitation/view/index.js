import {
  loadBlessings,
  saveBlessings,
  getDisplayName,
  createBlessing,
  withTimeText,
} from '~/services/blessing';
import {
  resolveInviteViewModel,
  editPagesToCoverPages,
  takeDraftPreviewSnap,
} from '~/services/invite-preview';
import { loadInviteDraft } from '~/services/invite-draft';
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
    showStory: false,
    showPhotoWall: false,
    showGuestModules: false,
    storyModuleIndex: -1,
    photoModuleIndex: -1,
    blessModuleIndex: -1,
    hasNextAfterCover: false,
    hasNextAfterStory: false,
    hasNextAfterPhoto: false,
    storyChapters: [],
    storyStartIndex: 0,
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
    // 勿默认 mock：草稿预览首帧否则会闪/卡住 demo 大图
    invitePages: [],
    photoWall: [],
    stagePhotos: [],
    blessings: [],
    coverStartPage: 0,
    /** 进入照片墙时的起始张 */
    photoStartIndex: 0,
    photoWallLayout: 'carousel',
  },

  /** 把编辑画布 pages 套成封面结构（草稿专用，无 demo src） */
  _coverFromEditPages(editPages, opts = {}) {
    const coverPages = editPagesToCoverPages(editPages || [], opts);
    return coverPages.length
      ? coverPages
      : [
          {
            id: 'blank',
            src: '',
            bgColor: '#f7f0ea',
            bgSrc: '',
            elements: [],
            hint: '',
            backHint: '下滑返回',
          },
        ];
  },

  onLoad(query) {
    const viewport = readWindowViewport();

    // 编辑预览：mode=draft 或带 module；否则正式请帖（暂用 mock）
    const startModule = (query && query.module) || '';
    const inviteId = (query && (query.id || query.inviteId)) || '';
    const mode =
      (query && query.mode) === 'draft' ||
      startModule === 'invite' ||
      startModule === 'story' ||
      startModule === 'photo'
        ? 'draft'
        : 'published';

    let invitePages = [];
    let photoWall = [];
    let photoWallLayout = 'carousel';
    let storyChapters = [];
    let showCover = true;
    let showStory = false;
    let showPhotoWall = false;
    let showGuestModules = false;
    let moduleCount = 1;
    let storyModuleIndex = -1;
    let photoModuleIndex = -1;
    let blessModuleIndex = -1;
    let stagePhotos = [];
    let blessings = [];
    let enableSafeGuide = false;

    if (mode === 'draft') {
      // 1) 编辑页 eventChannel 直传 2) 预览快照 3) 本地草稿 —— 绝不走 mock
      const draft = loadInviteDraft(inviteId);
      const snap = takeDraftPreviewSnap(inviteId);
      let editPages =
        (snap && Array.isArray(snap.pages) && snap.pages.length
          ? snap.pages
          : null) ||
        (draft && draft.pages) ||
        [];

      photoWall = (draft && draft.photoWall) || [];
      photoWallLayout = (draft && draft.photoWallLayout) || 'carousel';
      if (photoWallLayout === 'grid') photoWallLayout = 'grid4';
      storyChapters =
        (draft && draft.storyLine && draft.storyLine.chapters) || [];
      const showPhotoWallDraft = photoWall.length > 0;
      const showStoryDraft = storyChapters.length > 0;

      invitePages = this._coverFromEditPages(editPages, {
        hasStory: showStoryDraft,
        hasPhotoWall: showPhotoWallDraft,
      });

      showCover = true;
      showStory = showStoryDraft;
      showPhotoWall = showPhotoWallDraft;
      showGuestModules = false;
      moduleCount = 1;
      if (showStory) {
        storyModuleIndex = moduleCount;
        moduleCount += 1;
      }
      if (showPhotoWall) {
        photoModuleIndex = moduleCount;
        moduleCount += 1;
      }
      enableSafeGuide = true;

      // 编辑页 navigateTo success 里会再推一份，防止存储时序问题
      try {
        const ec =
          typeof this.getOpenerEventChannel === 'function'
            ? this.getOpenerEventChannel()
            : null;
        if (ec && typeof ec.on === 'function') {
          ec.on('previewDraft', (payload) => {
            if (!payload || !Array.isArray(payload.pages)) return;
            const pages = this._coverFromEditPages(payload.pages, {
              hasStory: false,
              hasPhotoWall: false,
            });
            const mapped =
              startModule === 'invite'
                ? pages.map((page, i, arr) =>
                    i < arr.length - 1 ? page : { ...page, hint: '' }
                  )
                : pages;
            this.setData({
              invitePages: mapped,
              coverStartPage: Math.max(
                0,
                Math.min(
                  Math.max(mapped.length - 1, 0),
                  Number(payload.pageIndex) || 0
                )
              ),
            });
          });
        }
      } catch (e) {
        /* ignore */
      }
    } else {
      // 正式请帖暂无接口：mock
      const model = resolveInviteViewModel({
        mode: 'published',
        inviteId,
      });
      invitePages = model.invitePages;
      if (invitePages == null) {
        invitePages = mockInvitePages;
        photoWall = mockPhotoWall;
        photoWallLayout = 'carousel';
        stagePhotos = mockStagePhotos;
        showCover = true;
        showStory = false;
        showPhotoWall = mockPhotoWall.length > 0;
        showGuestModules = true;
        moduleCount = 1 + (showPhotoWall ? 1 : 0) + 1;
        storyModuleIndex = -1;
        photoModuleIndex = showPhotoWall ? 1 : -1;
        blessModuleIndex = showPhotoWall ? 2 : 1;
        blessings = loadBlessings();
      }
      enableSafeGuide = false;
    }

    // 编辑预览分镜：可只看某一模块
    let moduleIndex = 0;
    let moduleTranslateY = 0;
    let photoStartIndex = 0;
    let storyStartIndex = 0;

    if (mode === 'draft' && startModule === 'invite') {
      showCover = true;
      showStory = false;
      showPhotoWall = false;
      showGuestModules = false;
      moduleCount = 1;
      storyModuleIndex = -1;
      photoModuleIndex = -1;
      blessModuleIndex = -1;
      invitePages = (invitePages || []).map((page, i, arr) => {
        if (i < arr.length - 1) return page;
        return { ...page, hint: '' };
      });
    } else if (mode === 'draft' && startModule === 'story') {
      showCover = false;
      showStory = storyChapters.length > 0;
      showPhotoWall = false;
      showGuestModules = false;
      moduleCount = showStory ? 1 : 0;
      storyModuleIndex = showStory ? 0 : -1;
      photoModuleIndex = -1;
      blessModuleIndex = -1;
      storyStartIndex = 0;
      enableSafeGuide = false;
    } else if (mode === 'draft' && startModule === 'photo') {
      showCover = false;
      showStory = false;
      showPhotoWall = (photoWall || []).length > 0;
      showGuestModules = false;
      moduleCount = showPhotoWall ? 1 : 0;
      storyModuleIndex = -1;
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

    const hasNextAfterCover =
      showCover && (showStory || showPhotoWall || showGuestModules);
    const hasNextAfterStory =
      showStory && (showPhotoWall || showGuestModules);
    const hasNextAfterPhoto = showGuestModules;

    this.setData({
      ...viewport,
      invitePages,
      photoWall,
      photoWallLayout,
      storyChapters,
      stagePhotos,
      blessings,
      showCover,
      showStory,
      showPhotoWall,
      showGuestModules,
      moduleCount: Math.max(1, moduleCount),
      storyModuleIndex,
      photoModuleIndex,
      blessModuleIndex,
      enableSafeGuide,
      hasNextAfterCover,
      hasNextAfterStory,
      hasNextAfterPhoto,
      moduleTrackHeight: viewport.windowHeight * Math.max(1, moduleCount),
      moduleTranslateY,
      moduleIndex,
      coverStartPage,
      photoStartIndex,
      storyStartIndex,
    });

    this._submitting = false;
    this._moduleDragBase = 0;
    bindWindowResize(this, (next) => {
      const patch = { ...next };
      patch.moduleTrackHeight = next.windowHeight * this.data.moduleCount;
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
