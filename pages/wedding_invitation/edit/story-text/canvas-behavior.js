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
import { textBlockToPage } from '../../utils/story-line';

function closeSheets() {
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
}

export default Behavior({
  methods: {
    openCanvas(block, options = {}) {
      const blocks = (this.data.blocks || []).slice();
      const idx = blocks.findIndex((b) => b && b.id === block.id);
      let canvasPages = idx >= 0 ? blocks[idx].canvasPages : null;
      if (!canvasPages || !canvasPages.length) {
        canvasPages = [textBlockToPage(block)];
      }
      if (idx >= 0) blocks[idx] = { ...blocks[idx], canvasPages };
      const page = canvasPages[0];
      const textEl = (page.elements || []).find((e) => e && e.type === 'text');
      const select = options.select !== false;
      this.setData({
        blocks: idx >= 0 ? blocks : this.data.blocks,
        editorOn: true,
        blockId: block.id,
        invitePages: canvasPages,
        invitePageIndex: 0,
        activeElementId: select && textEl ? textEl.id : '',
        lockSwipe: !!(select && textEl),
        elementEditMode: 'position',
        textToolLevel: 'main',
        toolboxTools: select && textEl ? buildStoryTextElementTools() : STORY_TEXT_TOOLS,
        toolboxActive: '',
        fontFamilies: FONT_FAMILIES,
        fontSizes: FONT_SIZES,
        fontWeights: FONT_WEIGHTS,
        textColors: TEXT_COLORS,
        textBgColors: TEXT_BG_COLORS,
        textAligns: TEXT_ALIGNS,
        textValigns: TEXT_VALIGNS,
        textAnims: TEXT_ANIMS,
        currentTextAnim: '',
        currentFontKey: 'sans',
        currentAlign: 'center',
        currentValign: 'middle',
        textColorValue: '#3d2914',
        keyboardHeight: 0,
        textFocus: false,
        ...closeSheets(),
      }, () => {
        if (options.openInput && textEl) {
          this.openTextContentSheet();
        }
      });
    },

    _getElement(id) {
      const { invitePages, invitePageIndex } = this.data;
      const els =
        (invitePages[invitePageIndex] && invitePages[invitePageIndex].elements) ||
        [];
      return els.find((item) => item.id === id) || null;
    },

    _closeTextStyleSheets() {
      return closeSheets();
    },

    enterElementEdit(id, options = {}) {
      const el = this._getElement(id);
      if (!(el && el.type === 'text')) return;
      this.setData({
        activeElementId: id,
        lockSwipe: true,
        elementEditMode: 'position',
        textToolLevel: 'main',
        toolboxTools: buildStoryTextElementTools(),
        toolboxActive: '',
        ...closeSheets(),
      });
      if (options && options.openContent) this.openTextContentSheet();
    },

    exitElementEdit() {
      this.setData({
        activeElementId: '',
        lockSwipe: false,
        textToolLevel: 'main',
        toolboxTools: STORY_TEXT_TOOLS,
        toolboxActive: '',
        keyboardHeight: 0,
        ...closeSheets(),
      });
    },

    enterTextStyleLevel() {
      if (!this.data.activeElementId) return;
      this.setData({
        textToolLevel: 'style',
        toolboxTools: buildTextStyleTools(),
        toolboxActive: 'fontSize',
        ...closeSheets(),
      });
    },

    exitTextStyleLevel() {
      if (!this.data.activeElementId) return;
      this.setData({
        textToolLevel: 'main',
        toolboxTools: buildStoryTextElementTools(),
        toolboxActive: 'style',
        ...closeSheets(),
      });
    },

    onCanvasToolboxSelect(e) {
      const { key } = e.detail || {};
      if (!key) return;
      if (key === 'addText' && typeof this.onAddText === 'function') {
        this.onAddText();
        return;
      }
      if (key === 'addPhoto' && typeof this.onAddBlock === 'function') {
        this.onAddBlock('photo');
        return;
      }
      if (this.data.activeElementId) {
        if (key === 'delete') return this.confirmDeleteElement();
        if (key === 'done') return this.exitElementEdit();
        if (key === 'content') return this.openTextContentSheet();
        if (key === 'style') return this.enterTextStyleLevel();
        if (key === 'anim') return this.openTextAnimSheet();
        if (key === 'back') return this.exitTextStyleLevel();
        if (key === 'fontSize') {
          this.setData({ toolboxActive: key, ...closeSheets(), textSizeVisible: true });
          return;
        }
        if (key === 'fontFamily') {
          const el = this._getElement(this.data.activeElementId);
          this.setData({
            toolboxActive: key,
            ...closeSheets(),
            textFontVisible: true,
            currentFontKey: (el && el.fontFamily) || 'sans',
          });
          return;
        }
        if (key === 'color') {
          const el = this._getElement(this.data.activeElementId);
          this.setData({
            toolboxActive: key,
            ...closeSheets(),
            textColorVisible: true,
            textColorValue: (el && el.color) || '#3d2914',
          });
          return;
        }
        if (key === 'bg') {
          this.setData({ toolboxActive: key, ...closeSheets(), textBgVisible: true });
          return;
        }
        if (key === 'weight') {
          this.setData({ toolboxActive: key, ...closeSheets(), textWeightVisible: true });
          return;
        }
        if (key === 'align') {
          const el = this._getElement(this.data.activeElementId);
          this.setData({
            toolboxActive: key,
            ...closeSheets(),
            textAlignVisible: true,
            currentAlign: (el && el.align) || 'center',
            currentValign: (el && el.valign) || 'middle',
          });
          return;
        }
        if (key === 'reset') {
          this.confirmResetText(this.data.textToolLevel === 'style' ? 'style' : 'default');
          return;
        }
        return;
      }
      if (key === 'delete' && typeof this.onDeleteBlock === 'function') {
        this.onDeleteBlock();
        return;
      }
      this.setData({ toolboxActive: key });
      if (key === 'font') this.onAddTextElement();
      if (key === 'save') this.onSave();
      if (key === 'preview') this.openPreview();
    },

    onAddTextElement() {
      const ensured = ensureEditablePage(this.data.invitePages, this.data.invitePageIndex);
      const layer = Math.min(10, getMaxLayer(ensured.pages, ensured.pageIndex) + 1);
      const element = createTextElement({ layer });
      const invitePages = appendElement(ensured.pages, ensured.pageIndex, element);
      this.setData({ invitePages, invitePageIndex: ensured.pageIndex, toolboxActive: '' }, () => {
        this.enterElementEdit(element.id);
      });
    },

    patchActiveText(patch) {
      const { activeElementId, invitePages, invitePageIndex } = this.data;
      if (!activeElementId) return;
      const el = this._getElement(activeElementId);
      if (!el || el.type !== 'text') return;
      this.setData({
        invitePages: updateElement(invitePages, invitePageIndex, activeElementId, patch),
      });
    },

    openTextContentSheet() {
      const el = this._getElement(this.data.activeElementId);
      if (!el || el.type !== 'text') return;
      this.setData({
        toolboxActive: 'content',
        ...closeSheets(),
        textContentVisible: true,
        textContentDraft: el.text || '',
        textFocus: false,
        keyboardHeight: 0,
      }, () => {
        // 等输入框挂上后再聚焦，第一次进入才会拉起键盘
        setTimeout(() => {
          this.setData({ textFocus: true });
        }, 60);
      });
    },

    closeTextContentSheet() {
      this.setData({
        textContentVisible: false,
        textFocus: false,
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
      this.setData({ textContentVisible: false, toolboxActive: 'content', keyboardHeight: 0 }, () => {
        if (typeof this.persistCanvas === 'function') this.persistCanvas();
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
      this.patchActiveText({ fontFamily: key });
      this.setData({ textFontVisible: false, toolboxActive: 'fontFamily', currentFontKey: key });
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

    openTextAnimSheet() {
      const el = this._getElement(this.data.activeElementId);
      if (!el || el.type !== 'text') return;
      this.setData({
        toolboxActive: 'anim',
        ...closeSheets(),
        textAnimVisible: true,
        textAnims: TEXT_ANIMS,
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
      }, () => {
        if (typeof this.persistCanvas === 'function') this.persistCanvas();
      });
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
      const action = this.data.dialog && this.data.dialog.action;
      this.setData({ 'dialog.visible': false }, () => {
        setTimeout(() => {
          if (action === 'deleteElement') this.onDeleteElement();
          if (action === 'resetTextDefault') this.resetActiveTextToDefault();
          if (action === 'resetTextStyle') this.resetActiveTextStyle();
        }, 32);
      });
    },

    confirmDeleteElement() {
      if (!this.data.activeElementId) return;
      this.openDialog({
        title: '删除确认',
        content: '确定删除该文字吗？删除后无法恢复。',
        confirmText: '删除',
        danger: true,
        action: 'deleteElement',
      });
    },

    confirmResetText(kind) {
      if (kind === 'style') {
        this.openDialog({
          title: '重置样式',
          content: '确定将字号、字体、颜色、背景、字重、排版恢复为默认吗？文案不会改动。',
          confirmText: '重置',
          action: 'resetTextStyle',
        });
        return;
      }
      this.openDialog({
        title: '重置确认',
        content: '确定恢复为新建时的默认状态吗？位置、大小、旋转和样式会重置，文案不会改动。',
        confirmText: '重置',
        action: 'resetTextDefault',
      });
    },

    resetActiveTextToDefault() {
      const id = this.data.activeElementId;
      const el = this._getElement(id);
      if (!el || el.type !== 'text') return;
      this.setData({
        invitePages: updateElement(this.data.invitePages, this.data.invitePageIndex, id, {
          ...DEFAULT_TEXT_STYLE,
          ...DEFAULT_TEXT_LAYOUT,
        }),
        layoutRev: (this.data.layoutRev || 0) + 1,
        toolboxActive: 'reset',
        toolboxTools: buildStoryTextElementTools(),
        ...closeSheets(),
      });
    },

    resetActiveTextStyle() {
      this.patchActiveText({ ...DEFAULT_TEXT_STYLE });
      this.setData({ toolboxActive: 'reset', ...closeSheets() });
    },

    onSelectElement(e) {
      if (!this._isCurrentCanvasEvent(e)) return;
      const id = e.detail && e.detail.id;
      if (!id) return;
      if (this.data.activeElementId && id !== this.data.activeElementId) return;
      if (id === this.data.activeElementId) return;
      this.enterElementEdit(id);
    },

    onDeleteElement() {
      const { activeElementId, invitePages, invitePageIndex } = this.data;
      if (!activeElementId) return;
      this.setData({ invitePages: removeElement(invitePages, invitePageIndex, activeElementId) });
      this.exitElementEdit();
    },

    _isCurrentCanvasEvent(e) {
      const raw = e && e.currentTarget && e.currentTarget.dataset
        ? e.currentTarget.dataset.index
        : '';
      if (raw === '' || raw == null) return true;
      return Number(raw) === this.data.current;
    },

    onElementChange(e) {
      if (!this._isCurrentCanvasEvent(e)) return;
      const detail = e.detail || {};
      if (!detail.id) return;
      if (this.data.activeElementId && detail.id !== this.data.activeElementId) return;
      const patch = {};
      ['x', 'y', 'w', 'h', 'rotate', 'layer'].forEach((k) => {
        if (detail[k] != null) patch[k] = detail[k];
      });
      if (!Object.keys(patch).length) return;
      this.setData({
        invitePages: updateElement(
          this.data.invitePages,
          this.data.invitePageIndex,
          detail.id,
          patch,
        ),
      });
    },

    onSave() {
      if (typeof this.persistCanvas === 'function') {
        this.persistCanvas();
      }
      wx.showToast({ title: '已保存到本地', icon: 'success' });
    },

    openPreview() {
      const id = this.data.inviteId;
      const go = () => {
        wx.navigateTo({
          url: `/pages/wedding_invitation/view/index?mode=draft&id=${encodeURIComponent(id)}&module=story`,
        });
      };
      if (typeof this.persistCanvas === 'function') {
        const ret = this.persistCanvas();
        if (ret && ret.then) ret.then(go);
        else go();
      } else go();
    },

    noop() {},
  },
});
