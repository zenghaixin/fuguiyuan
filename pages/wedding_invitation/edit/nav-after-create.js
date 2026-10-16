import { buildWorksUrl } from './nav-route';

/**
 * 新建完成后进入页面列表。
 * reLaunch 到「我的喜帖」并带 open=id + from，由作品列表再 navigateTo 页列表。
 * from 保证清栈后仍能回到原来的 Tab（首页 / 我的），而不是死写首页。
 */
export function enterInvitePagesAfterCreate(inviteId) {
  if (!inviteId) return;
  wx.reLaunch({
    url: buildWorksUrl({ open: inviteId }),
  });
}
