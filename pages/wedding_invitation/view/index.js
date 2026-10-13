import {
  loadBlessings,
  saveBlessings,
  getDisplayName,
  createBlessing,
  withTimeText,
} from '~/services/blessing';

const SNAP_RATIO = 0.2;

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    windowWidth: 375,
    tabSliderWidth: 750,
    sliderHeight: 1334,
    panel: 0,
    translateY: 0,
    animating: false,
    showDownHint: true,
    showBackHint: false,
    activeTab: 'bless',
    tabIndex: 0,
    tabTranslateX: 0,
    tabAnimating: false,
    blessVisible: false,
    blessFocus: false,
    blessContent: '',
    keyboardHeight: 0,
    invite: {
      groom: '张晨',
      bride: '李婉',
      dateText: '公历 2026年10月18日 星期六',
      timeText: '午宴 12:08',
      place: '张家大院 · 喜宴厅',
      coverTip: '谨订于喜日恭请您的光临',
    },
    blessings: [],
    stagePhotos: [
      {
        id: 1,
        title: '迎宾门楼',
        desc: '红绸花结 · 喜字高悬',
        tone: 'a',
        tall: true,
      },
      {
        id: 2,
        title: '主舞台全景',
        desc: '灯光矩阵调试完成',
        tone: 'b',
        tall: false,
      },
      {
        id: 3,
        title: '签到桌花艺',
        desc: '香槟玫瑰搭配麦穗',
        tone: 'c',
        tall: false,
      },
      {
        id: 4,
        title: '夜晚灯光秀',
        desc: '收工后实拍 15 秒秀',
        tone: 'd',
        tall: true,
        hasVideo: true,
      },
      {
        id: 5,
        title: '仪式区过道',
        desc: '地毯与两侧花柱',
        tone: 'e',
        tall: false,
      },
      {
        id: 6,
        title: '喜宴席面',
        desc: '桌花与席位卡',
        tone: 'f',
        tall: false,
      },
    ],
  },

  onLoad() {
    const { statusBarHeight, windowHeight, windowWidth } = wx.getWindowInfo();
    this.setData({
      statusBarHeight,
      windowHeight,
      windowWidth,
      tabSliderWidth: windowWidth * 2,
      sliderHeight: windowHeight * 2,
      translateY: 0,
      tabTranslateX: 0,
      blessings: loadBlessings(),
    });
    this._listScrollTop = 0;
    this._touching = false;
    this._pageDragging = false;
    this._startY = 0;
    this._baseY = 0;
    this._contentTouching = false;
    this._contentDir = '';
    this._tabDragging = false;
    this._startX = 0;
    this._baseTabX = 0;
    this._submitting = false;
  },

  onShow() {
    // 每次进入刷新相对时间（今天/昨天等）
    if (this.data.blessings && this.data.blessings.length) {
      this.setData({ blessings: withTimeText(this.data.blessings) });
    }
  },

  onShareAppMessage() {
    const { groom, bride } = this.data.invite;
    return {
      title: `${groom} & ${bride} 的婚礼请柬`,
      path: '/pages/wedding_invitation/view/index',
    };
  },

  clampY(y) {
    const min = -this.data.windowHeight;
    return Math.max(min, Math.min(0, y));
  },

  clampTabX(x) {
    const min = -this.data.windowWidth;
    return Math.max(min, Math.min(0, x));
  },

  syncBackHint(translateY, dragging) {
    const h = this.data.windowHeight;
    const showBackHint = !!(dragging && translateY < -h * 0.55 && translateY > -h + 2);
    if (showBackHint !== this.data.showBackHint) {
      this.setData({ showBackHint });
    }
  },

  setPanel(panel) {
    const h = this.data.windowHeight;
    const translateY = -panel * h;
    this.setData({
      panel,
      translateY,
      animating: true,
      showDownHint: panel === 0,
      showBackHint: false,
    });
    if (panel === 0) this._listScrollTop = 0;
  },

  setTab(tabIndex) {
    const w = this.data.windowWidth;
    const activeTab = tabIndex === 1 ? 'stage' : 'bless';
    this._listScrollTop = 0;
    this.setData({
      tabIndex,
      activeTab,
      tabTranslateX: -tabIndex * w,
      tabAnimating: true,
    });
  },

  goToBelow() {
    this.setPanel(1);
  },

  goToHero() {
    this.setPanel(0);
  },

  onTouchStart(e) {
    this._touching = true;
    this._pageDragging = false;
    this._startY = e.touches[0].clientY;
    this._baseY = -this.data.panel * this.data.windowHeight;
  },

  onTouchMove(e) {
    if (!this._touching) return;
    const dy = e.touches[0].clientY - this._startY;
    if (!this._pageDragging && Math.abs(dy) < 8) return;
    this._pageDragging = true;
    const translateY = this.clampY(this._baseY + dy);
    this.setData({ animating: false, translateY });
    this.syncBackHint(translateY, true);
  },

  onTouchEnd() {
    if (!this._touching) return;
    const wasDragging = this._pageDragging;
    this._touching = false;
    this._pageDragging = false;
    if (!wasDragging) return;

    const h = this.data.windowHeight;
    const y = this.data.translateY;
    const threshold = h * SNAP_RATIO;
    let panel = this.data.panel;

    if (this.data.panel === 0) {
      panel = y < -threshold ? 1 : 0;
    } else {
      panel = y > -h + threshold ? 0 : 1;
    }

    this.setData({
      panel,
      translateY: -panel * h,
      animating: true,
      showDownHint: panel === 0,
      showBackHint: false,
    });
  },

  onListScroll(e) {
    this._listScrollTop = e.detail.scrollTop || 0;
  },

  onContentTouchStart(e) {
    this._contentTouching = true;
    this._contentDir = '';
    this._tabDragging = false;
    this._pageDragging = false;
    this._startX = e.touches[0].clientX;
    this._startY = e.touches[0].clientY;
    this._baseTabX = -this.data.tabIndex * this.data.windowWidth;
    this._baseY = -this.data.panel * this.data.windowHeight;
  },

  onContentTouchMove(e) {
    if (!this._contentTouching) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - this._startX;
    const dy = y - this._startY;

    if (!this._contentDir) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      this._contentDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }

    if (this._contentDir === 'h') {
      this._tabDragging = true;
      const tabTranslateX = this.clampTabX(this._baseTabX + dx);
      this.setData({ tabAnimating: false, tabTranslateX });
      return;
    }

    // 纵向：列表在顶部下拉回封面
    if (this._listScrollTop > 2 && !this._pageDragging) {
      if (this.data.showBackHint) this.setData({ showBackHint: false });
      return;
    }

    if (dy > 0 && this._listScrollTop <= 2) {
      this._pageDragging = true;
      const translateY = this.clampY(this._baseY + dy);
      this.setData({ animating: false, translateY });
      this.syncBackHint(translateY, true);
    } else if (this._pageDragging && dy <= 0) {
      this._pageDragging = false;
      this.setData({
        translateY: this._baseY,
        showBackHint: false,
        showDownHint: false,
      });
    }
  },

  onContentTouchEnd() {
    if (!this._contentTouching) return;
    const dir = this._contentDir;
    const tabDragging = this._tabDragging;
    const pageDragging = this._pageDragging;
    this._contentTouching = false;
    this._contentDir = '';
    this._tabDragging = false;
    this._pageDragging = false;

    if (dir === 'h' && tabDragging) {
      const w = this.data.windowWidth;
      const x = this.data.tabTranslateX;
      const threshold = w * SNAP_RATIO;
      let tabIndex = this.data.tabIndex;

      if (this.data.tabIndex === 0) {
        // 左滑超过 20% → 婚礼现场
        tabIndex = x < -threshold ? 1 : 0;
      } else {
        // 右滑超过 20% → 祝福板
        tabIndex = x > -w + threshold ? 0 : 1;
      }

      this.setTab(tabIndex);
      return;
    }

    if (pageDragging) {
      const h = this.data.windowHeight;
      const y = this.data.translateY;
      const threshold = h * SNAP_RATIO;
      const panel = y > -h + threshold ? 0 : 1;
      this.setData({
        panel,
        translateY: -panel * h,
        animating: true,
        showDownHint: panel === 0,
        showBackHint: false,
      });
    }
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.activeTab) return;
    this._contentTouching = false;
    this._tabDragging = false;
    this.setTab(tab === 'stage' ? 1 : 0);
  },

  noop() {},

  onBless() {
    this.setData({
      blessVisible: true,
      blessFocus: false,
      blessContent: '',
      keyboardHeight: 0,
    });
    // 等弹层出来再拉起键盘，避免焦点丢失
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
    const height = e.detail.height || 0;
    this.setData({ keyboardHeight: height });
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
    // 暂用本地模拟登录名；正式版改为微信昵称 / 用户备注
    const item = createBlessing({ name: getDisplayName(), content });
    const rawList = [item, ...this.data.blessings];
    saveBlessings(rawList);
    const blessings = withTimeText(rawList);

    this.setData({
      blessings,
      blessVisible: false,
      blessFocus: false,
      blessContent: '',
      keyboardHeight: 0,
      activeTab: 'bless',
      tabIndex: 0,
      tabTranslateX: 0,
      tabAnimating: true,
    });

    wx.showToast({ title: '祝福已送达', icon: 'success' });
    setTimeout(() => {
      this._submitting = false;
    }, 400);
  },

  onNav() {
    wx.openLocation({
      latitude: 31.2304,
      longitude: 121.4737,
      name: this.data.invite.place,
      address: '示意地址，正式版接入选点坐标',
      scale: 16,
    });
  },
});
