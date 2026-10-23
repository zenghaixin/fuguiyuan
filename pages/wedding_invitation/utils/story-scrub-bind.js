/**
 * 故事线：文字动效 scrubLine ↔ 进度条绑定
 * - 编辑：选中文字 → 动效 →「滑动出字」，写入 el.textAnim
 * - 浏览：progress 0~1 驱动带 scrubLine 的文案逐行显隐
 *
 * 注意：本文件需可被组件 require，同时提供 module.exports 与 export。
 */

/** 与 edit/font-assets TEXT_ANIM_SCRUB_LINE 保持一致 */
const TEXT_ANIM_SCRUB_LINE = 'scrubLine';

/** 与 demo 一致：前段压暗，中段出字 */
const SCRUB_P_VEIL = 0.1;
const SCRUB_P_TEXT_END = 0.9;

function isScrubLineAnim(anim) {
  return anim === TEXT_ANIM_SCRUB_LINE;
}

function splitTextLines(text) {
  return String(text == null ? '' : text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((s) => s.replace(/\s+$/g, ''))
    .filter((s) => s.length > 0);
}

/** 进度 → 出字段 0~1 */
function scrubTextProgressFrom(progress) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  if (p <= SCRUB_P_VEIL) return 0;
  if (p >= SCRUB_P_TEXT_END) return 1;
  return (p - SCRUB_P_VEIL) / (SCRUB_P_TEXT_END - SCRUB_P_VEIL);
}

/**
 * 行显隐：滑到阈值整行亮起
 * @returns {Array<{ text: string, on: boolean }>}
 */
function buildScrubLineStates(lines, textProgress) {
  const list = lines || [];
  const n = list.length || 1;
  const p = Math.max(0, Math.min(1, textProgress || 0));
  return list.map((text, i) => {
    const threshold = i / n;
    const on = p >= threshold && (i > 0 || p > 0.001);
    return { text: text, on: !!on };
  });
}

function pageHasScrubText(block) {
  const els = (block && block.elements) || [];
  return els.some(function (e) {
    return e && e.type === 'text' && isScrubLineAnim(e.textAnim) && e.text;
  });
}

/**
 * 给元素挂上 scrubLines（供浏览 wxml）；非 scrub 文案去掉该字段
 * @param {Array} elements
 * @param {number} progress 本页 0~1
 */
function decorateElementsWithScrub(elements, progress) {
  const textProgress = scrubTextProgressFrom(progress);
  return (elements || []).map(function (el) {
    if (!el || typeof el !== 'object') return el;
    if (el.type !== 'text' || !isScrubLineAnim(el.textAnim)) {
      if (el.scrubLines == null) return el;
      const next = Object.assign({}, el);
      delete next.scrubLines;
      return next;
    }
    const lines = splitTextLines(el.text);
    return Object.assign({}, el, {
      scrubLines: buildScrubLineStates(lines, textProgress),
    });
  });
}

/** 整页/块列表按 progress 装饰 */
function decorateStoryList(list, currentIndex, progressMap) {
  const map = progressMap || {};
  return (list || []).map(function (block, index) {
    if (!block || block.type === 'photo') return block;
    const p = map[index] != null ? map[index] : 0;
    const elements = decorateElementsWithScrub(block.elements, p);
    return Object.assign({}, block, { elements: elements });
  });
}

module.exports = {
  TEXT_ANIM_SCRUB_LINE: TEXT_ANIM_SCRUB_LINE,
  SCRUB_P_VEIL: SCRUB_P_VEIL,
  SCRUB_P_TEXT_END: SCRUB_P_TEXT_END,
  isScrubLineAnim: isScrubLineAnim,
  splitTextLines: splitTextLines,
  scrubTextProgressFrom: scrubTextProgressFrom,
  buildScrubLineStates: buildScrubLineStates,
  pageHasScrubText: pageHasScrubText,
  decorateElementsWithScrub: decorateElementsWithScrub,
  decorateStoryList: decorateStoryList,
};

export {
  TEXT_ANIM_SCRUB_LINE,
  SCRUB_P_VEIL,
  SCRUB_P_TEXT_END,
  isScrubLineAnim,
  splitTextLines,
  scrubTextProgressFrom,
  buildScrubLineStates,
  pageHasScrubText,
  decorateElementsWithScrub,
  decorateStoryList,
};
