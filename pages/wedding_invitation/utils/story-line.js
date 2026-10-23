/**
 * 故事线：与喜帖同款「多页画布」，功能子集（无模板 / 修饰 / 音乐 / 开屏）
 * - pages: 喜帖页结构 { id, title, bgColor, bgSrc, elements }
 * - 兼容迁移旧 blocks / chapters
 */

import { createTextElement } from '../edit/canvas-model';

export const STORY_STYLE_PAGES = 'pages';
/** @deprecated 旧块列表，仅迁移 */
export const STORY_STYLE_BLOCKS = 'blocks';
/** @deprecated 旧章节，仅迁移 */
export const STORY_STYLE_CHAPTERS = 'chapters';
export const STORY_MAX_PAGES = 8;
/** @deprecated 用 STORY_MAX_PAGES */
export const STORY_MAX_BLOCKS = STORY_MAX_PAGES;

function uid(prefix = 'page') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function legacyTextContent(partial = {}) {
  const parts = [];
  if (partial.title) parts.push(String(partial.title));
  if (partial.date) parts.push(String(partial.date));
  if (partial.body) parts.push(String(partial.body));
  return parts.filter(Boolean).join('\n') || '请输入文案';
}

/** 故事页只保留文字元素（去掉修饰等） */
function storyElements(list) {
  return (list || []).filter((e) => e && e.type === 'text');
}

export function normalizeStoryPage(partial = {}) {
  return {
    id: partial.id || uid('page'),
    title: partial.title || '',
    bgColor: partial.bgColor || '#f7f0ea',
    bgSrc: partial.bgSrc || '',
    elements: storyElements(partial.elements),
  };
}

/** @deprecated 兼容旧调用 */
export function createPhotoBlock(partial = {}) {
  return {
    id: partial.id || uid('ph'),
    type: 'photo',
    photo:
      partial.photo && partial.photo.src
        ? {
            id: partial.photo.id || '',
            src: partial.photo.src,
          }
        : null,
  };
}

/** @deprecated 兼容旧调用 */
export function createTextBlock(partial = {}, opts = {}) {
  const ensureText = opts.ensureText !== false;
  let elements = Array.isArray(partial.elements)
    ? storyElements(partial.elements)
    : [];

  if (!elements.length) {
    const hasLegacy =
      partial.title != null || partial.date != null || partial.body != null;
    if (hasLegacy || ensureText) {
      elements = [
        createTextElement({
          text: hasLegacy ? legacyTextContent(partial) : '请输入文案',
        }),
      ];
    }
  }

  return {
    id: partial.id || uid('tx'),
    type: 'text',
    bgColor: partial.bgColor || '#f7f0ea',
    bgSrc: partial.bgSrc || '',
    elements,
  };
}

/** @deprecated */
export function createBlock(partial = {}) {
  if (partial && partial.type === 'photo') return createPhotoBlock(partial);
  return createTextBlock(partial || {});
}

function chaptersToBlocks(chapters) {
  const out = [];
  (chapters || []).forEach((c) => {
    if (!c) return;
    const layout = c.layout || 'photoText';
    if (layout === 'photo' || layout === 'photoText') {
      out.push(createPhotoBlock({ photo: c.photo }));
    }
    if (layout === 'text' || layout === 'photoText') {
      out.push(
        createTextBlock({
          title: c.title,
          date: c.date,
          body: c.body,
          bgColor: c.bgColor || '#f7f0ea',
        }),
      );
    }
  });
  return out;
}

/** 旧图/文块 → 画布页（相邻图+文合成一页） */
function blocksToPages(blocks) {
  const pages = [];
  const list = blocks || [];
  for (let i = 0; i < list.length; i += 1) {
    const b = list[i];
    if (!b) continue;
    if (b.type === 'photo') {
      const next = list[i + 1];
      if (next && next.type === 'text') {
        pages.push(
          normalizeStoryPage({
            id: next.id || b.id || uid('page'),
            bgSrc: (b.photo && b.photo.src) || '',
            bgColor: next.bgColor || '#f7f0ea',
            elements: next.elements,
            title: '故事',
          }),
        );
        i += 1;
      } else {
        pages.push(
          normalizeStoryPage({
            id: b.id || uid('page'),
            bgSrc: (b.photo && b.photo.src) || '',
            title: '故事',
          }),
        );
      }
    } else {
      pages.push(
        normalizeStoryPage({
          id: b.id || uid('page'),
          bgColor: b.bgColor,
          bgSrc: b.bgSrc,
          elements: b.elements,
          title: '故事',
        }),
      );
    }
  }
  return pages;
}

/** 画布页 → 浏览组件用的「文案块」形态（全屏画布页） */
export function pagesToBrowseBlocks(pages) {
  return (pages || []).map((p) => {
    const page = normalizeStoryPage(p || {});
    return {
      id: page.id,
      type: 'text',
      bgColor: page.bgColor,
      bgSrc: page.bgSrc,
      elements: page.elements,
    };
  });
}

export function normalizeStoryLine(raw) {
  if (!raw || typeof raw !== 'object') {
    return { style: STORY_STYLE_PAGES, pages: [], pageIndex: 0, blocks: [] };
  }

  let pages = [];
  if (Array.isArray(raw.pages) && raw.pages.length) {
    pages = raw.pages.map((p) => normalizeStoryPage(p || {}));
  } else if (Array.isArray(raw.blocks) && raw.blocks.length) {
    pages = blocksToPages(raw.blocks.map((b) => createBlock(b || {})));
  } else if (Array.isArray(raw.chapters) && raw.chapters.length) {
    pages = blocksToPages(chaptersToBlocks(raw.chapters));
  }

  pages = pages.slice(0, STORY_MAX_PAGES);
  const maxIdx = Math.max(pages.length - 1, 0);
  let pageIndex = Number(raw.pageIndex);
  if (!Number.isFinite(pageIndex)) pageIndex = 0;
  pageIndex = Math.max(0, Math.min(maxIdx, pageIndex));

  return {
    style: STORY_STYLE_PAGES,
    pages,
    pageIndex,
    /** 浏览墙仍吃 blocks 形态 */
    blocks: pagesToBrowseBlocks(pages),
  };
}

export function emptyStoryLine() {
  return { style: STORY_STYLE_PAGES, pages: [], pageIndex: 0, blocks: [] };
}

export function blockLabel(block) {
  if (!block) return '空白';
  if (block.type === 'photo') {
    return block.photo && block.photo.src ? '图片' : '图片（空）';
  }
  const els = block.elements || [];
  const textEl = els.find((e) => e && e.type === 'text' && e.text);
  if (textEl && textEl.text) {
    return String(textEl.text).trim().slice(0, 12) || '文案';
  }
  if (block.bgSrc) return '故事页';
  return '空白页';
}

export function pageLabel(page, index) {
  if (page && page.title) return String(page.title);
  return `第${(index || 0) + 1}页`;
}

/** @deprecated 加文暂存，故事线已改为喜帖页流程 */
let stagedTextBlock = null;

export function stageStoryTextBlock(block) {
  stagedTextBlock = block || null;
}

export function takeStagedStoryTextBlock(id) {
  const block = stagedTextBlock;
  if (!block) return null;
  if (id && block.id !== id) return null;
  stagedTextBlock = null;
  return block;
}

/** @deprecated */
export function textBlockToPage(block) {
  const b = createTextBlock(block || {}, { ensureText: true });
  return normalizeStoryPage({
    id: b.id,
    title: '故事',
    bgColor: b.bgColor,
    bgSrc: b.bgSrc,
    elements: b.elements,
  });
}

/** @deprecated */
export function pageToTextBlock(page, blockId) {
  return createTextBlock(
    {
      id: blockId || (page && page.id) || uid('tx'),
      bgColor: (page && page.bgColor) || '#f7f0ea',
      bgSrc: (page && page.bgSrc) || '',
      elements: (page && page.elements) || [],
    },
    { ensureText: false },
  );
}
