import {
  STORY_TEXT_TOOLS,
  buildStoryTextElementTools,
  buildTextStyleTools,
} from '../toolbox';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_WEIGHTS,
  TEXT_COLORS,
  TEXT_BG_COLORS,
  TEXT_ALIGNS,
  TEXT_VALIGNS,
  TEXT_ANIMS,
} from '../font-assets';
import {
  ensureEditablePage,
  createTextElement,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TEXT_LAYOUT,
  appendElement,
  updateElement,
  removeElement,
  getMaxLayer,
} from '../canvas-model';
import {
  saveInviteDraft,
  loadInviteDraft,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';
import { DESIGN_ASPECT } from '~/services/invite-canvas';
import {
  readWindowViewport,
  bindWindowResize,
  unbindWindowResize,
} from '~/services/window-viewport';
import {
  normalizeStoryLine,
  STORY_STYLE_BLOCKS,
  textBlockToPage,
  pageToTextBlock,
  createTextBlock,
  takeStagedStoryTextBlock,
} from '../../utils/story-line';
import { navigateBackToRoute, STORY_ROUTE, STORY_URL } from '../nav-route';

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    windowWidth: 375,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    invitePages: [],
    invitePageIndex: 0,
    activeElementId: '',
    elementEditMode: 'position',
    layoutRev: 0,
    toolboxTools: STORY_TEXT_TOOLS,
    toolboxActive: '',
    blockId: '',
    openInputOnce: false,
    /** 文字选中：main 一级 / style 二级样式 */
    textToolLevel: 'main',
    textContentVisible: false,
    textContentDraft: '',
    keyboardHeight: 0,
    textSizeVisible: false,
    textFontVisible: false,
    textColorVisible: false,
    textColorValue: '#3d2914',
    textBgVisible: false,
    textWeightVisible: false,
    textAlignVisible: false,
    textAnimVisible: false,
    currentAlign: 'center',
    currentValign: 'middle',
    currentTextAnim: '',
    fontFamilies: FONT_FAMILIES,
    currentFontKey: 'sans',
    fontSizes: FONT_SIZES,
    fontWeights: FONT_WEIGHTS,
    textColors: TEXT_COLORS,
    textBgColors: TEXT_BG_COLORS,
    textAligns: TEXT_ALIGNS,
    textValigns: TEXT_VALIGNS,
    textAnims: TEXT_ANIMS,
    dialog: {
      visible: false,
      mode: 'confirm',
      title: '',
      content: '',
      confirmText: '确定',
      danger: false,
      action: '',
    },
  },

  onLoad(query) {
    const viewport = readWindowViewport();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    const blockId = (query && query.blockId) || '';
    const canvas = this._resolveCanvas(inviteId, blockId);
    const textEl = (canvas.page.elements || []).find((e) => e && e.type === 'text');
    // 第一帧就是安全区画布，不再出现「点一下才进入画布」
    this.setData({
      ...viewport,
      inviteId,
      blockId: canvas.blockId,
      invitePages: [canvas.page],
      invitePageIndex: 0,
      activeElementId: textEl ? textEl.id : '',
      toolboxTools: textEl ? buildStoryTextElementTools() : STORY_TEXT_TOOLS,
      textToolLevel: 'main',
    });
    bindWindowResize(this, (next) => {
      this.setData(next);
    });
  },

  _resolveCanvas(inviteId, blockId) {
    const staged = takeStagedStoryTextBlock(blockId);
    if (staged && staged.type === 'text') {
      return { blockId: staged.id, page: textBlockToPage(staged) };
    }
    const draft = loadInviteDraft(inviteId);
    const story = normalizeStoryLine(draft && draft.storyLine);
    let block = (story.blocks || []).find((b) => b && b.id === blockId);
    if (!block || block.type !== 'text') {
      block = createTextBlock({}, { ensureText: true });
    }
    return { blockId: block.id, page: textBlockToPage(block) };
  },

  onHide() {
    this.persistDraft();
  },

  onUnload() {
    unbindWindowResize(this);
    this.persistDraft();
  },

  onBack() {
    const id = this.data.inviteId || TEMP_INVITE_ID;
    this.persistDraft().then(() => {
      navigateBackToRoute(
        STORY_ROUTE,
        `${STORY_URL}?id=${encodeURIComponent(id)}`,
      );
    });
  },

  onBackPress() {
    this.onBack();
    return true;
  },

  persistDraft() {
    const inviteId = this.data.inviteId || TEMP_INVITE_ID;
    const draft = loadInviteDraft(inviteId) || {};
    const story = normalizeStoryLine(draft.storyLine);
    const blocks = (story.blocks || []).slice();
    const page = (this.data.invitePages || [])[0];
    if (!page) return Promise.resolve();
    const nextBlock = pageToTextBlock(page, this.data.blockId);
    const idx = blocks.findIndex((b) => b && b.id === this.data.blockId);
    if (idx >= 0) blocks[idx] = nextBlock;
    else blocks.push(nextBlock);
    return saveInviteDraft({
      inviteId,
      title: draft.title,
      pages: draft.pages || [],
      photoWall: draft.photoWall || [],
      photoWallLayout: draft.photoWallLayout || 'carousel',
      storyLine: { style: STORY_STYLE_BLOCKS, blocks },
      designAspect: DESIGN_ASPECT,
      meta: { ...(draft.meta || {}), source: 'edit/story-text' },
    });
  },

  _getElement(id) {
    const { invitePages, invitePageIndex } = this.data;
    const els =
      (invitePages[invitePageIndex] && invitePages[invitePageIndex].elements) ||
      [];
    return els.find((item) => item.id === id) || null;
  },

  _toolsForElement(id, level) {
    const el = this._getElement(id);
    if (el && el.type === 'text') {
      if (level === 'style') return buildTextStyleTools();
      return buildStoryTextElementTools();
    }
    return STORY_TEXT_TOOLS.map((t) => ({ ...t }));
  },

  enterTextStyleLevel() {
    if (!this.data.activeElementId) return;
    this.setData({
      textToolLevel: 'style',
      toolboxTools: buildTextStyleTools(),
      toolboxActive: 'fontSize',
      elementEditMode: 'position',
      ...this._closeTextStyleSheets(),
    });
  },

  exitTextStyleLevel() {
    const id = this.data.activeElementId;
    if (!id) return;
    this.setData({
      textToolLevel: 'main',
      toolboxTools: buildStoryTextElementTools(),
      toolboxActive: 'style',
      ...this._closeTextStyleSheets(),
    });
  },

  _closeTextStyleSheets() {
    return {
      textContentVisible: false,
      textSizeVisible: false,
      textFontVisible: false,
      textColorVisible: false,
      textBgVisible: false,
      textWeightVisible: false,
      textAlignVisible: false,
      textAnimVisible: false,
    };
  },

  openTextAnimSheet() {
    const el = this._getElement(this.data.activeElementId);
    if (!el || el.type !== 'text') return;
    this.setData({
      toolboxActive: 'anim',
      ...this._closeTextStyleSheets(),
      textAnimVisible: true,
      currentTextAnim: el.textAnim || '',
      layoutRev: (this.data.layoutRev || 0) + 1,
    });
  },

  closeTextAnimSheet() {
    this.setData({ textAnimVisible: false });
  },

  onPickTextAnim(e) {
    const key = e.currentTarget.dataset.key;
    const hit = TEXT_ANIMS.find((a) => a.key === key);
    if (!hit) return;
    const anim = hit.value || '';
    this.patchActiveText({ textAnim: anim });
    this.setData({
      textAnimVisible: false,
      toolboxActive: 'anim',
      currentTextAnim: anim,
      layoutRev: (this.data.layoutRev || 0) + 1,
    });
  },

  enterElementEdit(id, options = {}) {
    if (!id) {
      this.exitElementEdit();
      return;
    }
    const el = this._getElement(id);
    if (!(el && el.type === 'text')) {
      this.exitElementEdit();
      return;
    }
    this.setData({
      activeElementId: id,
      elementEditMode: 'position',
      textToolLevel: 'main',
      toolboxTools: buildStoryTextElementTools(),
      toolboxActive: '',
      ...this._closeTextStyleSheets(),
    });
    if (options.openContent) {
      this.openTextContentSheet();
    }
  },

  /** 仅「完成」/删除后调用 */
  exitElementEdit() {
    this.setData({
      activeElementId: '',
      elementEditMode: 'position',
      textToolLevel: 'main',
      toolboxTools: STORY_TEXT_TOOLS,
      toolboxActive: '',
      keyboardHeight: 0,
      ...this._closeTextStyleSheets(),
    });
  },

  onToolboxSelect(e) {
    const { key, tool } = e.detail || {};
    if (!key) return;

    if (this.data.activeElementId) {
      if (key === 'delete') {
        this.confirmDeleteElement();
        return;
      }
      if (key === 'done') {
        this.exitElementEdit();
        return;
      }
      if (key === 'content') {
        this.openTextContentSheet();
        return;
      }
      if (key === 'style') {
        this.enterTextStyleLevel();
        return;
      }
      if (key === 'anim') {
        this.openTextAnimSheet();
        return;
      }
      if (key === 'back') {
        this.exitTextStyleLevel();
        return;
      }
      if (key === 'fontSize') {
        this.setData({
          toolboxActive: key,
          ...this._closeTextStyleSheets(),
          textSizeVisible: true,
        });
        return;
      }
      if (key === 'fontFamily') {
        const el = this._getElement(this.data.activeElementId);
        this.setData({
          toolboxActive: key,
          ...this._closeTextStyleSheets(),
          textFontVisible: true,
          currentFontKey: (el && el.fontFamily) || 'sans',
        });
        return;
      }
      if (key === 'color') {
        const el = this._getElement(this.data.activeElementId);
        this.setData({
          toolboxActive: key,
          ...this._closeTextStyleSheets(),
          textColorVisible: true,
          textColorValue: (el && el.color) || '#3d2914',
        });
        return;
      }
      if (key === 'bg') {
        this.setData({
          toolboxActive: key,
          ...this._closeTextStyleSheets(),
          textBgVisible: true,
        });
        return;
      }
      if (key === 'weight') {
        this.setData({
          toolboxActive: key,
          ...this._closeTextStyleSheets(),
          textWeightVisible: true,
        });
        return;
      }
      if (key === 'align') {
        const el = this._getElement(this.data.activeElementId);
        this.setData({
          toolboxActive: key,
          ...this._closeTextStyleSheets(),
          textAlignVisible: true,
          currentAlign: (el && el.align) || 'center',
          currentValign: (el && el.valign) || 'middle',
        });
        return;
      }
      if (key === 'reset') {
        this.confirmResetText(
          this.data.textToolLevel === 'style' ? 'style' : 'default',
        );
        return;
      }
      return;
    }

    this.setData({ toolboxActive: key });

    if (key === 'preview') {
      this.openPreview();
      return;
    }
    if (key === 'font') {
      this.onAddTextElement();
      return;
    }
    if (key === 'save') {
      this.onSave();
      return;
    }

    wx.showToast({
      title: `${(tool && tool.label) || key}（稍后接）`,
      icon: 'none',
    });
  },

  onAddTextElement() {
    const ensured = ensureEditablePage(
      this.data.invitePages,
      this.data.invitePageIndex,
    );
    const layer = Math.min(10, getMaxLayer(ensured.pages, ensured.pageIndex) + 1);
    const element = createTextElement({ layer });
    const invitePages = appendElement(
      ensured.pages,
      ensured.pageIndex,
      element,
    );
    this.setData(
      {
        invitePages,
        invitePageIndex: ensured.pageIndex,
        toolboxActive: '',
      },
      () => {
        // 画布上新增文字并选中，由用户再点「文案」输入
        this.enterElementEdit(element.id, { openContent: false });
      },
    );
  },

  patchActiveText(patch) {
    const { activeElementId, invitePages, invitePageIndex } = this.data;
    if (!activeElementId) return;
    const el = this._getElement(activeElementId);
    if (!el || el.type !== 'text') return;
    const next = updateElement(
      invitePages,
      invitePageIndex,
      activeElementId,
      patch,
    );
    this.setData({ invitePages: next });
  },

  openTextContentSheet() {
    const el = this._getElement(this.data.activeElementId);
    if (!el || el.type !== 'text') return;
    this.setData({
      toolboxActive: 'content',
      ...this._closeTextStyleSheets(),
      textContentVisible: true,
      textContentDraft: el.text || '',
      keyboardHeight: 0,
    });
  },

  closeTextContentSheet() {
    this.setData({
      textContentVisible: false,
      toolboxActive: 'content',
      keyboardHeight: 0,
    });
  },

  onTextContentInput(e) {
    this.setData({ textContentDraft: e.detail.value });
  },

  onTextKeyboardHeightChange(e) {
    this.setData({ keyboardHeight: (e.detail && e.detail.height) || 0 });
  },

  confirmTextContentSheet() {
    const text = String(this.data.textContentDraft || '').trim() || '请输入文案';
    this.patchActiveText({ text, label: '文字' });
    this.setData({
      textContentVisible: false,
      toolboxActive: 'content',
      keyboardHeight: 0,
    });
  },

  closeTextSizeSheet() {
    this.setData({ textSizeVisible: false });
  },

  onPickFontSize(e) {
    const size = Number(e.currentTarget.dataset.size);
    if (!size) return;
    this.patchActiveText({ fontSize: size });
    this.setData({ textSizeVisible: false, toolboxActive: 'fontSize' });
  },

  closeTextFontSheet() {
    this.setData({ textFontVisible: false });
  },

  onPickFontFamily(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    const font = (this.data.fontFamilies || []).find((f) => f.key === key);
    // 预留：CDN 字体加载
    if (font && font.fontUrl && typeof wx.loadFontFace === 'function') {
      wx.loadFontFace({
        family: key,
        source: `url("${font.fontUrl}")`,
        global: true,
        fail() {},
      });
    }
    this.patchActiveText({ fontFamily: key });
    this.setData({
      textFontVisible: false,
      toolboxActive: 'fontFamily',
      currentFontKey: key,
    });
  },

  closeTextColorSheet() {
    this.setData({ textColorVisible: false, toolboxActive: 'color' });
  },

  onTextColorChange(e) {
    const color = e.detail && e.detail.color;
    if (!color) return;
    this.patchActiveText({ color });
    this.setData({ textColorValue: color });
  },

  closeTextBgSheet() {
    this.setData({ textBgVisible: false });
  },

  onPickTextBg(e) {
    const color = e.currentTarget.dataset.color;
    this.patchActiveText({ bgColor: color != null ? color : '' });
    this.setData({ textBgVisible: false, toolboxActive: 'bg' });
  },

  closeTextWeightSheet() {
    this.setData({ textWeightVisible: false });
  },

  onPickTextWeight(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.patchActiveText({ fontWeight: key });
    this.setData({ textWeightVisible: false, toolboxActive: 'weight' });
  },

  closeTextAlignSheet() {
    this.setData({ textAlignVisible: false });
  },

  onPickTextAlign(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.patchActiveText({ align: key });
    this.setData({ currentAlign: key, toolboxActive: 'align' });
  },

  onPickTextValign(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.patchActiveText({ valign: key });
    this.setData({ currentValign: key, toolboxActive: 'align' });
  },

  openDialog(patch) {
    this.setData({
      dialog: {
        visible: true,
        mode: 'confirm',
        title: '',
        content: '',
        confirmText: '确定',
        danger: false,
        action: '',
        ...patch,
      },
    });
  },

  closeDialog() {
    this.setData({ 'dialog.visible': false });
  },

  onDialogCancel() {
    this.closeDialog();
  },

  onDialogConfirm() {
    const { action } = this.data.dialog;
    // 先关弹窗，下一帧再改画布，避免渲染层 FLOW_CREATE_NODE
    this.setData({ 'dialog.visible': false }, () => {
      setTimeout(() => {
        if (action === 'deleteElement') {
          this.onDeleteElement();
          return;
        }
        if (action === 'resetTextDefault') {
          this.resetActiveTextToDefault();
          return;
        }
        if (action === 'resetTextStyle') {
          this.resetActiveTextStyle();
        }
      }, 32);
    });
  },

  confirmDeleteElement() {
    if (!this.data.activeElementId) return;
    const el = this._getElement(this.data.activeElementId);
    const name = el && el.type === 'text' ? '文字' : '元素';
    this.openDialog({
      title: '删除确认',
      content: `确定删除该${name}吗？删除后无法恢复。`,
      confirmText: '删除',
      danger: true,
      action: 'deleteElement',
    });
  },

  confirmResetText(kind) {
    const el = this._getElement(this.data.activeElementId);
    if (!el || el.type !== 'text') return;
    if (kind === 'style') {
      this.openDialog({
        title: '重置样式',
        content: '确定将字号、字体、颜色、背景、字重、排版恢复为默认吗？文案不会改动。',
        confirmText: '重置',
        danger: false,
        action: 'resetTextStyle',
      });
      return;
    }
    this.openDialog({
      title: '重置确认',
      content:
        '确定恢复为新建时的默认状态吗？位置、大小、旋转和样式会重置，文案不会改动。',
      confirmText: '重置',
      danger: false,
      action: 'resetTextDefault',
    });
  },

  /** 一级重置：回到新建文字默认态（居中框 + 默认样式；文案/层级不动） */
  resetActiveTextToDefault() {
    const id = this.data.activeElementId;
    const el = this._getElement(id);
    if (!el || el.type !== 'text') return;
    const invitePages = updateElement(
      this.data.invitePages,
      this.data.invitePageIndex,
      id,
      {
        ...DEFAULT_TEXT_STYLE,
        ...DEFAULT_TEXT_LAYOUT,
      },
    );
    this.setData({
      invitePages,
      layoutRev: (this.data.layoutRev || 0) + 1,
      toolboxActive: 'reset',
      toolboxTools: this._toolsForElement(id, 'main'),
      elementEditMode: 'position',
      ...this._closeTextStyleSheets(),
      textColorValue: DEFAULT_TEXT_STYLE.color,
      currentFontKey: DEFAULT_TEXT_STYLE.fontFamily,
      currentAlign: DEFAULT_TEXT_STYLE.align,
      currentValign: DEFAULT_TEXT_STYLE.valign,
    });
  },

  /** 二级重置：样式回到默认值（文案与位置/大小/旋转/层级不动） */
  resetActiveTextStyle() {
    const el = this._getElement(this.data.activeElementId);
    if (!el || el.type !== 'text') return;
    this.patchActiveText({ ...DEFAULT_TEXT_STYLE });
    this.setData({
      toolboxActive: 'reset',
      ...this._closeTextStyleSheets(),
      textColorValue: DEFAULT_TEXT_STYLE.color,
      currentFontKey: DEFAULT_TEXT_STYLE.fontFamily,
      currentAlign: DEFAULT_TEXT_STYLE.align,
      currentValign: DEFAULT_TEXT_STYLE.valign,
    });
  },

  openPreview() {
    this.setData({ toolboxActive: '' });
    const id = this.data.inviteId || TEMP_INVITE_ID;
    this.persistDraft().then(() => {
      wx.navigateTo({
        url: `/pages/wedding_invitation/view/index?mode=draft&id=${encodeURIComponent(id)}&module=story`,
      });
    });
  },

  onSave() {
    this.persistDraft().then(() => {
      wx.showToast({ title: '已保存到本地', icon: 'success' });
    });
  },

  onSelectElement(e) {
    const { id } = e.detail || {};
    // 空白取消：锁定中忽略（由 edit-invite 已拦截；双保险）
    if (!id) return;
    if (this.data.activeElementId && id !== this.data.activeElementId) return;
    if (id === this.data.activeElementId) return;
    this.enterElementEdit(id);
  },

  onDeleteElement() {
    const { activeElementId, invitePages, invitePageIndex } = this.data;
    if (!activeElementId) return;
    const next = removeElement(invitePages, invitePageIndex, activeElementId);
    this.setData({ invitePages: next });
    this.exitElementEdit();
  },

  onElementChange(e) {
    const detail = e.detail || {};
    const { id } = detail;
    if (!id) return;
    // 锁定中只允许改当前元素
    if (this.data.activeElementId && id !== this.data.activeElementId) return;
    const patch = {};
    if (detail.x != null) patch.x = detail.x;
    if (detail.y != null) patch.y = detail.y;
    if (detail.w != null) patch.w = detail.w;
    if (detail.h != null) patch.h = detail.h;
    if (detail.rotate != null) patch.rotate = detail.rotate;
    if (detail.layer != null) patch.layer = detail.layer;
    if (!Object.keys(patch).length) return;

    const invitePages = updateElement(
      this.data.invitePages,
      this.data.invitePageIndex,
      id,
      patch,
    );
    // 不重复写 activeElementId，减少无关 setData
    this.setData({ invitePages });
  },

  noop() {},
});
