/**
 * 喜帖草稿本地缓存
 * - 支持多份请帖作品（不同 inviteId）
 * - 每份含 title、pages（页可含 title）、photoWall
 * - 后续对接：按真实 inviteId 读写 / 上传
 */

export const TEMP_INVITE_ID = 'draft_local';

const STORAGE_KEY = 'invite_draft_v1';
const INDEX_KEY = 'invite_work_index_v1';

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

function readIndex() {
  try {
    const raw = wx.getStorageSync(INDEX_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function writeIndex(ids) {
  try {
    wx.setStorageSync(INDEX_KEY, ids);
  } catch (e) {
    console.warn('[invite-draft] setIndex failed', e);
  }
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function normalizeDraft(inviteId, draft) {
  if (!draft || typeof draft !== 'object') return null;
  const pages = Array.isArray(draft.pages)
    ? draft.pages.map((p, i) => ({
        ...p,
        title: (p && p.title) || `第${i + 1}页`,
      }))
    : [];
  return {
    inviteId,
    title: draft.title || '未命名喜帖',
    savedAt: draft.savedAt || 0,
    pages,
    photoWall: Array.isArray(draft.photoWall) ? draft.photoWall : [],
    photoWallLayout: draft.photoWallLayout || 'carousel',
    pageIndex: draft.pageIndex != null ? draft.pageIndex : 0,
    designAspect: Number(draft.designAspect) > 0 ? Number(draft.designAspect) : 0,
    meta: draft.meta || {},
  };
}

/** 兼容旧数据：把已有 draft 编入 index */
function ensureIndexMigrated() {
  const store = readStore();
  let index = readIndex();
  const ids = Object.keys(store);
  if (!ids.length) return;
  if (!index.length) {
    // 旧版只有 draft_local 或散落 key
    index = ids.slice();
    writeIndex(index);
    return;
  }
  let changed = false;
  ids.forEach((id) => {
    if (index.indexOf(id) < 0) {
      index.push(id);
      changed = true;
    }
  });
  if (changed) writeIndex(index);
}

/**
 * @param {string} [inviteId]
 */
export function loadInviteDraft(inviteId = TEMP_INVITE_ID) {
  ensureIndexMigrated();
  const store = readStore();
  return normalizeDraft(inviteId, store[inviteId]);
}

/**
 * 合并写入（未传字段保留原值）
 */
export function saveInviteDraft(payload = {}) {
  const inviteId = payload.inviteId || TEMP_INVITE_ID;
  const store = readStore();
  const prev = store[inviteId] || {};
  const next = {
    inviteId,
    title:
      payload.title != null
        ? String(payload.title).trim() || '未命名喜帖'
        : prev.title || '未命名喜帖',
    savedAt: Date.now(),
    pages: payload.pages != null ? payload.pages : prev.pages || [],
    photoWall: payload.photoWall != null ? payload.photoWall : prev.photoWall || [],
    photoWallLayout:
      payload.photoWallLayout != null
        ? payload.photoWallLayout
        : prev.photoWallLayout || 'carousel',
    pageIndex: payload.pageIndex != null ? payload.pageIndex : prev.pageIndex || 0,
    designAspect:
      payload.designAspect != null && Number(payload.designAspect) > 0
        ? Number(payload.designAspect)
        : prev.designAspect || 0,
    meta: { ...(prev.meta || {}), ...(payload.meta || {}) },
  };
  store[inviteId] = next;
  writeStore(store);

  const index = readIndex();
  if (index.indexOf(inviteId) < 0) {
    index.unshift(inviteId);
    writeIndex(index);
  }

  return Promise.resolve(normalizeDraft(inviteId, next));
}

/** 作品列表摘要（按最近保存） */
export function listInviteWorks() {
  ensureIndexMigrated();
  const store = readStore();
  let index = readIndex();
  // 清理已删
  index = index.filter((id) => store[id]);
  writeIndex(index);

  const list = index
    .map((id) => normalizeDraft(id, store[id]))
    .filter(Boolean)
    .map((d) => {
      const cover = (d.pages && d.pages[0]) || null;
      return {
        inviteId: d.inviteId,
        title: d.title,
        savedAt: d.savedAt,
        pageCount: (d.pages || []).length,
        photoCount: (d.photoWall || []).length,
        coverBgColor: (cover && cover.bgColor) || '#f7f0ea',
        coverBgSrc: (cover && cover.bgSrc) || '',
        coverElements: (cover && cover.elements) || [],
      };
    })
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  return list;
}

/**
 * 新建作品
 * @param {{ title?: string, pages?: Array, mode?: 'custom' | 'template' }} options
 */
export function createInviteWork(options = {}) {
  const inviteId = uid('invite');
  const title = (options.title && String(options.title).trim()) || '未命名喜帖';
  const pages = Array.isArray(options.pages) ? options.pages : [];
  return saveInviteDraft({
    inviteId,
    title,
    pages,
    photoWall: [],
    photoWallLayout: 'carousel',
    pageIndex: 0,
    meta: { mode: options.mode || 'custom' },
  }).then((draft) => {
    const index = readIndex().filter((id) => id !== inviteId);
    index.unshift(inviteId);
    writeIndex(index);
    return draft;
  });
}

export function deleteInviteWork(inviteId) {
  if (!inviteId) return Promise.resolve();
  const store = readStore();
  delete store[inviteId];
  writeStore(store);
  writeIndex(readIndex().filter((id) => id !== inviteId));
  return Promise.resolve();
}

export function renameInviteWork(inviteId, title) {
  return saveInviteDraft({
    inviteId,
    title: (title && String(title).trim()) || '未命名喜帖',
  });
}

/** 更新某一页的 title */
export function renameInvitePage(inviteId, pageIndex, title) {
  const draft = loadInviteDraft(inviteId);
  if (!draft) return Promise.reject(new Error('draft missing'));
  const pages = (draft.pages || []).slice();
  if (pageIndex < 0 || pageIndex >= pages.length) {
    return Promise.reject(new Error('page missing'));
  }
  const name =
    (title && String(title).trim()) || `第${pageIndex + 1}页`;
  pages[pageIndex] = { ...pages[pageIndex], title: name };
  return saveInviteDraft({ inviteId, pages, pageIndex: draft.pageIndex });
}
