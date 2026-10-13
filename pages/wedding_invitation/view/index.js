const SNAP_RATIO = 0.3;

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    sliderHeight: 1334,
    panel: 0,
    translateY: 0,
    animating: false,
    showDownHint: true,
    showBackHint: false,
    activeTab: 'bless',
    invite: {
      groom: '张晨',
      bride: '李婉',
      dateText: '公历 2026年10月18日 星期六',
      timeText: '午宴 12:08',
      place: '张家大院 · 喜宴厅',
      coverTip: '谨订于喜日恭请您的光临',
    },
    blessings: [
      {
        id: 1,
        name: '王阿姨',
        initial: '王',
        tone: 'rose',
        time: '昨天 21:16',
        content: '晨晨长大了也要结婚啦！祝福你们白头偕老，甜甜蜜蜜，早生贵子！',
      },
      {
        id: 2,
        name: '小学同学·阿杰',
        initial: '杰',
        tone: 'gold',
        time: '昨天 19:42',
        content: '兄弟终于修成正果，新房我先订好位置了，红包准备好，人一定到！',
      },
      {
        id: 3,
        name: '婉儿闺蜜团',
        initial: '婉',
        tone: 'wine',
        time: '昨天 18:05',
        content: '我们的小公主出嫁啦～愿你们岁岁年年，眼里都是彼此。婚礼见！💐',
      },
      {
        id: 4,
        name: '堂哥大强',
        initial: '强',
        tone: 'ink',
        time: '前天 22:31',
        content: '门当户对，天作之合。台上风光我们都帮衬着，好好过日子最要紧。',
      },
      {
        id: 5,
        name: '邻居张婶',
        initial: '婶',
        tone: 'peach',
        time: '前天 16:18',
        content: '大院里又办喜事，热闹！祝福小两口和和美美，家宅平安。',
      },
      {
        id: 6,
        name: '发小阿峰',
        initial: '峰',
        tone: 'rose',
        time: '3天前',
        content: '从光屁股玩到娶媳妇，不容易。幸福就好，酒我多喝两杯！',
      },
    ],
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
    const { statusBarHeight, windowHeight } = wx.getWindowInfo();
    this.setData({
      statusBarHeight,
      windowHeight,
      sliderHeight: windowHeight * 2,
      translateY: 0,
    });
    this._listScrollTop = 0;
    this._touching = false;
    this._pageDragging = false;
    this._startY = 0;
    this._baseY = 0;
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

  /** 回到封面仅在往回滑时出现；下滑提示等完全进入留言页再藏 */
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

  goToBelow() {
    this.setPanel(1);
  },

  goToHero() {
    this.setPanel(0);
  },

  onTouchStart(e) {
    this._touching = true;
    this._pageDragging = true;
    this._startY = e.touches[0].clientY;
    this._baseY = -this.data.panel * this.data.windowHeight;
    this.setData({ animating: false });
  },

  onTouchMove(e) {
    if (!this._pageDragging) return;
    const dy = e.touches[0].clientY - this._startY;
    const translateY = this.clampY(this._baseY + dy);
    this.setData({ translateY });
    this.syncBackHint(translateY, true);
  },

  onTouchEnd() {
    if (!this._pageDragging && !this._touching) return;
    this._touching = false;
    this._pageDragging = false;

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
      // 只有完全落到留言页才隐藏下滑提示
      showDownHint: panel === 0,
      showBackHint: false,
    });
  },

  onListScroll(e) {
    this._listScrollTop = e.detail.scrollTop || 0;
  },

  onListTouchStart(e) {
    this._touching = true;
    this._startY = e.touches[0].clientY;
    this._baseY = -this.data.panel * this.data.windowHeight;
    this._pageDragging = this._listScrollTop <= 2;
    if (this._pageDragging) {
      this.setData({ animating: false });
    }
  },

  onListTouchMove(e) {
    const dy = e.touches[0].clientY - this._startY;

    // 列表不在顶部：正常滚留言，不切屏，也不出「回到封面」
    if (this._listScrollTop > 2 && !this._pageDragging) {
      if (this.data.showBackHint) this.setData({ showBackHint: false });
      return;
    }

    // 在顶部且继续下拉：跟手切回封面，并显示「回到封面」
    if (dy > 0 && this._listScrollTop <= 2) {
      this._pageDragging = true;
      const translateY = this.clampY(this._baseY + dy);
      this.setData({
        animating: false,
        translateY,
      });
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

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    this._listScrollTop = 0;
  },

  onBless() {
    wx.showToast({ title: '写下祝福（示意）', icon: 'none' });
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
