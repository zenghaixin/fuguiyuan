/**
 * 文字字体素材（喜帖 / 故事线共用）
 * 后续对接 CDN：填 previewSrc（预览图）/ fontUrl（字体文件），选择体验与修饰素材一致。
 */

export const FONT_FAMILIES = [
  {
    id: 'font_sans',
    key: 'sans',
    label: '黑体',
    sample: '喜',
    css: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif',
    /** CDN 预览图，有则优先展示 */
    previewSrc: '',
    /** CDN 字体文件，有则 wx.loadFontFace */
    fontUrl: '',
  },
  {
    id: 'font_serif',
    key: 'serif',
    label: '宋体',
    sample: '帖',
    css: 'Songti SC, STSong, "Noto Serif SC", serif',
    previewSrc: '',
    fontUrl: '',
  },
  {
    id: 'font_kai',
    key: 'kai',
    label: '楷体',
    sample: '囍',
    css: 'KaiTi, STKaiti, "Kaiti SC", serif',
    previewSrc: '',
    fontUrl: '',
  },
  {
    id: 'font_yuan',
    key: 'yuan',
    label: '圆体',
    sample: '缘',
    css: '"PingFang SC", "Hiragino Sans GB", sans-serif',
    previewSrc: '',
    fontUrl: '',
  },
];

export const FONT_SIZES = [20, 24, 28, 32, 36, 40, 48, 56];

export const FONT_WEIGHTS = [
  { key: 'normal', label: '常规', value: '400' },
  { key: 'medium', label: '中等', value: '500' },
  { key: 'bold', label: '粗体', value: '700' },
];

/** 文字排版：水平 */
export const TEXT_ALIGNS = [
  { key: 'left', label: '左对齐' },
  { key: 'center', label: '居中' },
  { key: 'right', label: '右对齐' },
];

/** 文字排版：垂直 */
export const TEXT_VALIGNS = [
  { key: 'top', label: '顶部对齐' },
  { key: 'middle', label: '垂直居中' },
  { key: 'bottom', label: '底部对齐' },
];

export const TEXT_COLORS = [
  { id: 'tc_ink', label: '墨色', color: '#3d2914' },
  { id: 'tc_rose', label: '酒红', color: '#b91c3a' },
  { id: 'tc_gold', label: '金棕', color: '#8a6a3d' },
  { id: 'tc_gray', label: '灰褐', color: '#6b5a4c' },
  { id: 'tc_white', label: '白色', color: '#ffffff' },
  { id: 'tc_cream', label: '米白', color: '#f3ead2' },
];

export const TEXT_BG_COLORS = [
  { id: 'tbg_none', label: '无', color: '' },
  { id: 'tbg_ivory', label: '象牙', color: '#f7f0ea' },
  { id: 'tbg_blush', label: '浅粉', color: 'rgba(248,232,230,0.9)' },
  { id: 'tbg_cream', label: '奶油', color: 'rgba(245,236,216,0.9)' },
  { id: 'tbg_rose', label: '透红', color: 'rgba(185,28,58,0.12)' },
  { id: 'tbg_ink', label: '透墨', color: 'rgba(61,41,20,0.08)' },
];

export function resolveFontFamily(key) {
  const hit = FONT_FAMILIES.find((f) => f.key === key);
  return (hit && hit.css) || FONT_FAMILIES[0].css;
}

export function resolveFontWeight(key) {
  const hit = FONT_WEIGHTS.find((w) => w.key === key);
  return (hit && hit.value) || '400';
}

/** 故事线跟手出字（与 progress 绑定，见 utils/story-scrub-bind） */
export const TEXT_ANIM_SCRUB_LINE = 'scrubLine';

/** 文字动效（value 写入元素 textAnim；key 用于列表选中） */
export const TEXT_ANIMS = [
  { key: 'none', value: '', label: '无', desc: '静止显示' },
  { key: 'charPop', value: 'charPop', label: '逐字跳出', desc: '一个字一个字弹出来' },
  {
    key: 'scrubLine',
    value: TEXT_ANIM_SCRUB_LINE,
    label: '滑动出字',
    desc: '故事线进度条驱动，逐行浮现',
  },
];
