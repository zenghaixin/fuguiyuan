/** 编辑页工具箱配置（跟编辑页走） */

/** 请帖工具（未选中元素） */
export const INVITE_TOOLS = [
  { key: 'template', label: '模板', icon: 'file' },
  { key: 'layers', label: '图层', icon: 'layers' },
  { key: 'background', label: '背景', icon: 'image' },
  { key: 'decor', label: '修饰', icon: 'star' },
  /** 添加文字块；选中后再用「文案 / 样式」细分 */
  { key: 'font', label: '文字', icon: 'letters-a' },
  { key: 'music', label: '音乐', icon: 'sound' },
  { key: 'effect', label: '开屏', icon: 'play-circle' },
  { key: 'save', label: '保存', icon: 'save' },
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

/**
 * 故事线画布工具（喜帖子集：无模板 / 修饰 / 音乐 / 开屏）
 * 选中元素后仍走 ELEMENT / TEXT 工具
 */
export const STORY_CANVAS_TOOLS = [
  { key: 'layers', label: '图层', icon: 'layers' },
  { key: 'background', label: '上传', icon: 'image' },
  { key: 'font', label: '文字', icon: 'letters-a' },
  { key: 'save', label: '保存', icon: 'save' },
  { key: 'preview', label: '预览', icon: 'browse' },
];

/** @deprecated 旧分块工具，故事线已改为喜帖页流程 */
export const STORY_TOOLS = STORY_CANVAS_TOOLS;

/** @deprecated 旧故事文案页工具 */
export const STORY_TEXT_TOOLS = STORY_CANVAS_TOOLS;

/** 故事文案 · 选中文字（无图层面板，层级仍可在样式外调整可后续再加） */
export const STORY_TEXT_ELEMENT_TOOLS = [
  { key: 'addPhoto', label: '加图', icon: 'image' },
  { key: 'addText', label: '加文', icon: 'letters-a' },
  { key: 'content', label: '文案', icon: 'edit' },
  { key: 'style', label: '样式', icon: 'palette' },
  { key: 'anim', label: '动效', icon: 'play-circle' },
  { key: 'reset', label: '重置', icon: 'rollback' },
  { key: 'delete', label: '删除', icon: 'delete' },
  { key: 'done', label: '完成', icon: 'check' },
];

/** 选中元素后的工具（位置/大小/角度改为画布手势，底栏不再放） */
export const ELEMENT_TOOLS_BASE = [
  { key: 'layer', label: '层级', icon: 'layers' },
  { key: 'delete', label: '删除', icon: 'delete' },
  { key: 'done', label: '完成', icon: 'check' },
];

/** 选中文字块 · 一级（重置紧挨删除） */
export const TEXT_ELEMENT_TOOLS_BASE = [
  { key: 'content', label: '文案', icon: 'edit' },
  { key: 'style', label: '样式', icon: 'palette' },
  { key: 'anim', label: '动效', icon: 'play-circle' },
  { key: 'layer', label: '层级', icon: 'layers' },
  { key: 'reset', label: '重置', icon: 'rollback' },
  { key: 'delete', label: '删除', icon: 'delete' },
  { key: 'done', label: '完成', icon: 'check' },
];

/** 选中文字块 · 二级：样式细项 */
export const TEXT_STYLE_TOOLS = [
  { key: 'fontSize', label: '字号', icon: 'chart-bar' },
  { key: 'fontFamily', label: '字体', icon: 'letters-a' },
  { key: 'color', label: '颜色', icon: 'palette' },
  { key: 'bg', label: '背景', icon: 'image' },
  { key: 'weight', label: '字重', icon: 'format-vertical-align-left' },
  { key: 'align', label: '排版', icon: 'view-module' },
  { key: 'reset', label: '重置', icon: 'rollback' },
  { key: 'back', label: '返回', icon: 'chevron-left' },
];

/** @deprecated 兼容旧引用 */
export const ELEMENT_TOOLS = ELEMENT_TOOLS_BASE;

function withLayerBadge(tools, layer = 1) {
  const n = Math.max(1, Math.min(10, Math.round(Number(layer) || 1)));
  return tools.map((tool) => {
    if (tool.key !== 'layer') return { ...tool };
    return {
      key: tool.key,
      label: tool.label,
      badge: String(n),
    };
  });
}

/** 生成带当前层级数的元素工具条 */
export function buildElementTools(layer = 1) {
  return withLayerBadge(ELEMENT_TOOLS_BASE, layer);
}

/** 选中文字块 · 一级工具条 */
export function buildTextElementTools(layer = 1) {
  return withLayerBadge(TEXT_ELEMENT_TOOLS_BASE, layer);
}

/** 故事文案页 · 选中文字工具条（仅文字能力） */
export function buildStoryTextElementTools() {
  return STORY_TEXT_ELEMENT_TOOLS.map((tool) => ({ ...tool }));
}

/** 选中文字块 · 二级样式工具条 */
export function buildTextStyleTools() {
  return TEXT_STYLE_TOOLS.map((tool) => ({ ...tool }));
}