/** 故事线：章节卡片数据 */

export const STORY_STYLE_CHAPTERS = 'chapters';
export const STORY_MAX_CHAPTERS = 12;

export const STORY_LAYOUTS = [
  { key: 'photoText', label: '图文', desc: '上图下文' },
  { key: 'text', label: '纯文', desc: '文字铺满，可设背景' },
  { key: 'photo', label: '纯图', desc: '整页一张图' },
];

function uid() {
  return `ch_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export function createChapter(partial = {}) {
  return {
    id: partial.id || uid(),
    layout: partial.layout || 'photoText',
    title: partial.title != null ? String(partial.title) : '新的一章',
    date: partial.date != null ? String(partial.date) : '',
    body: partial.body != null ? String(partial.body) : '',
    photo: partial.photo && partial.photo.src
      ? {
          id: partial.photo.id || '',
          src: partial.photo.src,
        }
      : null,
    bgColor: partial.bgColor || '#f7f0ea',
    bgSrc: partial.bgSrc || '',
  };
}

export function normalizeStoryLine(raw) {
  if (!raw || typeof raw !== 'object') {
    return { style: STORY_STYLE_CHAPTERS, chapters: [] };
  }
  const chapters = Array.isArray(raw.chapters)
    ? raw.chapters.map((c) => createChapter(c || {})).filter(Boolean)
    : [];
  return {
    style: raw.style || STORY_STYLE_CHAPTERS,
    chapters: chapters.slice(0, STORY_MAX_CHAPTERS),
  };
}

export function emptyStoryLine() {
  return { style: STORY_STYLE_CHAPTERS, chapters: [] };
}

export function layoutHasPhoto(layout) {
  return layout === 'photoText' || layout === 'photo';
}

export function layoutHasText(layout) {
  return layout === 'photoText' || layout === 'text';
}

export function layoutNeedsBg(layout) {
  return layout === 'text';
}
