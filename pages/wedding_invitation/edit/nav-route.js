/**
 * 导航约定：
 * - 多入口：记下从哪个 Tab 进来；离开时优先 navigateBack，否则 switchTab 回原入口
 * - 固定父页：navigateBackToRoute（找不到则 reLaunch）
 *
 * 微信不能直接改页面栈，只能 navigateBack(delta) / redirectTo / reLaunch / switchTab。
 * 业界常见做法：入口带 from / 本地记住入口 Tab，脏栈时 switchTab 回原入口（不是死写首页）。
 */

export const WORKS_ROUTE = 'pages/wedding_invitation/edit/invite-works/index';
export const WORKS_URL = '/pages/wedding_invitation/edit/invite-works/index';

export const PAGES_ROUTE = 'pages/wedding_invitation/edit/invite-pages/index';
export const SHEET_ROUTE = 'pages/wedding_invitation/edit/invite-sheet/index';
export const INVITE_ROUTE = 'pages/wedding_invitation/edit/invite/index';

export const HOME_TAB_URL = '/pages/home/index';
export const MY_TAB_URL = '/pages/my/index';

const ENTRY_STORAGE_KEY = 'invite_works_entry_tab';

/** 与 app.json tabBar.list 一致 */
const TAB_ROUTES = [
  'pages/home/index',
  'pages/cases/index',
  'pages/wedding/index',
  'pages/my/index',
];

const FROM_TO_TAB = {
  home: HOME_TAB_URL,
  my: MY_TAB_URL,
  cases: '/pages/cases/index',
  wedding: '/pages/wedding/index',
};

export function isWorksRoute(route) {
  const r = String(route || '');
  return r === WORKS_ROUTE || /invite-works\/index$/.test(r);
}

export function isTabRoute(route) {
  const r = String(route || '').replace(/^\//, '');
  return TAB_ROUTES.indexOf(r) >= 0;
}

export function tabUrlFromRoute(route) {
  const r = String(route || '').replace(/^\//, '');
  if (!isTabRoute(r)) return HOME_TAB_URL;
  return `/${r}`;
}

/** short from → Tab url */
export function tabUrlFromFrom(from) {
  const key = String(from || '').trim().toLowerCase();
  if (FROM_TO_TAB[key]) return FROM_TO_TAB[key];
  if (isTabRoute(from)) return tabUrlFromRoute(from);
  return '';
}

export function fromKeyFromTabUrl(url) {
  const r = String(url || '').replace(/^\//, '');
  if (r === 'pages/my/index') return 'my';
  if (r === 'pages/cases/index') return 'cases';
  if (r === 'pages/wedding/index') return 'wedding';
  return 'home';
}

export function rememberWorksEntry(fromOrRoute) {
  const url = tabUrlFromFrom(fromOrRoute) || tabUrlFromRoute(fromOrRoute);
  if (!url) return;
  try {
    wx.setStorageSync(ENTRY_STORAGE_KEY, url);
  } catch (e) {
    /* ignore */
  }
}

export function getWorksEntryTabUrl() {
  try {
    const saved = wx.getStorageSync(ENTRY_STORAGE_KEY);
    if (saved && isTabRoute(String(saved).replace(/^\//, ''))) {
      return String(saved).indexOf('/') === 0 ? saved : `/${saved}`;
    }
  } catch (e) {
    /* ignore */
  }
  return HOME_TAB_URL;
}

/**
 * 进入「我的喜帖」时调用：query.from 优先；否则若栈底上一页是 Tab 则记下。
 * reLaunch 后栈只剩本页时不覆盖已有记忆。
 */
export function captureWorksEntry(query) {
  if (query && query.from) {
    const url = tabUrlFromFrom(query.from);
    if (url) {
      rememberWorksEntry(url);
      return;
    }
  }
  const stack = getCurrentPages() || [];
  if (stack.length >= 2) {
    const prev = stack[stack.length - 2];
    const prevRoute = (prev && prev.route) || '';
    if (isTabRoute(prevRoute)) {
      rememberWorksEntry(prevRoute);
    }
  }
}

/** 拼 works url，自动带上 from，避免 reLaunch 丢入口 */
export function buildWorksUrl(extraQuery) {
  const from = fromKeyFromTabUrl(getWorksEntryTabUrl());
  const parts = [`from=${encodeURIComponent(from)}`];
  if (extraQuery && typeof extraQuery === 'object') {
    Object.keys(extraQuery).forEach((k) => {
      const v = extraQuery[k];
      if (v == null || v === '') return;
      parts.push(`${k}=${encodeURIComponent(String(v))}`);
    });
  }
  return `${WORKS_URL}?${parts.join('&')}`;
}

/**
 * 返回到栈里指定路由（最近一帧）；找不到或失败则 reLaunch。
 */
export function navigateBackToRoute(route, fallbackUrl) {
  let url = fallbackUrl || (route.indexOf('/') === 0 ? route : `/${route}`);
  if (route === WORKS_ROUTE || isWorksRoute(route)) {
    url = buildWorksUrl();
  }
  const stack = getCurrentPages() || [];
  let idx = -1;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const r = stack[i].route || '';
    if (
      r === route ||
      (route === WORKS_ROUTE && isWorksRoute(r)) ||
      r === route.replace(/^\//, '')
    ) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    wx.reLaunch({ url });
    return;
  }
  const delta = stack.length - 1 - idx;
  if (delta <= 0) return;
  wx.navigateBack({
    delta,
    fail() {
      wx.reLaunch({ url });
    },
  });
}

/** 仅返回上一页；栈只剩一页时回记住的入口 Tab */
export function navigateBackOne() {
  const stack = getCurrentPages() || [];
  if (stack.length > 1) {
    wx.navigateBack({ delta: 1 });
    return;
  }
  wx.switchTab({ url: getWorksEntryTabUrl() });
}

/**
 * 「我的喜帖」离开：上一页是 Tab 则 navigateBack；
 * 否则 switchTab 回进入时记下的入口（首页 / 我的 …），不退子页、也不误回错 Tab。
 */
export function leaveWorksToEntry() {
  const stack = getCurrentPages() || [];
  if (stack.length > 1) {
    const prev = stack[stack.length - 2];
    const prevRoute = (prev && prev.route) || '';
    if (isTabRoute(prevRoute)) {
      rememberWorksEntry(prevRoute);
      wx.navigateBack({ delta: 1 });
      return;
    }
  }
  wx.switchTab({ url: getWorksEntryTabUrl() });
}
