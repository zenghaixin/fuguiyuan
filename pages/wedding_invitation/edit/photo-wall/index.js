import { PHOTO_TOOLS } from '../toolbox';
import {
  saveInviteDraft,
  loadInviteDraft,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';
import {
  chooseAndPersistPhotos,
  removeLocalImage,
  MAX_PHOTO_WALL,
  DEFAULT_PHOTO_LAYOUT,
  normalizePhotoLayout,
  layoutSortCols,
  layoutGridMax,
} from '~/services/invite-photo-local';
const { previewPhotos, closeViewer } = require('../../utils/preview-photos');




/** 排序网格：min 高度保留；max 为完整 cols×cols（2×2 / 3×3） */

function calcSortGridHeight(windowWidth, windowHeight, photoCount, cols = 3) {

  const c = cols === 2 ? 2 : 3;
  const rpx = (windowWidth || 375) / 750;
  const panelPadX = 48 * rpx;
  const listPadX = 8 * rpx;
  const listPadTop = 8 * rpx;
  const listPadBottom = 16 * rpx;
  const gap = 16 * rpx;
  const innerW = (windowWidth || 375) - panelPadX - listPadX;
  const itemW = (innerW - gap * (c - 1)) / c;
  const itemH = (itemW * 4) / 3;
  const minH = Math.min(360, Math.max(280, Math.round((windowHeight || 667) * 0.42)));
  const maxH = Math.round(listPadTop + listPadBottom + itemH * c + gap * (c - 1));
  const rows = Math.max(1, Math.ceil((photoCount || 0) / c));
  const showRows = Math.min(rows, c);
  const contentH = Math.round(
    listPadTop + listPadBottom + itemH * showRows + gap * Math.max(showRows - 1, 0)
  );
  return Math.min(Math.max(minH, maxH), Math.max(minH, contentH));
}


Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    windowWidth: 375,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    photoWall: [],
    photoWallLayout: DEFAULT_PHOTO_LAYOUT,
    toolboxTools: PHOTO_TOOLS,


    toolboxActive: '',
    uploading: false,
    carouselIndex: 0,
    sortVisible: false,
    layoutVisible: false,
    /** 排序弹层内的草稿顺序，点「完成」才写回 photoWall */
    sortDraft: [],
    /** 排序网格高度 px */
    sortGridHeight: 320,
    /** 排序列数 */
    sortCols: 3,
    alertDialog: {
      visible: false,
      title: '',
      content: '',
      confirmText: '知道了',
    },
  },


  onLoad(query) {
    const { statusBarHeight, windowHeight, windowWidth } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    const draft = loadInviteDraft(inviteId);
    const photoWall = (draft && draft.photoWall) || [];
    let photoWallLayout = normalizePhotoLayout(
      (draft && draft.photoWallLayout) || DEFAULT_PHOTO_LAYOUT
    );
    // 宫格超张：自动退回左右滑动
    const gridMax = layoutGridMax(photoWallLayout);
    if (gridMax > 0 && photoWall.length > gridMax) {
      photoWallLayout = DEFAULT_PHOTO_LAYOUT;
    }

    const sortCols = layoutSortCols(photoWallLayout);
    this.setData({
      statusBarHeight,
      windowHeight,
      windowWidth,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      inviteId,
      photoWall,
      photoWallLayout,
      carouselIndex: 0,
      sortCols,
      sortGridHeight: calcSortGridHeight(
        windowWidth,
        windowHeight,
        photoWall.length,
        sortCols
      ),
    });
    if (draft && draft.photoWallLayout && draft.photoWallLayout !== photoWallLayout) {
      this.persistDraft();
    }
  },

  onShow() {
    // 选图会触发 hide/show，上传中勿用旧草稿覆盖内存里的新图
    if (this.data.uploading) return;
    const draft = loadInviteDraft(this.data.inviteId);
    if (!draft) return;
    const photoWall = draft.photoWall || [];
    const max = Math.max(photoWall.length - 1, 0);
    let photoWallLayout = normalizePhotoLayout(
      draft.photoWallLayout || DEFAULT_PHOTO_LAYOUT
    );
    const gridMaxOnShow = layoutGridMax(photoWallLayout);
    if (gridMaxOnShow > 0 && photoWall.length > gridMaxOnShow) {
      photoWallLayout = DEFAULT_PHOTO_LAYOUT;
    }
    this.setData({
      photoWall,
      photoWallLayout,
      sortCols: layoutSortCols(photoWallLayout),
      carouselIndex: Math.min(this.data.carouselIndex || 0, max),
    });
  },






  onHide() {
    this.persistDraft();
  },

  onUnload() {
    this.persistDraft();
  },

  /** 从页列表进 → 回上一页；大图打开时先关预览 */
  onBack() {
    if (closeViewer()) return;
    this.persistDraft();
    wx.navigateBack({ delta: 1 });
  },

  persistDraft() {
    return saveInviteDraft({
      inviteId: this.data.inviteId || TEMP_INVITE_ID,
      photoWall: this.data.photoWall,
      photoWallLayout: normalizePhotoLayout(
        this.data.photoWallLayout || DEFAULT_PHOTO_LAYOUT
      ),
      meta: { source: 'edit/photo-wall' },
    });
  },


  onToolboxSelect(e) {
    const { key, tool } = e.detail || {};
    if (!key) return;
    this.setData({ toolboxActive: key });

    if (key === 'preview') {
      this.openPreview();
      return;
    }
    if (key === 'upload') {
      this.onAddPhoto();
      return;
    }
    if (key === 'layout') {
      this.openLayoutSheet();
      return;
    }
    if (key === 'sort') {
      this.openSortSheet();
      return;
    }


    wx.showToast({
      title: `${(tool && tool.label) || key}（稍后接）`,
      icon: 'none',
    });
  },

  openSortSheet() {
    const list = this.data.photoWall || [];
    if (list.length < 2) {
      wx.showToast({ title: '至少两张才能排序', icon: 'none' });
      this.setData({ toolboxActive: '' });
      return;
    }
    // 宫格：入口统一在工具箱，完成方式为台上长按拖
    if (layoutGridMax(this.data.photoWallLayout) > 0) {
      wx.showToast({ title: '长按照片拖动即可排序', icon: 'none' });
      this.setData({ toolboxActive: '' });
      return;
    }
    const sortCols = layoutSortCols(this.data.photoWallLayout);
    this.setData({
      sortVisible: true,
      sortDraft: list.slice(),
      sortCols,
      sortGridHeight: calcSortGridHeight(
        this.data.windowWidth,
        this.data.windowHeight,
        list.length,
        sortCols
      ),
    });
  },

  /** 点「完成」：草稿写回编辑区并落盘 */
  confirmSortSheet() {
    const sortDraft = this.data.sortDraft || [];
    let carouselIndex = this.data.carouselIndex || 0;
    if (carouselIndex >= sortDraft.length) {
      carouselIndex = Math.max(sortDraft.length - 1, 0);
    }
    this.setData({
      photoWall: sortDraft.slice(),
      carouselIndex,
      sortVisible: false,
      toolboxActive: '',
      sortDraft: [],
    });
    this.persistDraft();
  },

  /** 点遮罩：放弃本次排序 */
  cancelSortSheet() {
    this.setData({
      sortVisible: false,
      toolboxActive: '',
      sortDraft: [],
    });
  },

  openLayoutSheet() {
    this.setData({ layoutVisible: true });
  },

  closeLayoutSheet() {
    this.setData({ layoutVisible: false, toolboxActive: '' });
  },

  onAlertDialogClose() {
    this.setData({ 'alertDialog.visible': false });
  },


  onLayoutSelect(e) {
    const layout = normalizePhotoLayout(
      (e.detail && e.detail.layout) || DEFAULT_PHOTO_LAYOUT
    );
    if (layout === this.data.photoWallLayout) {
      this.closeLayoutSheet();
      return;
    }
    const count = (this.data.photoWall || []).length;
    const gridMax = layoutGridMax(layout);
    if (gridMax > 0 && count > gridMax) {
      const name = layout === 'grid9' ? '九宫格' : '四宫格';
      this.setData({
        alertDialog: {
          visible: true,
          title: '照片过多',
          content: `${name}最多 ${gridMax} 张，当前 ${count} 张，请先删除多余照片后再切换`,
          confirmText: '知道了',
        },
      });
      return;
    }


    const sortCols = layoutSortCols(layout);
    this.setData({
      photoWallLayout: layout,
      sortCols,
      sortGridHeight: calcSortGridHeight(
        this.data.windowWidth,
        this.data.windowHeight,
        count,
        sortCols
      ),
    });
    this.persistDraft();
    this.closeLayoutSheet();
  },







  noop() {},

  /** 轮播 / 排序：点击查看大图（与预览态叠放同一套） */
  previewPhotosAt(index) {
    previewPhotos(this.data.photoWall || [], index);
  },

  onStripSelect(e) {
    const index = Number(e.detail && e.detail.index);
    if (Number.isNaN(index) || index < 0) return;
    const list =
      this.data.sortVisible && (this.data.sortDraft || []).length
        ? this.data.sortDraft
        : this.data.photoWall || [];
    previewPhotos(list, index);
  },

  onCarouselPreview(e) {
    const index = Number(e.detail && e.detail.index);
    if (Number.isNaN(index) || index < 0) return;
    this.previewPhotosAt(index);
  },

  /** 排序弹层：只改草稿；宫格台上长按：直接改 photoWall */
  onStripReorder(e) {
    const from = Number(e.detail && e.detail.from);
    const to = Number(e.detail && e.detail.to);
    if (Number.isNaN(from) || Number.isNaN(to) || from === to) return;

    if (this.data.sortVisible) {
      const list = (this.data.sortDraft || []).slice();
      if (from < 0 || from >= list.length || to < 0 || to >= list.length) return;
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      const sortCols = layoutSortCols(this.data.photoWallLayout);
      this.setData({
        sortDraft: list,
        sortCols,
        sortGridHeight: calcSortGridHeight(
          this.data.windowWidth,
          this.data.windowHeight,
          list.length,
          sortCols
        ),
      });
      return;
    }

    const list = (this.data.photoWall || []).slice();
    if (from < 0 || from >= list.length || to < 0 || to >= list.length) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    let carouselIndex = this.data.carouselIndex || 0;
    if (carouselIndex === from) carouselIndex = to;
    else if (from < carouselIndex && to >= carouselIndex) carouselIndex -= 1;
    else if (from > carouselIndex && to <= carouselIndex) carouselIndex += 1;
    this.setData({ photoWall: list, carouselIndex });
    this.persistDraft();
  },






  openPreview() {
    this.setData({ toolboxActive: '' });
    this.persistDraft().then(() => {
      const id = this.data.inviteId || TEMP_INVITE_ID;
      wx.navigateTo({
        url: `/pages/wedding_invitation/view/index?mode=draft&id=${id}&module=photo`,
      });
    });
  },



  onAddPhoto() {
    if (this.data.uploading) return;
    this.setData({ toolboxActive: 'upload' });
    const cur = this.data.photoWall || [];
    const layout = normalizePhotoLayout(this.data.photoWallLayout);
    let remain = MAX_PHOTO_WALL - cur.length;
    const gridMax = layoutGridMax(layout);
    if (gridMax > 0) {
      remain = Math.min(remain, gridMax - cur.length);
      if (remain <= 0) {
        const name = layout === 'grid9' ? '九宫格' : '四宫格';
        wx.showToast({
          title: `${name}最多 ${gridMax} 张，请先删除`,
          icon: 'none',
        });
        this.setData({ toolboxActive: '' });
        return;
      }
    }

    if (remain <= 0) {
      wx.showToast({ title: `最多 ${MAX_PHOTO_WALL} 张`, icon: 'none' });
      this.setData({ toolboxActive: '' });
      return;
    }

    this.setData({ uploading: true, toolboxActive: '' });
    chooseAndPersistPhotos({ count: Math.min(9, remain) })
      .then((added) => {
        if (!added.length) return null;
        const photoWall = cur.concat(added);
        const photoWallLayout =
          this.data.photoWallLayout || DEFAULT_PHOTO_LAYOUT;
        // 先落盘再刷新界面，避免选图回页 onShow 读到空草稿
        return saveInviteDraft({
          inviteId: this.data.inviteId || TEMP_INVITE_ID,
          photoWall,
          photoWallLayout: normalizePhotoLayout(photoWallLayout),
          meta: { source: 'edit/photo-wall' },
        }).then(() => {
          // 定位到本次新加的第一张（空列表上传即 1/N，而不是最后一张 N/N）
          this.setData({
            photoWall,
            photoWallLayout,
            carouselIndex: cur.length,
          });
          wx.showToast({ title: `已添加 ${added.length} 张`, icon: 'success' });
        });
      })
      .catch(() => {
        wx.showToast({ title: '添加失败', icon: 'none' });
      })
      .then(() => {
        this.setData({ uploading: false });
      });
  },


  onCarouselChange(e) {
    const current = (e.detail && e.detail.current) || 0;
    this.setData({ carouselIndex: current });
  },

  onDeletePhoto(e) {
    const id = e.detail && e.detail.id;
    if (!id) return;
    const cur = this.data.photoWall || [];
    const idx = cur.findIndex((p) => p.id === id);
    const target = idx >= 0 ? cur[idx] : null;
    const photoWall = cur.filter((p) => p.id !== id);
    let carouselIndex = this.data.carouselIndex || 0;
    if (idx >= 0 && carouselIndex >= photoWall.length) {
      carouselIndex = Math.max(photoWall.length - 1, 0);
    } else if (idx >= 0 && carouselIndex > idx) {
      carouselIndex = Math.max(carouselIndex - 1, 0);
    }
    this.setData({ photoWall, carouselIndex });
    this.persistDraft();
    if (target && target.src) {
      removeLocalImage(target.src);
    }
  },
});
