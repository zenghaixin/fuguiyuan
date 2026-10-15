/** 旧入口兼容：作品前置后统一进「我的喜帖」 */

Page({
  onLoad() {
    wx.redirectTo({
      url: '/pages/wedding_invitation/edit/invite-works/index',
    });
  },
});
