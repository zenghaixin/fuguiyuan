import { PHOTO_TOOLS } from '../toolbox';
import {
  saveInviteDraft,
  loadInviteDraft,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';
import {
  chooseAndPersistPhotos,
  removeLocalImage,
  pruneMissingLocalPhotos,
  MAX_PHOTO_WALL,
  DEFAULT_PHOTO_LAYOUT,
  normalizePhotoLayout,
  layoutSortCols,
  layoutGridMax,
  layoutDisplayName,
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
    /** 网格裁剪：当前选中的照片 id */
    selectedPhotoId: '',
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


  /** 草稿只存路径；清缓存后文件可能丢，这里校验并剔除失效项 */
  applyPhotoWall(rawList, opts = {}) {
    const { list, removed } = pruneMissingLocalPhotos(rawList || []);
    if (removed > 0 && opts.notify !== false) {
      wx.showToast({
        title: `${removed} 张本地图已失效，请重新添加`,
        icon: 'none',
        duration: 2500,
      });
    }
    return { list, removed };
  },

  onLoad(query) {
    const { statusBarHeight, windowHeight, windowWidth } = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    const draft = loadInviteDraft(inviteId);
    const pruned = this.applyPhotoWall((draft && draft.photoWall) || []);
    const photoWall = pruned.list;
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
    if (
      pruned.removed > 0 ||
      (draft && draft.photoWallLayout && draft.photoWallLayout !== photoWallLayout)
    ) {
      this.persistDraft();
    }
  },

  onShow() {
    // 选图会触发 hide/show，上传中勿用旧草稿覆盖内存里的新图
    if (this.data.uploading) return;
    const draft = loadInviteDraft(this.data.inviteId);
    if (!draft) return;
    const pruned = this.applyPhotoWall(draft.photoWall || [], {
      // onLoad 已提示过则 onShow 静默（同一次进页）
      notify: !this._prunedNotified,
    });
    if (pruned.removed > 0) this._prunedNotified = true;
    const photoWall = pruned.list;
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
    if (pruned.removed > 0) this.persistDraft();
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
    if (key === 'crop') {
      this.openCoverEditor();
      return;
    }

    wx.showToast({
      title: `${(tool && tool.label) || key}（稍后接）`,
      icon: 'none',
    });
  },

  onMagazineSelect(e) {
    const id = e.detail && e.detail.id;
    if (!id) return;
    this.setData({ selectedPhotoId: id });
  },

  /**
   * 全屏裁剪：
   * - 网格：当前点选的那张，框比=占格真实宽高比
   * - 其它排版：当前看到的那张（carouselIndex），框比=舞台可视区
   */
  openCoverEditor() {
    const list = this.data.photoWall || [];
    if (!list.length) {
      wx.showToast({ title: '请先添加照片', icon: 'none' });
      this.setData({ toolboxActive: '' });
      return;
    }

    const wall = this.selectComponent('#editPhotoWall');
    const isGrid = layoutGridMax(this.data.photoWallLayout) > 0;
    let payload = null;

    if (isGrid) {
      let id = this.data.selectedPhotoId;
      if (!id && list.length === 1 && list[0]) {
        id = list[0].id;
        this.setData({ selectedPhotoId: id });
      }
      if (!id) {
        wx.showToast({ title: '请先点选一张照片', icon: 'none' });
        this.setData({ toolboxActive: '' });
        return;
      }
      payload =
        wall && typeof wall.getCropPayload === 'function'
          ? wall.getCropPayload(id)
          : null;
      if (!payload || !payload.src) {
        const photo = list.find((p) => p && p.id === id);
        if (!photo || !photo.src) {
          wx.showToast({ title: '请先点选一张照片', icon: 'none' });
          this.setData({ toolboxActive: '' });
          return;
        }
        payload = {
          id: photo.id,
          src: photo.src,
          cellAspect: 1,
          coverCrop: photo.coverCrop,
          coverFocus: photo.coverFocus,
        };
      }
      // 网格族：裁剪框锁定格子比例，禁止自由拉框
      if (payload) payload.lockAspect = true;
    } else {
      const idx = Math.max(
        0,
        Math.min(list.length - 1, Number(this.data.carouselIndex) || 0)
      );
      const photo = list[idx];
      if (!photo || !photo.src) {
        wx.showToast({ title: '当前没有可裁剪的照片', icon: 'none' });
        this.setData({ toolboxActive: '' });
        return;
      }
      let cellAspect = 0.75;
      if (wall && typeof wall.getViewportAspect === 'function') {
        cellAspect = wall.getViewportAspect() || cellAspect;
      } else {
        const w = this.data.windowWidth || 375;
        const h = Math.max(1, (this.data.windowHeight || 667) * 0.55);
        cellAspect = w / h;
      }
      payload = {
        id: photo.id,
        src: photo.src,
        cellAspect,
        coverCrop: photo.coverCrop,
        coverFocus: photo.coverFocus,
        lockAspect: false,
      };
      this.setData({ selectedPhotoId: photo.id });
    }

    const editor = this.selectComponent('#coverEditor');
    if (!editor || typeof editor.open !== 'function') {
      wx.showToast({ title: '裁剪组件未就绪', icon: 'none' });
      this.setData({ toolboxActive: '' });
      return;
    }
    editor.open(payload);
    this.setData({ toolboxActive: 'crop' });
  },

  onCoverEditorConfirm(e) {
    const d = e.detail || {};
    const id = d.id;
    if (!id || !d.coverCrop) {
      this.setData({ toolboxActive: '' });
      return;
    }
    const coverCrop = {
      x: Number(d.coverCrop.x),
      y: Number(d.coverCrop.y),
      w: Number(d.coverCrop.w),
      h: Number(d.coverCrop.h),
    };
    const coverFocus = d.coverFocus
      ? { x: Number(d.coverFocus.x), y: Number(d.coverFocus.y) }
      : undefined;
    const list = (this.data.photoWall || []).map((p) => {
      if (!p || p.id !== id) return p;
      return {
        ...p,
        coverCrop,
        coverFocus: coverFocus || p.coverFocus,
        imgRatio: Number(d.imgRatio) > 0 ? Number(d.imgRatio) : p.imgRatio,
      };
    });
    this.setData({ photoWall: list, toolboxActive: '' });
    Promise.resolve(this.persistDraft()).catch(() => {});
  },

  onCoverEditorCancel() {
    this.setData({ toolboxActive: '' });
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
    const prevLayout = this.data.photoWallLayout;
    const count = (this.data.photoWall || []).length;
    const gridMax = layoutGridMax(layout);
    if (gridMax > 0 && count > gridMax) {
      const name = layoutDisplayName(layout);
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

    // 网格族风格：清掉旧 frame，按该风格默认模板重排
    const isGridFamily =
      layoutGridMax(layout) > 0;
    let photoWall = this.data.photoWall || [];
    if (isGridFamily) {
      photoWall = photoWall.map((p) => {
        if (!p) return p;
        const next = { ...p };
        delete next.frame;
        return next;
      });
    }

    if (layout === prevLayout && !isGridFamily) {
      this.closeLayoutSheet();
      return;
    }

    const sortCols = layoutSortCols(layout);
    this.setData({
      photoWallLayout: layout,
      photoWall,
      selectedPhotoId: '',
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
  previewPhotosAt(index, opts = {}) {
    const list = this.data.photoWall || [];
    if (opts.single) {
      const p = list[index];
      previewPhotos(p ? [p] : [], 0, {
        showIndex: false,
        swipeable: false,
      });
      return;
    }
    previewPhotos(list, index, opts);
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
    const d = e.detail || {};
    this.previewPhotosAt(index, {
      showIndex: d.showIndex,
      swipeable: d.swipeable,
      single: d.single,
    });
  },

  /** 杂志主图：补默认占位 frame */
  onMagazineFramesEnsure(e) {
    const photos = (e.detail && e.detail.photos) || [];
    if (!photos.length) return;
    const prev = this.data.photoWall || [];
    // 占格没变就别 setData，避免和子组件互刷触发渲染层错误
    if (
      prev.length === photos.length &&
      prev.every((p, i) => {
        const q = photos[i];
        const a = p && p.frame;
        const b = q && q.frame;
        return (
          p &&
          q &&
          p.id === q.id &&
          a &&
          b &&
          a.c === b.c &&
          a.r === b.r &&
          a.cs === b.cs &&
          a.rs === b.rs
        );
      })
    ) {
      return;
    }
    this.setData({ photoWall: photos });
    Promise.resolve(this.persistDraft()).catch(() => {});
  },

  /** 杂志主图：拖动/缩放后写回 frame */
  onMagazineFrameChange(e) {
    const id = e.detail && e.detail.id;
    const frame = e.detail && e.detail.frame;
    if (!id || !frame) return;
    const list = (this.data.photoWall || []).map((p) => {
      if (!p || p.id !== id) return p;
      return { ...p, frame: { ...frame } };
    });
    this.setData({ photoWall: list });
    Promise.resolve(this.persistDraft()).catch(() => {});
  },

  /** 网格：格内画面焦点（解决头被裁掉等） */
  onMagazineCoverFocus(e) {
    const id = e.detail && e.detail.id;
    const coverFocus = e.detail && e.detail.coverFocus;
    if (!id || !coverFocus) return;
    const list = (this.data.photoWall || []).map((p) => {
      if (!p || p.id !== id) return p;
      return {
        ...p,
        coverFocus: {
          x: Number(coverFocus.x),
          y: Number(coverFocus.y),
        },
      };
    });
    this.setData({ photoWall: list });
    Promise.resolve(this.persistDraft()).catch(() => {});
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
    Promise.resolve(this.persistDraft())
      .catch(() => {})
      .then(() => {
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
        const name = layoutDisplayName(layout);
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
