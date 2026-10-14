/** 编辑页工具箱配置（跟编辑页走） */

/** 请帖工具 */
export const INVITE_TOOLS = [
  { key: 'template', label: '模板', icon: 'file' },
  { key: 'layers', label: '图层', icon: 'layers' },
  { key: 'background', label: '背景', icon: 'image' },
  { key: 'decor', label: '修饰', icon: 'star' },
  { key: 'font', label: '字体', icon: 'letters-a' },
  { key: 'copy', label: '文案', icon: 'edit' },
  { key: 'music', label: '音乐', icon: 'sound' },
  { key: 'effect', label: '开屏', icon: 'play-circle' },
  { key: 'preview', label: '预览', icon: 'browse' },
];

/** 照片墙工具 */
export const PHOTO_TOOLS = [
  { key: 'upload', label: '上传', icon: 'add' },
  { key: 'layout', label: '排版', icon: 'view-list' },
  { key: 'sort', label: '排序', icon: 'swap' },
  { key: 'crop', label: '裁剪', icon: 'fullscreen' },
  { key: 'caption', label: '配文', icon: 'chat' },
  { key: 'preview', label: '预览', icon: 'browse' },
];

/** 选中元素后的变换工具（层级用 badge 数字展示） */
export const ELEMENT_TOOLS_BASE = [
  { key: 'position', label: '位置', icon: 'location' },
  { key: 'size', label: '大小', icon: 'fullscreen' },
  { key: 'angle', label: '角度', icon: 'refresh' },
  { key: 'layer', label: '层级', icon: 'layers' },
  { key: 'delete', label: '删除', icon: 'delete' },
  { key: 'done', label: '完成', icon: 'check' },
];

/** @deprecated 兼容旧引用 */
export const ELEMENT_TOOLS = ELEMENT_TOOLS_BASE;

/** 生成带当前层级数的元素工具条 */
export function buildElementTools(layer = 1) {
  const n = Math.max(1, Math.min(10, Math.round(Number(layer) || 1)));
  return ELEMENT_TOOLS_BASE.map((tool) => {
    if (tool.key !== 'layer') return { ...tool };
    return {
      key: tool.key,
      label: tool.label,
      badge: String(n),
    };
  });
}