/** 请帖编辑画布：页 / 元素模型（坐标为相对画布 0–1） */

let _seq = 0;
function uid(prefix) {
  _seq += 1;
  return `${prefix}_${Date.now()}_${_seq}`;
}

/** 请帖最多页数 */
export const MAX_INVITE_PAGES = 8;

/**
 * 空白占位页（对接模板后只换 bgSrc / bgColor）
 * @param {{ title?: string, bgColor?: string }} [opts]
 */
export function createBlankPage(opts = {}) {
  return {
    id: uid('page'),
    title: opts.title || '第1页',
    bgColor: opts.bgColor || '#f7f0ea',
    bgSrc: '',
    elements: [],
  };
}

/** 末尾追加空白页；已满则原样返回 */
export function appendBlankPage(pages) {
  const list = Array.isArray(pages) ? pages.slice() : [];
  if (list.length >= MAX_INVITE_PAGES) return list;
  const n = list.length;
  list.push(
    createBlankPage({
      title: `第${n + 1}页`,
    })
  );
  return list;
}

/** 简易模板：多页占位 */
export function createTemplatePages() {
  return [
    createBlankPage({ title: '第1页', bgColor: '#f7f0ea' }),
    createBlankPage({ title: '第2页', bgColor: '#f3ebe3' }),
    createBlankPage({ title: '第3页', bgColor: '#efe6dc' }),
  ];
}


/** 删除指定页；越界则原样返回 */
export function removePageAt(pages, index) {
  const list = Array.isArray(pages) ? pages.slice() : [];
  const i = Math.round(Number(index));
  if (i < 0 || i >= list.length) return list;
  list.splice(i, 1);
  return list;
}

/** 当前页最大层级（无元素则为 0） */
export function getMaxLayer(pages, pageIndex) {
  const els = ((pages || [])[pageIndex] || {}).elements || [];
  if (!els.length) return 0;
  return Math.max(...els.map((el) => Number(el.layer) || 1));
}

/**
 * 在画布正中创建修饰元素
 * @param {{ id: string, color: string, label?: string }} asset
 * @param {{ w?: number, h?: number, layer?: number }} [size]
 */
export function createDecorElement(asset, size = {}) {
  const w = size.w != null ? size.w : 0.28;
  const h = size.h != null ? size.h : 0.18;
  const layer =
    size.layer != null
      ? Math.max(1, Math.min(10, Math.round(Number(size.layer) || 1)))
      : 1;
  return {
    id: uid('el'),
    type: 'decor',
    assetId: asset.id,
    color: asset.color,
    label: asset.label || '',
    x: 0.5 - w / 2,
    y: 0.5 - h / 2,
    w,
    h,
    rotate: 0,
    layer,
  };
}

/**
 * 在画布正中创建文字块（可拖拽容器 + 文案样式）
 * @param {{ text?: string, w?: number, h?: number, layer?: number }} [opts]
 */
/** 文字样式默认值（重置 / 新建共用） */
export const DEFAULT_TEXT_STYLE = {
  fontSize: 28,
  fontFamily: 'sans',
  color: '#3d2914',
  bgColor: '',
  fontWeight: 'normal',
  /** 水平：left | center | right */
  align: 'center',
  /** 垂直：top | middle | bottom */
  valign: 'middle',
  /** 动效：'' | charPop | scrubLine … */
  textAnim: '',
};

/** 新建文字默认框：画布居中，与 createTextElement 一致 */
export const DEFAULT_TEXT_LAYOUT = {
  w: 0.56,
  h: 0.12,
  x: 0.5 - 0.56 / 2,
  y: 0.5 - 0.12 / 2,
  rotate: 0,
};

export function createTextElement(opts = {}) {
  const w = opts.w != null ? opts.w : DEFAULT_TEXT_LAYOUT.w;
  const h = opts.h != null ? opts.h : DEFAULT_TEXT_LAYOUT.h;
  const layer =
    opts.layer != null
      ? Math.max(1, Math.min(10, Math.round(Number(opts.layer) || 1)))
      : 1;
  return {
    id: uid('el'),
    type: 'text',
    text: opts.text != null ? String(opts.text) : '请输入文案',
    fontSize:
      opts.fontSize != null
        ? Number(opts.fontSize) || DEFAULT_TEXT_STYLE.fontSize
        : DEFAULT_TEXT_STYLE.fontSize,
    fontFamily: opts.fontFamily || DEFAULT_TEXT_STYLE.fontFamily,
    color: opts.color || DEFAULT_TEXT_STYLE.color,
    bgColor:
      opts.bgColor != null ? opts.bgColor : DEFAULT_TEXT_STYLE.bgColor,
    fontWeight: opts.fontWeight || DEFAULT_TEXT_STYLE.fontWeight,
    align: opts.align || DEFAULT_TEXT_STYLE.align,
    valign: opts.valign || DEFAULT_TEXT_STYLE.valign,
    textAnim: opts.textAnim != null ? opts.textAnim : DEFAULT_TEXT_STYLE.textAnim,
    label: '文字',
    x: opts.x != null ? opts.x : 0.5 - w / 2,
    y: opts.y != null ? opts.y : 0.5 - h / 2,
    w,
    h,
    rotate: opts.rotate != null ? Number(opts.rotate) || 0 : DEFAULT_TEXT_LAYOUT.rotate,
    layer,
  };
}

/** 更新当前页背景（全铺，不受内容区虚线限制） */
export function updatePageBackground(pages, pageIndex, patch) {
  const list = pages.slice();
  const page = { ...(list[pageIndex] || {}) };
  list[pageIndex] = {
    ...page,
    ...patch,
    elements: page.elements || [],
  };
  return list;
}

/** 更新指定元素（不可变） */
export function updateElement(pages, pageIndex, id, patch) {
  const list = pages.slice();
  const page = { ...list[pageIndex] };
  page.elements = (page.elements || []).map((el) =>
    el.id === id ? { ...el, ...patch } : el,
  );
  list[pageIndex] = page;
  return list;
}

/** 设置元素层级（允许多个元素同层；高盖低） */
export function setElementLayer(pages, pageIndex, id, layer) {
  const n = Math.max(1, Math.min(10, Math.round(Number(layer) || 1)));
  return updateElement(pages, pageIndex, id, { layer: n });
}

/** 确保至少有一页可编辑，返回 { pages, pageIndex } */
export function ensureEditablePage(pages, pageIndex = 0) {
  const list = Array.isArray(pages) ? pages.slice() : [];
  if (!list.length) {
    list.push(createBlankPage());
    return { pages: list, pageIndex: 0 };
  }
  const idx = Math.max(0, Math.min(list.length - 1, pageIndex));
  return { pages: list, pageIndex: idx };
}

/** 向指定页追加元素（不可变更新） */
export function appendElement(pages, pageIndex, element) {
  const list = pages.slice();
  const page = { ...list[pageIndex] };
  page.elements = (page.elements || []).concat(element);
  list[pageIndex] = page;
  return list;
}

/** 删除指定元素 */
export function removeElement(pages, pageIndex, id) {
  const list = pages.slice();
  const page = { ...list[pageIndex] };
  page.elements = (page.elements || []).filter((el) => el.id !== id);
  list[pageIndex] = page;
  return list;
}

/** 图层列表：高层在前；同层按 id 稳定排序 */
export function listLayers(pages, pageIndex) {
  const page = (pages || [])[pageIndex];
  const elements = (page && page.elements) || [];
  return elements
    .slice()
    .sort((a, b) => {
      const la = Number(a.layer) || 1;
      const lb = Number(b.layer) || 1;
      if (lb !== la) return lb - la;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((el) => ({
      ...el,
      layer: Number(el.layer) || 1,
      title:
        el.type === 'text'
          ? (el.text && String(el.text).slice(0, 12)) || '文字'
          : el.label || el.type || '未命名',
    }));
}
