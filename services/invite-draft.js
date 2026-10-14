/**
 * 喜帖草稿本地缓存
 * 暂无接口：统一临时 inviteId，编辑请帖/照片墙共用同一份草稿
 * 后续对接：按真实 inviteId 读写 / 上传
 */

export const TEMP_INVITE_ID = 'draft_local';

const STORAGE_KEY = 'invite_draft_v1';

function readStore() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

function writeStore(store) {
  try {
    wx.setStorageSync(STORAGE_KEY, store);
  } catch (e) {
    console.warn('[invite-draft] setStorage failed', e);
  }
}

/**
 * @param {string} [inviteId]
 * @returns {{
 *   inviteId: string,
 *   savedAt: number,
 *   pages: Array,
 *   photoWall: Array,
 *   pageIndex: number,
 *   meta: Record<string, any>,
 * } | null}
 */
export function loadInviteDraft(inviteId = TEMP_INVITE_ID) {
  const store = readStore();
  const draft = store[inviteId];
  if (!draft || typeof draft !== 'object') return null;
  return {
    inviteId,
    savedAt: draft.savedAt || 0,
    pages: Array.isArray(draft.pages) ? draft.pages : [],
    photoWall: Array.isArray(draft.photoWall) ? draft.photoWall : [],
    pageIndex: draft.pageIndex != null ? draft.pageIndex : 0,
    meta: draft.meta || {},
  };
}

/**
 * 合并写入（未传字段保留原值）
 * @param {{
 *   inviteId?: string,
 *   pages?: Array,
 *   photoWall?: Array,
 *   pageIndex?: number,
 *   meta?: Record<string, any>,
 * }} payload
 */
export function saveInviteDraft(payload = {}) {
  const inviteId = payload.inviteId || TEMP_INVITE_ID;
  const store = readStore();
  const prev = store[inviteId] || {};
  const next = {
    inviteId,
    savedAt: Date.now(),
    pages: payload.pages != null ? payload.pages : prev.pages || [],
    photoWall: payload.photoWall != null ? payload.photoWall : prev.photoWall || [],
    pageIndex: payload.pageIndex != null ? payload.pageIndex : prev.pageIndex || 0,
    meta: { ...(prev.meta || {}), ...(payload.meta || {}) },
  };
  store[inviteId] = next;
  writeStore(store);
  console.log('[invite-draft] saveInviteDraft', {
    inviteId: next.inviteId,
    pages: (next.pages || []).length,
    photoWall: (next.photoWall || []).length,
  });
  return Promise.resolve(next);
}
