import {
  INVITE_TOOLS,
  STORY_CANVAS_TOOLS,
  buildElementTools,
  buildTextElementTools,
  buildTextStyleTools,
} from '../toolbox';
import { DECOR_ASSETS } from '../decor-assets';
import { BG_ASSETS } from '../bg-assets';
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
  createDecorElement,
  createTextElement,
  DEFAULT_TEXT_STYLE,
  DEFAULT_TEXT_LAYOUT,
  appendElement,
  updateElement,
  updatePageBackground,
  removeElement,
  setElementLayer,
  listLayers,
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
import { writeDraftPreviewSnap } from '~/services/invite-preview';
import { captureCoverThumb } from '~/services/invite-cover-thumb';
import { chooseAndPersistPhotos } from '~/services/invite-photo-local';
import {
  navigateBackToRoute,
  SHEET_ROUTE,
  STORY_ROUTE,
  STORY_URL,
} from '../nav-route';
import {
  normalizeStoryLine,
  STORY_STYLE_PAGES,
} from '../../utils/story-line';

const SHEET_URL = '/pages/wedding_invitation/edit/invite-sheet/index';

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
    /** invite | story：故事线复用本页，工具箱为精简子集 */
    editModule: 'invite',
    editorTitle: '编辑喜帖',
    toolboxTools: INVITE_TOOLS,
    toolboxActive: '',
    /** 文字选中：main 一级 / style 二级样式 */
    textToolLevel: 'main',
    decorSheetVisible: false,
    decorAssets: DECOR_ASSETS,
    bgSheetVisible: false,
    bgAssets: BG_ASSETS,
    layerPanelVisible: false,
    layerList: [],
    layerPickerVisible: false,
    layerPickerValue: 1,
    layerPickerTargetId: '',
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

  _isStory() {
    return this._editModule === 'story' || this.data.editModule === 'story';
  },

  _idleTools() {
    return this._isStory() ? STORY_CANVAS_TOOLS : INVITE_TOOLS;
  },

  _loadPagesFromDraft(draft, queryPage) {
    if (this._isStory()) {
      const story = normalizeStoryLine(draft && draft.storyLine);
      const pages = story.pages || [];
      const fromQuery = queryPage != null ? Number(queryPage) : NaN;
      const draftIndex = story.pageIndex != null ? story.pageIndex : 0;
      const rawIndex = Number.isFinite(fromQuery) ? fromQuery : draftIndex;
      const invitePageIndex = pages.length
        ? Math.max(0, Math.min(pages.length - 1, rawIndex))
        : 0;
      return { pages, invitePageIndex };
    }
    const pages = (draft && draft.pages) || [];
    const fromQuery = queryPage != null ? Number(queryPage) : NaN;
    const draftIndex = draft && draft.pageIndex != null ? draft.pageIndex : 0;
    const rawIndex = Number.isFinite(fromQuery) ? fromQuery : draftIndex;
    const invitePageIndex = pages.length
      ? Math.max(0, Math.min(pages.length - 1, rawIndex))
      : 0;
    return { pages, invitePageIndex };
  },

  onLoad(query) {
    const viewport = readWindowViewport();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    const editModule = query && query.from === 'story' ? 'story' : 'invite';
    this._editModule = editModule;
    const draft = loadInviteDraft(inviteId);
    const { pages, invitePageIndex } = this._loadPagesFromDraft(
      draft,
      query && query.page,
    );
    this.setData({
      ...viewport,
      inviteId,
      editModule,
      editorTitle: editModule === 'story' ? '故事线' : '编辑喜帖',
      invitePages: pages,
      invitePageIndex,
      toolboxTools: editModule === 'story' ? STORY_CANVAS_TOOLS : INVITE_TOOLS,
    });
    bindWindowResize(this, (next) => {
      this.setData(next);
    });
  },

  onHide() {
    this.persistDraft();
  },

  onUnload() {
    unbindWindowResize(this);
    this.persistDraft();
  },

  onShow() {
    const inviteId = this.data.inviteId || TEMP_INVITE_ID;
    const draft = loadInviteDraft(inviteId);
    if (!draft) return;
    const { pages, invitePageIndex } = this._loadPagesFromDraft(draft, null);
    this.setData({
      invitePages: pages,
      invitePageIndex,
      activeElementId: '',
      elementEditMode: 'position',
      toolboxTools: this._idleTools(),
      toolboxActive: '',
      textToolLevel: 'main',
      textContentVisible: false,
      textSizeVisible: false,
      textFontVisible: false,
      textColorVisible: false,
      textBgVisible: false,
      textWeightVisible: false,
      textAlignVisible: false,
    });
  },

  /** 喜帖 → invite-sheet；故事线 → story-line 页列表 */
  onBack() {
    const id = this.data.inviteId || TEMP_INVITE_ID;
    const go = () => {
      if (this._isStory()) {
        navigateBackToRoute(
          STORY_ROUTE,
          `${STORY_URL}?id=${encodeURIComponent(id)}`,
        );
        return;
      }
      navigateBackToRoute(
        SHEET_ROUTE,
        `${SHEET_URL}?id=${encodeURIComponent(id)}`,
      );
    };
    this.persistDraft()
      .then(() => (this._isStory() ? Promise.resolve('') : this.refreshCoverThumb()))
      .then(go);
  },

  /** 只截第 1 页作封面小图（模块列表 / 作品列表） */
  refreshCoverThumb() {
    if (this._isStory()) return Promise.resolve('');
    const id = this.data.inviteId || TEMP_INVITE_ID;
    const page = (this.data.invitePages || [])[0];
    if (!page) return Promise.resolve('');
    return captureCoverThumb(id, page).then((coverThumbSrc) => {
      if (!coverThumbSrc) return '';
      return saveInviteDraft({ inviteId: id, coverThumbSrc }).then(
        () => coverThumbSrc,
      );
    });
  },

  onBackPress() {
    this.onBack();
    return true;
  },

  persistDraft() {
    // 画布页清掉误存的整页 src，避免预览被 demo 图盖住
    const pages = (this.data.invitePages || []).map((p) => {
      if (!p || typeof p !== 'object') return p;
      const next = { ...p };
      delete next.src;
      return next;
    });
    const id = this.data.inviteId || TEMP_INVITE_ID;
    if (this._isStory()) {
      return saveInviteDraft({
        inviteId: id,
        storyLine: {
          style: STORY_STYLE_PAGES,
          pages,
          pageIndex: this.data.invitePageIndex,
        },
        designAspect: DESIGN_ASPECT,
        meta: { source: 'edit/invite?from=story' },
      });
    }
    return saveInviteDraft({
      inviteId: id,
      pages,
      pageIndex: this.data.invitePageIndex,
      designAspect: DESIGN_ASPECT,
      meta: { source: 'edit/invite' },
    });
  },

  refreshLayerList() {
    const layerList = listLayers(
      this.data.invitePages,
      this.data.invitePageIndex,
    );
    this.setData({ layerList });
  },

  _getElement(id) {
    const { invitePages, invitePageIndex } = this.data;
    const els =
      (invitePages[invitePageIndex] && invitePages[invitePageIndex].elements) ||
      [];
    return els.find((item) => item.id === id) || null;
  },

  _getElementLayer(id) {
    const el = this._getElement(id);
    return el ? Number(el.layer) || 1 : 1;
  },

  _toolsForElement(id, level) {
    const el = this._getElement(id);
    const layer = el ? Number(el.layer) || 1 : 1;
    if (el && el.type === 'text') {
      if (level === 'style') return buildTextStyleTools();
      return buildTextElementTools(layer);
    }
    return buildElementTools(layer);
  },

  enterTextStyleLevel() {
    if (!this.data.activeElementId) return;
    this.setData({
      textToolLevel: 'style',
      toolboxTools: buildTextStyleTools(),
      toolboxActive: 'fontSize',
      elementEditMode: 'position',
      layerPickerVisible: false,
      ...this._closeTextStyleSheets(),
    });
  },

  exitTextStyleLevel() {
    const id = this.data.activeElementId;
    if (!id) return;
    const layer = this._getElementLayer(id);
    this.setData({
      textToolLevel: 'main',
      toolboxTools: buildTextElementTools(layer),
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
    const layer = this._getElementLayer(id);
    const el = this._getElement(id);
    const isText = el && el.type === 'text';
    this.setData({
      activeElementId: id,
      elementEditMode: 'position',
      textToolLevel: 'main',
      toolboxTools: this._toolsForElement(id, 'main'),
      // 选中后画布上手势调位置/大小/角度；底栏默认不高亮变换项
      toolboxActive: '',
      layerPanelVisible: false,
      layerPickerVisible: false,
      layerPickerValue: layer,
      layerPickerTargetId: '',
      ...this._closeTextStyleSheets(),
    });
    if (options.openContent && isText) {
      this.openTextContentSheet();
    }
  },

  /** 仅「完成」/删除后调用 */
  exitElementEdit() {
    this.setData({
      activeElementId: '',
      elementEditMode: 'position',
      textToolLevel: 'main',
      toolboxTools: this._idleTools(),
      toolboxActive: '',
      layerPickerVisible: false,
      layerPickerTargetId: '',
      keyboardHeight: 0,
      ...this._closeTextStyleSheets(),
    });
  },

  openLayerPicker(targetId, layerValue) {
    const id = targetId || this.data.activeElementId;
    if (!id) return;
    const layer = layerValue != null ? Number(layerValue) || 1 : this._getElementLayer(id);
    this.setData({
      toolboxActive: this.data.activeElementId ? 'layer' : this.data.toolboxActive,
      layerPickerVisible: true,
      layerPickerValue: layer,
      layerPickerTargetId: id,
    });
  },

  closeLayerPicker() {
    const patch = {
      layerPickerVisible: false,
      layerPickerTargetId: '',
    };
    if (this.data.activeElementId) {
      patch.toolboxActive = 'layer';
      patch.elementEditMode = 'position';
    }
    this.setData(patch);
  },

  onLayerPick(e) {
    const { layer } = e.detail || {};
    const targetId = this.data.layerPickerTargetId || this.data.activeElementId;
    if (!targetId || layer == null) return;
    const invitePages = setElementLayer(
      this.data.invitePages,
      this.data.invitePageIndex,
      targetId,
      layer,
    );
    const n = Number(layer) || 1;
    const patch = {
      invitePages,
      layerPickerVisible: false,
      layerPickerValue: n,
      layerPickerTargetId: '',
    };
    if (this.data.activeElementId === targetId) {
      const el = this._getElement(targetId);
      const isText = el && el.type === 'text';
      patch.textToolLevel = 'main';
      patch.toolboxTools = isText
        ? buildTextElementTools(n)
        : buildElementTools(n);
      patch.toolboxActive = 'layer';
      patch.elementEditMode = 'position';
    }
    this.setData(patch);
    if (this.data.layerPanelVisible) this.refreshLayerList();
  },

  onLayerEdit(e) {
    const { id, layer } = e.detail || {};
    if (!id) return;
    this.openLayerPicker(id, layer);
  },

  onToolboxSelect(e) {
    const { key, tool } = e.detail || {};
    if (!key) return;

    if (this.data.activeElementId) {
      if (key === 'layer') {
        this.openLayerPicker();
        return;
      }
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
    if (key === 'template') {
      if (this._isStory()) return;
      this.onPickTemplate();
      return;
    }
    if (key === 'layers') {
      this.openLayerPanel();
      return;
    }
    if (key === 'decor') {
      if (this._isStory()) return;
      this.openDecorSheet();
      return;
    }
    if (key === 'font') {
      this.onAddTextElement();
      return;
    }
    if (key === 'background') {
      // 故事线：上传图片作页背景；喜帖：色板背景
      if (this._isStory()) {
        this.onUploadPageBackground();
        return;
      }
      this.openBgSheet();
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
    if (!(ensured.pages && ensured.pages.length)) {
      wx.showToast({ title: '请先选择模板', icon: 'none' });
      this.setData({ toolboxActive: '' });
      return;
    }
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
        decorSheetVisible: false,
        bgSheetVisible: false,
        layerPanelVisible: false,
      },
      () => {
        // 默认加上「请输入文案」并进入选中态，不弹底部编辑框
        this.enterElementEdit(element.id);
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

  /** 预览：写入缓存后打开浏览页（草稿模式，无留言/现场） */
  openPreview() {
    this.setData({ toolboxActive: '' });
    const id = this.data.inviteId || TEMP_INVITE_ID;
    const page = this.data.invitePageIndex || 0;
    const pages = (this.data.invitePages || []).map((p) => {
      if (!p || typeof p !== 'object') return p;
      const next = { ...p };
      delete next.src;
      return next;
    });
    const isStory = this._isStory();
    const moduleKey = isStory ? 'story' : 'invite';
    this.persistDraft().then(() => {
      if (!isStory) {
        writeDraftPreviewSnap({ inviteId: id, pages, pageIndex: page });
      }
      wx.navigateTo({
        url: `/pages/wedding_invitation/view/index?mode=draft&id=${encodeURIComponent(id)}&module=${moduleKey}&page=${page}`,
        success(res) {
          if (
            !isStory &&
            res.eventChannel &&
            typeof res.eventChannel.emit === 'function'
          ) {
            res.eventChannel.emit('previewDraft', {
              inviteId: id,
              pages,
              pageIndex: page,
            });
          }
        },
      });
    });
  },

  onSave() {
    this.persistDraft().then(() => {
      wx.showToast({ title: '已保存到本地', icon: 'success' });
    });
  },

  onPickTemplate() {
    if (this._isStory()) return;
    this.setData({ toolboxActive: 'template' });
    const id = this.data.inviteId || TEMP_INVITE_ID;
    wx.navigateTo({
      url: `/pages/wedding_invitation/edit/template-list/index?from=edit&id=${id}`,
    });
  },


  openDecorSheet() {
    this.setData({
      toolboxActive: 'decor',
      decorSheetVisible: true,
      bgSheetVisible: false,
      layerPanelVisible: false,
    });
  },

  openBgSheet() {
    if (this._isStory()) {
      this.onUploadPageBackground();
      return;
    }
    this.setData({
      toolboxActive: 'background',
      bgSheetVisible: true,
      decorSheetVisible: false,
      layerPanelVisible: false,
    });
  },

  closeBgSheet() {
    this.setData({ bgSheetVisible: false });
  },

  /** 故事线：选图并设为当前页背景 */
  onUploadPageBackground() {
    if (this._bgUploading) return;
    this._bgUploading = true;
    this.setData({ toolboxActive: 'background' });
    chooseAndPersistPhotos({ count: 1 })
      .then((added) => {
        const photo = added && added[0];
        if (!photo || !photo.src) {
          this.setData({ toolboxActive: '' });
          return;
        }
        const { pages, pageIndex } = ensureEditablePage(
          this.data.invitePages,
          this.data.invitePageIndex,
        );
        const invitePages = updatePageBackground(pages, pageIndex, {
          bgSrc: photo.src,
        });
        this.setData({
          invitePages,
          invitePageIndex: pageIndex,
          toolboxActive: '',
          layoutRev: (this.data.layoutRev || 0) + 1,
        });
        return this.persistDraft();
      })
      .catch(() => {
        wx.showToast({ title: '上传失败', icon: 'none' });
        this.setData({ toolboxActive: '' });
      })
      .then(() => {
        this._bgUploading = false;
      });
  },

  onBgSelect(e) {
    const { asset } = e.detail || {};
    if (!asset || !asset.color) return;
    const { pages, pageIndex } = ensureEditablePage(
      this.data.invitePages,
      this.data.invitePageIndex
    );
    const invitePages = updatePageBackground(pages, pageIndex, {
      bgColor: asset.color,
      bgSrc: '',
    });
    this.setData({
      invitePages,
      invitePageIndex: pageIndex,
      bgSheetVisible: false,
      toolboxActive: '',
    });
  },

  closeDecorSheet() {
    this.setData({ decorSheetVisible: false });
  },

  openLayerPanel() {
    this.refreshLayerList();
    this.setData({
      toolboxActive: 'layers',
      layerPanelVisible: true,
      decorSheetVisible: false,
      bgSheetVisible: false,
    });
  },

  closeLayerPanel() {
    this.setData({
      layerPanelVisible: false,
      toolboxActive: this.data.activeElementId ? this.data.toolboxActive : '',
    });
  },

  onLayerSelect(e) {
    const { id } = e.detail || {};
    if (!id) return;
    // 图层面板可切换锁定目标
    this.enterElementEdit(id);
  },

  onDecorSelect(e) {
    const { asset } = e.detail || {};
    if (!asset) return;

    const ensured = ensureEditablePage(
      this.data.invitePages,
      this.data.invitePageIndex,
    );
    const layer = Math.min(10, getMaxLayer(ensured.pages, ensured.pageIndex) + 1);
    const element = createDecorElement(asset, { layer });
    const invitePages = appendElement(
      ensured.pages,
      ensured.pageIndex,
      element,
    );

    this.setData(
      {
        invitePages,
        invitePageIndex: ensured.pageIndex,
        decorSheetVisible: false,
      },
      () => {
        this.enterElementEdit(element.id);
      },
    );
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
