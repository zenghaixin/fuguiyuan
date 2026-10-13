import request from '~/api/request';
import useToastBehavior from '~/behaviors/useToast';

Page({
  behaviors: [useToastBehavior],

  data: {
    isLoad: false,
    personalInfo: {},
    assetList: [
      { name: '我的喜帖', icon: 'mail', type: 'invite' },
      { name: '赴宴统计', icon: 'chart-bar', type: 'rsvp' },
      { name: '中奖凭证', icon: 'gift', type: 'prize' },
      { name: '红包记录', icon: 'wallet', type: 'redpack' },
    ],
    settingList: [
      { name: '网盘交片提取码', icon: 'secured', type: 'pan' },
      { name: '联系客服', icon: 'service', type: 'service' },
      { name: '设置', icon: 'setting', type: 'setting', url: '/pages/setting/index' },
    ],
  },

  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 'my' });
    }

    const Token = wx.getStorageSync('access_token');
    if (Token) {
      const personalInfo = await this.getPersonalInfo();
      this.setData({
        isLoad: true,
        personalInfo,
      });
    }
  },

  async getPersonalInfo() {
    try {
      const info = await request('/api/genPersonalInfo').then((res) => res.data.data);
      return info;
    } catch (e) {
      return { name: '主家用户', image: '' };
    }
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onNavigateTo() {
    wx.navigateTo({ url: '/pages/my/info-edit/index' });
  },

  onInvite() {
    wx.showToast({ title: '推荐海报（示意）', icon: 'none' });
  },

  onEleClick(e) {
    const { name, url } = e.currentTarget.dataset.data || {};
    if (url) return;
    this.onShowToast('#t-toast', name || '功能示意');
  },
});
