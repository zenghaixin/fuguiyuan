/**
 * 祝福板领域服务：本地读写、组装展示字段、创建留言
 * 不放通用工具；时间格式化请用 utils/util
 */
import { formatRelativeDateTime } from '~/utils/util';
import { buildDefaultBlessings } from '~/mock/blessing';

const STORAGE_KEY = 'fuguiyuan_blessings_v2';
const PROFILE_NAME_KEY = 'fuguiyuan_profile_name';
const DEFAULT_DISPLAY_NAME = '幸福嘉宾';
const TONES = ['rose', 'gold', 'wine', 'ink', 'peach'];

function pickTone() {
  return TONES[Math.floor(Math.random() * TONES.length)];
}

/** 列表项补充展示用 timeText */
export function withTimeText(list = []) {
  return (list || []).map((item) => ({
    ...item,
    timeText: formatRelativeDateTime(item.createdAt),
  }));
}

export function loadBlessings() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY);
    if (Array.isArray(list) && list.length) {
      return withTimeText(list);
    }
  } catch (e) {
    // ignore
  }
  const defaults = buildDefaultBlessings();
  saveBlessings(defaults);
  return withTimeText(defaults);
}

export function saveBlessings(list) {
  try {
    const raw = (list || []).map(({ timeText, ...rest }) => rest);
    wx.setStorageSync(STORAGE_KEY, raw);
  } catch (e) {
    // ignore
  }
}

/** 当前展示名：优先本地模拟资料，否则默认嘉宾名 */
export function getDisplayName() {
  try {
    const name = wx.getStorageSync(PROFILE_NAME_KEY);
    if (name) return name;
  } catch (e) {
    // ignore
  }
  return DEFAULT_DISPLAY_NAME;
}

export function setDisplayName(name) {
  try {
    wx.setStorageSync(PROFILE_NAME_KEY, (name || '').trim());
  } catch (e) {
    // ignore
  }
}

export function createBlessing({ name, content }) {
  const nick = (name || '').trim();
  const text = (content || '').trim();
  const initial = nick.slice(0, 1) || '宾';
  return {
    id: Date.now(),
    name: nick,
    initial,
    tone: pickTone(),
    createdAt: Date.now(),
    content: text,
  };
}

/** 清空本地祝福并恢复演示数据 */
export function resetBlessingsDemo() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  return loadBlessings();
}
