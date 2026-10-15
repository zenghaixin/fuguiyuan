/**
 * 导航约定：
 * - 多入口页：只 navigateBack（上一页是谁就回谁）
 * - 固定入口页：navigateBackToRoute 回到指定父页
 */

/**
 * 返回到栈里指定路由（最近一帧）；栈里没有则 redirectTo。
 * @param {string} route 如 pages/wedding_invitation/edit/invite-works/index
 * @param {string} [fallbackUrl] 栈里没有时的完整路径
 */
export function navigateBackToRoute(route, fallbackUrl) {
  const stack = getCurrentPages() || [];
  let idx = -1;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].route === route) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    wx.redirectTo({ url: fallbackUrl || `/${route}` });
    return;
  }
  const delta = stack.length - 1 - idx;
  if (delta <= 0) return;
  wx.navigateBack({ delta });
}

/** 仅返回上一页（多入口页用） */
export function navigateBackOne() {
  const stack = getCurrentPages() || [];
  if (stack.length > 1) {
    wx.navigateBack({ delta: 1 });
    return;
  }
  wx.switchTab({ url: '/pages/home/index' });
}

export const WORKS_ROUTE = 'pages/wedding_invitation/edit/invite-works/index';
export const WORKS_URL = '/pages/wedding_invitation/edit/invite-works/index';

export const PAGES_ROUTE = 'pages/wedding_invitation/edit/invite-pages/index';
export const INVITE_ROUTE = 'pages/wedding_invitation/edit/invite/index';
