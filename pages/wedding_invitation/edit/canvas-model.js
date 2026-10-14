/** 请帖编辑画布：页 / 元素模型（坐标为相对画布 0–1） */

let _seq = 0;
function uid(prefix) {
  _seq += 1;
  return `${prefix}_${Date.now()}_${_seq}`;
}

/** 空白占位页（对接模板后只换 bgSrc / bgColor） */
export function createBlankPage() {
  return {
    id: uid('page'),
    bgColor: '#f7f0ea',
    bgSrc: '',
    elements: [],
  };
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
      title: el.label || el.type || '未命名',
    }));
}
