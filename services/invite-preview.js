/**
 * 浏览页数据组装
 * - draft：本地缓存（编辑预览），不展示留言/婚礼现场
 * - published：正式请帖（后续接口），有数据才展示对应模块
 */

import { loadInviteDraft, TEMP_INVITE_ID } from './invite-draft';

/** 编辑页结构 → 封面组件可用结构 */
export function editPagesToCoverPages(editPages, options = {}) {
  const list = Array.isArray(editPages) ? editPages : [];
  const last = list.length - 1;
  const hasPhotoWall = !!options.hasPhotoWall;
  return list.map((page, i) => {
    const elements = [...(page.elements || [])].sort(
      (a, b) => (Number(a.layer) || 1) - (Number(b.layer) || 1)
    );
    let hint = page.hint;
    if (!hint) {
      if (i >= last) {
        hint = hasPhotoWall ? '上滑查看我们的照片' : '';
      } else {
        hint = '上滑继续阅读喜帖';
      }
    }
    return {
      id: page.id || `p${i + 1}`,
      src: page.src || page.bgSrc || '',
      bgColor: page.bgColor || '#f7f0ea',
      bgSrc: page.bgSrc || '',
      elements,
      hint,
      backHint: page.backHint || '下滑返回',
    };
  });
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
  const mode = query.mode === 'published' ? 'published' : 'draft';

  if (mode === 'draft') {
    const draft = loadInviteDraft(inviteId);
    const photoWall = (draft && draft.photoWall) || [];
    const showPhotoWall = photoWall.length > 0;
    const coverPages = editPagesToCoverPages((draft && draft.pages) || [], {
      hasPhotoWall: showPhotoWall,
    });
    const invitePages = coverPages.length ? coverPages : [blankCoverPage()];
    const moduleCount = 1 + (showPhotoWall ? 1 : 0);
    return {
      inviteId,
      mode,
      invitePages,
      photoWall,
      showPhotoWall,
      showGuestModules: false,
      moduleCount,
      photoModuleIndex: showPhotoWall ? 1 : -1,
      blessModuleIndex: -1,
      designAspect: (draft && draft.designAspect) || 0,
    };
  }

  return {
    inviteId,
    mode: 'published',
    invitePages: null,
    photoWall: null,
    showPhotoWall: true,
    showGuestModules: true,
    moduleCount: 3,
    photoModuleIndex: 1,
    blessModuleIndex: 2,
    designAspect: 0,
  };
}
