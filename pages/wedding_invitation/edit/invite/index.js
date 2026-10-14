import { INVITE_TOOLS, buildElementTools } from '../toolbox';
import { DECOR_ASSETS } from '../decor-assets';
import {
  ensureEditablePage,
  createDecorElement,
  appendElement,
  updateElement,
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

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    invitePages: [],
    invitePageIndex: 0,
    activeElementId: '',
    elementEditMode: 'position',
    toolboxTools: INVITE_TOOLS,
    toolboxActive: '',
    decorSheetVisible: false,
    decorAssets: DECOR_ASSETS,
    layerPanelVisible: false,
    layerList: [],
    layerPickerVisible: false,
    layerPickerValue: 1,
    layerPickerTargetId: '',
  },

  onLoad() {
    const { statusBarHeight, windowHeight } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const draft = loadInviteDraft(TEMP_INVITE_ID);
    this.setData({
      statusBarHeight,
      windowHeight,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      inviteId: TEMP_INVITE_ID,
      invitePages: (draft && draft.pages) || [],
      invitePageIndex: (draft && draft.pageIndex) || 0,
    });
  },

  onHide() {
    this.persistDraft();
  },

  onUnload() {
    this.persistDraft();
  },

  onBack() {
    this.persistDraft();
    wx.navigateBack({ delta: 1 });
  },

  persistDraft() {
    return saveInviteDraft({
      inviteId: this.data.inviteId || TEMP_INVITE_ID,
      pages: this.data.invitePages,
      pageIndex: this.data.invitePageIndex,
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

  _getElementLayer(id) {
    const { invitePages, invitePageIndex } = this.data;
    const els = (invitePages[invitePageIndex] && invitePages[invitePageIndex].elements) || [];
    const el = els.find((item) => item.id === id);
    return el ? Number(el.layer) || 1 : 1;
  },

  enterElementEdit(id) {
    if (!id) {
      this.exitElementEdit();
      return;
    }
    const layer = this._getElementLayer(id);
    this.setData({
      activeElementId: id,
      elementEditMode: 'position',
      toolboxTools: buildElementTools(layer),
      toolboxActive: 'position',
      layerPanelVisible: false,
      layerPickerVisible: false,
      layerPickerValue: layer,
      layerPickerTargetId: '',
    });
  },

  /** 仅「完成」/删除后调用 */
  exitElementEdit() {
    this.setData({
      activeElementId: '',
      elementEditMode: 'position',
      toolboxTools: INVITE_TOOLS,
      toolboxActive: '',
      layerPickerVisible: false,
      layerPickerTargetId: '',
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
      patch.toolboxActive = 'position';
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
      patch.toolboxTools = buildElementTools(n);
      patch.toolboxActive = 'position';
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
      if (key === 'position' || key === 'size' || key === 'angle') {
        this.setData({
          toolboxActive: key,
          elementEditMode: key,
          layerPickerVisible: false,
        });
        return;
      }
      if (key === 'layer') {
        this.openLayerPicker();
        return;
      }
      if (key === 'delete') {
        this.onDeleteElement();
        return;
      }
      if (key === 'done') {
        this.exitElementEdit();
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
      this.onPickTemplate();
      return;
    }
    if (key === 'layers') {
      this.openLayerPanel();
      return;
    }
    if (key === 'decor') {
      this.openDecorSheet();
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

  /** 预览：写入缓存后打开浏览页（草稿模式，无留言/现场） */
  openPreview() {
    this.setData({ toolboxActive: '' });
    this.persistDraft().then(() => {
      const id = this.data.inviteId || TEMP_INVITE_ID;
      wx.navigateTo({
        url: `/pages/wedding_invitation/view/index?mode=draft&id=${id}`,
      });
    });
  },

  onSave() {
    this.persistDraft().then(() => {
      wx.showToast({ title: '已保存到本地', icon: 'success' });
    });
  },

  onPickTemplate() {
    this.setData({ toolboxActive: 'template' });
    wx.showToast({ title: '模板选择稍后接', icon: 'none' });
  },

  openDecorSheet() {
    this.setData({
      toolboxActive: 'decor',
      decorSheetVisible: true,
      layerPanelVisible: false,
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

    this.setData({
      invitePages,
      invitePageIndex: ensured.pageIndex,
      decorSheetVisible: false,
    });
    this.enterElementEdit(element.id);
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
    this.setData({ invitePages, activeElementId: id });
  },
});
