/**
 * 新建完成后进入页面列表。
 * 只用 redirectTo 替换当前页，不在这里清整栈；
 * 页列表返回时固定回到「我的喜帖」，中间页一并弹出。
 */
export function enterInvitePagesAfterCreate(inviteId) {
  wx.redirectTo({
    url: `/pages/wedding_invitation/edit/invite-pages/index?id=${inviteId}`,
  });
}
