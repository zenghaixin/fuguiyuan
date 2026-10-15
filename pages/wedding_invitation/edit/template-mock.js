/**
 * 请帖模板 mock（接口未接前本地占位）
 * pages 结构与编辑画布一致，可直接 createInviteWork
 */

function el(partial) {
  return {
    type: 'decor',
    rotate: 0,
    layer: 1,
    w: 0.28,
    h: 0.16,
    ...partial,
  };
}

export const INVITE_TEMPLATES = [
  {
    id: 'tpl_rose',
    name: '玫瑰誓言',
    desc: '红玫瑰主色，适合西式婚礼',
    coverColor: '#f7e8ea',
    tag: '热门',
    pages: [
      {
        id: 'tpl_rose_p1',
        title: '封面',
        bgColor: '#f7e8ea',
        bgSrc: '',
        elements: [
          el({ id: 'e1', label: '玫瑰', color: '#b91c3a', x: 0.36, y: 0.28, w: 0.28, h: 0.14 }),
          el({ id: 'e2', label: '誓言', color: '#8a3a4a', x: 0.3, y: 0.52, w: 0.4, h: 0.1, layer: 2 }),
        ],
      },
      {
        id: 'tpl_rose_p2',
        title: '内页1',
        bgColor: '#f3ebe3',
        bgSrc: '',
        elements: [
          el({ id: 'e3', label: '时间', color: '#c4a484', x: 0.25, y: 0.4, w: 0.5, h: 0.12 }),
        ],
      },
      {
        id: 'tpl_rose_p3',
        title: '内页2',
        bgColor: '#efe6dc',
        bgSrc: '',
        elements: [
          el({ id: 'e4', label: '地点', color: '#9a7b5f', x: 0.22, y: 0.38, w: 0.56, h: 0.14 }),
        ],
      },
    ],
  },
  {
    id: 'tpl_ink',
    name: '水墨雅韵',
    desc: '素雅水墨风，中式婚礼',
    coverColor: '#eef1f0',
    tag: '中式',
    pages: [
      {
        id: 'tpl_ink_p1',
        title: '封面',
        bgColor: '#eef1f0',
        bgSrc: '',
        elements: [
          el({ id: 'e1', label: '雅集', color: '#3d4a45', x: 0.32, y: 0.3, w: 0.36, h: 0.12 }),
          el({ id: 'e2', label: '成礼', color: '#6b7a74', x: 0.35, y: 0.5, w: 0.3, h: 0.1, layer: 2 }),
        ],
      },
      {
        id: 'tpl_ink_p2',
        title: '内页',
        bgColor: '#e8ecea',
        bgSrc: '',
        elements: [
          el({ id: 'e3', label: '席设', color: '#5a6a64', x: 0.28, y: 0.42, w: 0.44, h: 0.12 }),
        ],
      },
    ],
  },
  {
    id: 'tpl_cream',
    name: '奶油清晨',
    desc: '浅奶咖色，清新简约',
    coverColor: '#f7f0ea',
    tag: '简约',
    pages: [
      {
        id: 'tpl_cream_p1',
        title: '封面',
        bgColor: '#f7f0ea',
        bgSrc: '',
        elements: [
          el({ id: 'e1', label: '奶油', color: '#c4b5a5', x: 0.34, y: 0.34, w: 0.32, h: 0.12 }),
        ],
      },
      {
        id: 'tpl_cream_p2',
        title: '内页1',
        bgColor: '#f3ebe3',
        bgSrc: '',
        elements: [
          el({ id: 'e2', label: '蜜桃', color: '#d4a5a5', x: 0.3, y: 0.36, w: 0.4, h: 0.14 }),
        ],
      },
      {
        id: 'tpl_cream_p3',
        title: '内页2',
        bgColor: '#efe6dc',
        bgSrc: '',
        elements: [],
      },
    ],
  },
  {
    id: 'tpl_gold',
    name: '鎏金晚宴',
    desc: '香槟金点缀，晚宴仪式感',
    coverColor: '#f4efe6',
    tag: '晚宴',
    pages: [
      {
        id: 'tpl_gold_p1',
        title: '封面',
        bgColor: '#f4efe6',
        bgSrc: '',
        elements: [
          el({ id: 'e1', label: '鎏金', color: '#b08d57', x: 0.3, y: 0.28, w: 0.4, h: 0.12 }),
          el({ id: 'e2', label: '晚宴', color: '#8a6a3d', x: 0.34, y: 0.5, w: 0.32, h: 0.1, layer: 2 }),
        ],
      },
      {
        id: 'tpl_gold_p2',
        title: '内页',
        bgColor: '#efe8dc',
        bgSrc: '',
        elements: [
          el({ id: 'e3', label: '席位', color: '#a88655', x: 0.26, y: 0.4, w: 0.48, h: 0.12 }),
        ],
      },
    ],
  },
];

export function getInviteTemplateById(id) {
  return INVITE_TEMPLATES.find((t) => t.id === id) || null;
}

/** 深拷贝模板页，生成新的 page/element id，避免多份作品互相污染 */
export function cloneTemplatePages(template) {
  const pages = (template && template.pages) || [];
  const stamp = Date.now();
  return pages.map((page, pi) => ({
    ...page,
    id: `page_${stamp}_${pi}`,
    elements: (page.elements || []).map((elItem, ei) => ({
      ...elItem,
      id: `el_${stamp}_${pi}_${ei}`,
    })),
  }));
}
