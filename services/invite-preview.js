/**
 * 浏览页数据组装
 * - draft：本地缓存（编辑预览），不展示留言/婚礼现场
 * - published：正式请帖（后续接口），有数据才展示对应模块
 */

import { loadInviteDraft, TEMP_INVITE_ID } from './invite-draft';
import { normalizeStoryLine } from '../pages/wedding_invitation/utils/story-line';

/** 编辑页结构 → 封面组件可用结构 */
export function editPagesToCoverPages(editPages, options = {}) {
  const list = Array.isArray(editPages) ? editPages : [];
  const last = list.length - 1;
  const hasStory = !!options.hasStory;
  const hasPhotoWall = !!options.hasPhotoWall;
  return list.map((page, i) => {
    const elements = [...(page.elements || [])].sort(
      (a, b) => (Number(a.layer) || 1) - (Number(b.layer) || 1)
    );
    let hint = page.hint;
    if (!hint) {
      if (i >= last) {
        if (hasStory) hint = '上滑查看我们的故事';
        else if (hasPhotoWall) hint = '上滑查看我们的照片';
        else hint = '';
      } else {
        hint = '上滑继续阅读喜帖';
      }
    }
    // 编辑画布预览：只用 bgColor + bgSrc + elements，绝不用整页 src（那是正式 demo 大图字段）
    return {
      id: page.id || `p${i + 1}`,
      src: '',
      bgColor: page.bgColor || '#f7f0ea',
      bgSrc: page.bgSrc || '',
      elements,
      hint,
      backHint: page.backHint || '下滑返回',
    };
  });
}

const PREVIEW_SNAP_KEY = 'invite_edit_preview_snap_v1';

/** 编辑页点预览前写入，浏览页优先读，避免落到 demo */
export function writeDraftPreviewSnap(payload = {}) {
  try {
    wx.setStorageSync(PREVIEW_SNAP_KEY, {
      inviteId: payload.inviteId || TEMP_INVITE_ID,
      pages: Array.isArray(payload.pages) ? payload.pages : [],
      pageIndex: payload.pageIndex != null ? Number(payload.pageIndex) || 0 : 0,
      at: Date.now(),
    });
  } catch (e) {
    console.warn('[invite-preview] write snap failed', e);
  }
}

export function takeDraftPreviewSnap(inviteId) {
  try {
    const snap = wx.getStorageSync(PREVIEW_SNAP_KEY);
    if (!snap || typeof snap !== 'object') return null;
    const id = inviteId || TEMP_INVITE_ID;
    if (snap.inviteId && snap.inviteId !== id) return null;
    if (Date.now() - (snap.at || 0) > 120000) return null;
    wx.removeStorageSync(PREVIEW_SNAP_KEY);
    return snap;
  } catch (e) {
    return null;
  }
}

function blankCoverPage() {
  return {
    id: 'blank',
    src: '',
    bgColor: '#f7f0ea',
    bgSrc: '',
    elements: [],
    hint: '已经是最后一页',
    backHint: '下滑返回',
  };
}

/**
 * @param {{ inviteId?: string, mode?: 'draft' | 'published' }} query
 */
export function resolveInviteViewModel(query = {}) {
  const inviteId = query.inviteId || query.id || TEMP_INVITE_ID;
  // 带 module=invite|story|photo 一律按草稿预览，禁止走正式 demo
  const module = query.module || '';
  const forceDraft =
    module === 'invite' || module === 'story' || module === 'photo';
  const mode =
    query.mode === 'published' && !forceDraft ? 'published' : 'draft';

  if (mode === 'draft') {
    const draft = loadInviteDraft(inviteId);
    const editPages = (draft && draft.pages) || [];
    const photoWall = (draft && draft.photoWall) || [];
    const showPhotoWall = photoWall.length > 0;
    let photoWallLayout = (draft && draft.photoWallLayout) || 'carousel';
    if (photoWallLayout === 'grid') photoWallLayout = 'grid4';
    if (photoWallLayout === 'grid4' && photoWall.length > 4) {
      photoWallLayout = 'carousel';
    }
    if (photoWallLayout === 'grid9' && photoWall.length > 9) {
      photoWallLayout = 'carousel';
    }

    const storyLine = normalizeStoryLine(draft && draft.storyLine);
    const showStory = (storyLine.chapters || []).length > 0;

    const coverPages = editPagesToCoverPages(editPages, {
      hasStory,
      hasPhotoWall: showPhotoWall,
    });
    const invitePages = coverPages.length ? coverPages : [blankCoverPage()];

    // 封面 → 故事线 → 照片墙
    let moduleCount = 1;
    let storyModuleIndex = -1;
    let photoModuleIndex = -1;
    if (showStory) {
      storyModuleIndex = moduleCount;
      moduleCount += 1;
    }
    if (showPhotoWall) {
      photoModuleIndex = moduleCount;
      moduleCount += 1;
    }

    return {
      inviteId,
      mode,
      invitePages,
      photoWall,
      photoWallLayout,
      storyLine,
      showStory,
      showPhotoWall,
      showGuestModules: false,
      moduleCount,
      storyModuleIndex,
      photoModuleIndex,
      blessModuleIndex: -1,
      designAspect: (draft && draft.designAspect) || 0,
    };
  }

  return {
    inviteId,
    mode: 'published',
    invitePages: null,
    photoWall: null,
    photoWallLayout: 'carousel',
    storyLine: { style: 'chapters', chapters: [] },
    showStory: false,
    showPhotoWall: true,
    showGuestModules: true,
    moduleCount: 3,
    storyModuleIndex: -1,
    photoModuleIndex: 1,
    blessModuleIndex: 2,
    designAspect: 0,
  };
}
