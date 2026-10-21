import {
  ensureMagazineFrames,
  cellToBox,
  frameDisplayBox,
  packStyleFrames,
  resolveSquareGrid,
  resolveMagazineBandGrid,
  isMagazineBandLayout,
  snapMoveByPx,
  snapResizeByPx,
  tryMoveCell,
  tryResizeCell,
  countFreeCells,
  validFrame,
} from '../../../../utils/magazine-layout';
import {
  normalizeCoverCrop,
  isActiveCoverCrop,
  cropToImgBoxStyle,
  coverFocusToCrop,
  tileCellAspect,
  cropToCellCover,
} from '../../../../utils/cover-crop';

const MOVE_SLOP = 8;

function frameToPctStyle(frame) {
  if (!frame) return '';
  const x = frame.x * 100;
  const y = frame.y * 100;
  const w = frame.w * 100;
  const h = frame.h * 100;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w <= 0 ||
    h <= 0
  ) {
    return '';
  }
  return `left:${x}%;top:${y}%;width:${w}%;height:${h}%;`;
}

function normalizeCoverFocus(focus) {
  const x = focus && Number.isFinite(Number(focus.x)) ? Number(focus.x) : 50;
  const y = focus && Number.isFinite(Number(focus.y)) ? Number(focus.y) : 50;
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

/** 格内 cover + 焦点（image 的 aspectFill 无法改裁切位置） */
function coverImgStyle(src, focus) {
  const f = normalizeCoverFocus(focus);
  const url = String(src || '').replace(/\\/g, '/').replace(/'/g, '%27');
  if (!url) return '';
  return `background-image:url('${url}');background-position:${f.x}% ${f.y}%;`;
}

function toast(title) {
  wx.showToast({ title, icon: 'none', duration: 2000 });
}

Component({
  properties: {
    photos: { type: Array, value: [] },
    height: { type: Number, value: 400 },
    editable: { type: Boolean, value: false },
    /** 网格风格：grid4 | grid9 | magazine（均分与杂志共用本组件） */
    layout: { type: String, value: 'magazine' },
    /** 裁剪调焦：拖动改格内画面位置，不挪格子 */
    coverPan: { type: Boolean, value: false },
    /** 预览态：是否还有下一模块（无则禁止上滑切走） */
    hasNextModule: { type: Boolean, value: false },
  },

  data: {
    tiles: [],
    selectedId: '',
    showGrid: false,
    freeHint: '',
    gridBgStyle: '',
    coverPanOn: false,
  },

  observers: {
    'photos, editable, height, layout': function () {
      this.scheduleSync();
    },
    coverPan: function (v) {
      const on = !!v;
      this.setData({ coverPanOn: on });
      if (on && this.data.editable) {
        this.setData({ showGrid: false });
      }
    },
  },

  lifetimes: {
    ready() {
      this.scheduleSync();
    },
  },

  methods: {
    scheduleSync() {
      if (this._syncTimer) clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(() => this.measureAndSync(), 20);
    },

    measureAndSync() {
      this.createSelectorQuery()
        .in(this)
        .select('.pw-mag__stage')
        .boundingClientRect((rect) => {
          const w = (rect && rect.width) || 300;
          const h =
            (rect && rect.height) || this.data.height || 400;
          const key = this._layoutKey();
          this._grid = isMagazineBandLayout(key)
            ? resolveMagazineBandGrid(w, h)
            : resolveSquareGrid(w, h);
          this.syncTiles(this.data.photos);
        })
        .exec();
    },

    _layoutKey() {
      const raw =
        this.properties.layout || this.data.layout || 'magazine';
      return raw === 'grid' ? 'grid4' : raw;
    },

    /**
     * 打开全屏裁剪用：按当前占格真实像素比返回 payload
     * @param {string} photoId
     */
    getCropPayload(photoId) {
      const id = String(photoId || '');
      const list = this.properties.photos || this.data.photos || [];
      const photo = list.find((p) => p && String(p.id) === id);
      if (!photo || !photo.src) return null;
      const grid =
        this._grid ||
        (isMagazineBandLayout(this._layoutKey())
          ? resolveMagazineBandGrid(300, this.data.height || 400)
          : resolveSquareGrid(300, this.data.height || 400));
      const frame =
        (this._frames && this._frames[id]) ||
        (photo.frame
          ? cellToBox(photo.frame, grid)
          : frameDisplayBox(photo.frame, grid));
      if (!frame) return null;
      const cellAspect = tileCellAspect(frame, grid);
      return {
        id: photo.id,
        src: photo.src,
        cellAspect,
        coverCrop: photo.coverCrop || null,
        coverFocus: photo.coverFocus || null,
        imgRatio: photo.imgRatio || null,
      };
    },

    syncTiles(photos) {
      if (this._gesturing) return;
      const layoutKey = this._layoutKey();
      const grid =
        this._grid ||
        (isMagazineBandLayout(layoutKey)
          ? resolveMagazineBandGrid(300, this.data.height || 400)
          : resolveSquareGrid(300, this.data.height || 400));
      const editable = !!this.data.editable;
      let list = photos || [];

      if (editable) {
        const { list: next, changed } = ensureMagazineFrames(list, grid, {
          layout: layoutKey,
        });
        list = next;
        if (changed && !this._ensuring) {
          this._ensuring = true;
          this.triggerEvent('framesensure', { photos: list });
          setTimeout(() => {
            this._ensuring = false;
          }, 200);
        }
      } else {
        // 预览：缺 frame 时按风格套模板；有比例的不再按新舞台吸附
        const present = list.filter(Boolean);
        const anyFrame = present.some((p) => validFrame(p.frame));
        if (present.length && !anyFrame) {
          const packed = packStyleFrames(layoutKey, present.length, grid);
          let k = 0;
          list = list.map((p) => {
            if (!p) return p;
            const frame = packed[k];
            k += 1;
            return frame ? { ...p, frame } : p;
          });
        }
      }

      this._frames = {};
      if (!this._coverFocus) this._coverFocus = {};
      const cells = [];
      const tiles = list
        .filter((p) => p && p.id && p.frame)
        .map((p, i) => {
          const id = String(p.id);
          // 编辑走格子；预览走保存的比例，换舞台也不重新吸附
          const frame = editable
            ? cellToBox(p.frame, grid)
            : frameDisplayBox(p.frame, grid);
          if (!frame) return null;
          this._frames[id] = frame;
          cells.push(frame);
          const src = p.src || p.url || p.path || '';
          const focus = normalizeCoverFocus(
            this._coverFocus[id] || p.coverFocus
          );
          this._coverFocus[id] = focus;
          const cellAspect = tileCellAspect(frame, grid);
          let crop = normalizeCoverCrop(p.coverCrop);
          if (!crop && p.coverFocus && Number(p.imgRatio) > 0) {
            crop = coverFocusToCrop(
              focus,
              cellAspect,
              Number(p.imgRatio)
            );
          }
          // 自由裁剪：展示时在选区内取格子比例切片，铺满且不拉变形
          let displayCrop = crop;
          if (crop && Number(p.imgRatio) > 0) {
            displayCrop =
              cropToCellCover(crop, cellAspect, Number(p.imgRatio)) || crop;
          }
          const useCrop = isActiveCoverCrop(displayCrop);
          return {
            id,
            src,
            photoIndex: i,
            tileStyle: frameToPctStyle(frame),
            useCrop,
            imgBoxStyle: useCrop ? cropToImgBoxStyle(displayCrop) : '',
            imgStyle: useCrop ? '' : coverImgStyle(src, focus),
            spanLabel:
              editable && frame.cs != null && frame.rs != null
                ? `${frame.cs}x${frame.rs}`
                : '',
          };
        })
        .filter((t) => t && t.tileStyle);

      const free = editable ? countFreeCells(cells, grid) : 0;
      const cellW = grid.cellW != null ? grid.cellW : grid.cellPx;
      const cellH = grid.cellH != null ? grid.cellH : grid.cellPx;
      const cellWpct = (cellW / grid.stageW) * 100;
      const cellHpct = (cellH / grid.stageH) * 100;
      const padXpct = ((grid.padX || 0) / grid.stageW) * 100;
      const padYpct = ((grid.padY || 0) / grid.stageH) * 100;
      const coverPanOn = !!(this.properties.coverPan || this.data.coverPanOn);

      const patch = {
        tiles,
        coverPanOn,
        freeHint: editable
          ? coverPanOn
            ? '调焦中：拖动照片移动画面，再点「裁剪」结束'
            : `空余 ${free} 格 · ${grid.cols}x${grid.rows} 方格`
          : '',
        gridBgStyle:
          editable && !coverPanOn
            ? `background-size:${cellWpct}% ${cellHpct}%;background-position:${padXpct}% ${padYpct}%;`
            : '',
      };
      if (
        this.data.selectedId &&
        !tiles.some((t) => t.id === this.data.selectedId)
      ) {
        patch.selectedId = '';
        patch.showGrid = false;
      }
      this.setData(patch);
    },

    _otherCells(id) {
      return Object.keys(this._frames || {})
        .filter((k) => k !== id)
        .map((k) => ({ id: k, ...this._frames[k] }))
        .filter((o) => o && o.cs > 0);
    },

    /** 碰撞检测用起拖快照，避免上回流水未落地导致误判「放不下」 */
    _otherCellsFromSnapshot(id) {
      const src = this._frameSnapshot || this._frames || {};
      return Object.keys(src)
        .filter((k) => k !== id)
        .map((k) => ({ id: k, ...src[k] }))
        .filter((o) => o && o.cs > 0);
    },

    _cloneFrames(src) {
      const out = {};
      Object.keys(src || {}).forEach((k) => {
        out[k] = { ...(src[k] || {}) };
      });
      return out;
    },

    _tileIndex(id) {
      return (this.data.tiles || []).findIndex((t) => t.id === id);
    },

    _applyLocal(id, frame) {
      const grid = this._grid;
      if (!grid) return;
      const next = cellToBox(frame, grid);
      this._frames[id] = next;
      const idx = this._tileIndex(id);
      if (idx < 0) return;
      const style = frameToPctStyle(next);
      if (!style) return;
      this.setData({
        [`tiles[${idx}].tileStyle`]: style,
        [`tiles[${idx}].spanLabel`]: `${next.cs}x${next.rs}`,
      });
    },

    /** 一次 setData 写多块，减少拖动卡顿 */
    _writeFrames(map) {
      const grid = this._grid;
      if (!grid || !map) return;
      const tiles = this.data.tiles || [];
      const patch = {};
      tiles.forEach((t, idx) => {
        if (!t || !t.id || !map[t.id]) return;
        const next = cellToBox(map[t.id], grid);
        this._frames[t.id] = next;
        const style = frameToPctStyle(next);
        if (!style) return;
        patch[`tiles[${idx}].tileStyle`] = style;
        patch[`tiles[${idx}].spanLabel`] = `${next.cs}x${next.rs}`;
      });
      if (Object.keys(patch).length) this.setData(patch);
    },

    _applyReflow(reflow) {
      if (!reflow || !reflow.length) return;
      reflow.forEach((item) => {
        if (!item || !item.id || !item.cell) return;
        this._applyLocal(item.id, item.cell);
      });
    },

    _framesEqualCell(a, b) {
      return !!(
        a &&
        b &&
        a.c === b.c &&
        a.r === b.r &&
        a.cs === b.cs &&
        a.rs === b.rs
      );
    },

    _refreshFreeHint() {
      const grid = this._grid;
      if (!grid) return;
      const cells = Object.keys(this._frames || {}).map((k) => this._frames[k]);
      const free = countFreeCells(cells, grid);
      const hint = `空余 ${free} 格 · ${grid.cols}x${grid.rows} 方格`;
      if (hint !== this.data.freeHint) this.setData({ freeHint: hint });
    },

    /** 整表回写（含重排后的其它图） */
    _emitAllFrames() {
      const photos = (this.properties.photos || this.data.photos || [])
        .filter((p) => p && p.id)
        .map((p) => {
          const frame = this._frames[String(p.id)];
          return frame ? { ...p, frame: { ...frame } } : p;
        });
      this.triggerEvent('framesensure', { photos });
    },

    _emit(id) {
      const frame = this._frames[id];
      if (!frame) return;
      this.triggerEvent('framechange', { id, frame: { ...frame } });
    },

    onStageTap() {
      if (!this.data.editable || this._moved) return;
      this.setData({ selectedId: '', showGrid: false });
    },

    /** catchtouchmove 后 tap 常被吃掉，看大图改走 touchend */
    onTileTap() {},

    _previewAt(index) {
      const i = Number(index);
      if (Number.isNaN(i) || i < 0) return;
      // 网格族（四/九/杂志）：统一只看当前一张
      this.triggerEvent('preview', {
        index: i,
        showIndex: false,
        swipeable: false,
        single: true,
      });
    },

    onDelete(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this.triggerEvent('delete', { id });
    },

    _applyCoverFocusLocal(id, focus) {
      const f = normalizeCoverFocus(focus);
      if (!this._coverFocus) this._coverFocus = {};
      this._coverFocus[id] = f;
      const idx = this._tileIndex(id);
      if (idx < 0) return;
      const src =
        (this.data.tiles[idx] && this.data.tiles[idx].src) || '';
      this.setData({
        [`tiles[${idx}].imgStyle`]: coverImgStyle(src, f),
      });
    },

    _emitCoverFocus(id) {
      const focus = normalizeCoverFocus(
        (this._coverFocus && this._coverFocus[id]) || { x: 50, y: 50 }
      );
      this.triggerEvent('coverfocus', { id, coverFocus: focus });
    },

    /** 预览态纵向滑：交给外层切模块（格子 catchtouch 会挡住父级） */
    _previewModStart(t) {
      this._modTouching = true;
      this._modDragging = false;
      this._modStartX = t.clientX;
      this._modStartY = t.clientY;
      this._modLastDy = 0;
    },

    _previewModMove(t) {
      if (!this._modTouching) return false;
      const dx = t.clientX - this._modStartX;
      const dy = t.clientY - this._modStartY;
      if (!this._modDragging) {
        if (Math.abs(dy) < MOVE_SLOP && Math.abs(dx) < MOVE_SLOP) return false;
        // 横向不切模块，留给点按看大图判定
        if (Math.abs(dx) > Math.abs(dy)) {
          this._modTouching = false;
          return false;
        }
        this._modDragging = true;
        this._moved = true;
        if (dy < 0 && !this.properties.hasNextModule) return true;
        this.triggerEvent('moduledrag', { phase: 'start', dy: 0 });
      }
      if (dy < 0 && !this.properties.hasNextModule) return true;
      this._modLastDy = dy;
      this.triggerEvent('moduledrag', { phase: 'move', dy });
      return true;
    },

    _previewModEnd() {
      if (!this._modTouching && !this._modDragging) return false;
      const dragging = this._modDragging;
      const lastDy = this._modLastDy || 0;
      this._modTouching = false;
      this._modDragging = false;
      if (dragging) {
        this.triggerEvent('moduledrag', { phase: 'end', dy: lastDy });
        return true;
      }
      return false;
    },

    onStageTouchStart(e) {
      if (this.data.editable) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      this._previewModStart(t);
    },

    onStageTouchMove(e) {
      if (this.data.editable) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      this._previewModMove(t);
    },

    onStageTouchEnd() {
      if (this.data.editable) return;
      this._previewModEnd();
    },

    onTileTouchStart(e) {
      if (this._resizeMode) return;
      const t = e.touches[0];
      const id = e.currentTarget.dataset.id;
      const index = Number(e.currentTarget.dataset.index);
      if (!t || !id) return;

      this._gesturing = true;
      this._moved = false;
      this._dragId = id;
      this._tapIndex = index;
      this._wasSelected = this.data.selectedId === id;
      this._startX = t.clientX;
      this._startY = t.clientY;
      this._blocked = false;
      this._lastKey = '';
      this._pendingReflow = null;
      this._frameSnapshot = null;

      // 预览态：记录点击，并准备纵向切模块
      if (!this.data.editable) {
        this._mode = 'tap';
        this._previewModStart(t);
        return;
      }
      if (!this._frames[id]) return;

      // 裁剪调焦：拖动画布，不挪格子
      if (this.properties.coverPan || this.data.coverPanOn) {
        this._mode = 'cover';
        const cur = normalizeCoverFocus(
          (this._coverFocus && this._coverFocus[id]) || { x: 50, y: 50 }
        );
        this._coverOrigin = { ...cur };
        this._lastCover = { ...cur };
        if (this.data.selectedId !== id) {
          this.setData({ selectedId: id, showGrid: false });
        }
        return;
      }

      this._mode = 'move';
      this._frameSnapshot = this._cloneFrames(this._frames);
      this._origin = { ...this._frames[id] };
      this._lastValid = { ...this._origin };

      if (this.data.selectedId !== id) {
        this.setData({ selectedId: id, showGrid: true });
      } else if (!this.data.showGrid) {
        this.setData({ showGrid: true });
      }
      this.triggerEvent('select', { id, index });
    },

    onTileTouchMove(e) {
      if (!this._gesturing || !this._dragId) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - this._startX;
      const dy = t.clientY - this._startY;
      if (
        !this._moved &&
        Math.abs(dx) < MOVE_SLOP &&
        Math.abs(dy) < MOVE_SLOP
      ) {
        return;
      }
      this._moved = true;

      // 非编辑：纵向滑切模块；横向/微动不切，松手也不看大图
      if (!this.data.editable) {
        this._previewModMove(t);
        return;
      }

      if (this._mode === 'cover') {
        const grid = this._grid;
        const frame = this._frames[this._dragId];
        if (!grid || !frame || !this._coverOrigin) return;
        const tileW = Math.max(1, frame.w * grid.stageW);
        const tileH = Math.max(1, frame.h * grid.stageH);
        // 拖动方向与画面相反（像挪取景框）
        const next = normalizeCoverFocus({
          x: this._coverOrigin.x - (dx / tileW) * 100,
          y: this._coverOrigin.y - (dy / tileH) * 100,
        });
        this._lastCover = next;
        this._applyCoverFocusLocal(this._dragId, next);
        return;
      }

      if (this._mode !== 'move') return;

      const grid = this._grid;
      if (!grid || !this._origin) return;

      const snapped = snapMoveByPx(this._origin, dx, dy, grid);
      const key = `${snapped.c}_${snapped.r}_${snapped.cs}_${snapped.rs}`;
      if (key === this._lastKey) return;

      const result = tryMoveCell(
        snapped,
        this._otherCellsFromSnapshot(this._dragId),
        grid,
        this._origin
      );
      if (result.ok) {
        this._blocked = false;
        this._lastValid = result.cell;
        this._pendingReflow = result.reflow || null;
        this._lastKey = key;
        // 从起拖快照重建：当前块 + 回流，碰撞与画面一致
        const built = this._cloneFrames(this._frameSnapshot);
        built[this._dragId] = result.cell;
        (result.reflow || []).forEach((item) => {
          if (item && item.id && item.cell) built[item.id] = item.cell;
        });
        this._writeFrames(built);
      } else {
        // 手指掠过无效格：保持上一有效画面，不整段打回原点
        this._blocked = result.reason || 'overlap';
      }
    },

    onTileTouchEnd() {
      if (!this._gesturing) return;
      const id = this._dragId;
      const moved = this._moved;
      const mode = this._mode;
      const blocked = this._blocked;
      const origin = this._origin;
      const lastValid = this._lastValid;
      const pendingReflow = this._pendingReflow;
      const snapshot = this._frameSnapshot;
      const wasSelected = this._wasSelected;
      const tapIndex = this._tapIndex;
      const didModDrag = !this.data.editable && this._previewModEnd();
      this._gesturing = false;
      this._mode = '';
      this._dragId = '';
      this._resizeMode = false;
      this._blocked = false;
      this._lastKey = '';
      this._pendingReflow = null;
      this._frameSnapshot = null;

      // 未拖动：预览态单击看大图；编辑态点已选中的再看大图
      if (!moved && !didModDrag) {
        if (!this.data.editable) {
          this._previewAt(tapIndex);
        } else if (wasSelected) {
          this._previewAt(tapIndex);
        }
        setTimeout(() => {
          this._moved = false;
        }, 40);
        return;
      }

      if (!this.data.editable) {
        setTimeout(() => {
          this._moved = false;
        }, 40);
        return;
      }

      if (id && mode === 'cover') {
        const lastCover = this._lastCover;
        const coverOrigin = this._coverOrigin;
        this._lastCover = null;
        this._coverOrigin = null;
        if (
          lastCover &&
          coverOrigin &&
          (lastCover.x !== coverOrigin.x || lastCover.y !== coverOrigin.y)
        ) {
          this._emitCoverFocus(id);
        }
        setTimeout(() => {
          this._moved = false;
        }, 40);
        return;
      }

      if (id && (mode === 'move' || mode === 'resize')) {
        const progressed = !this._framesEqualCell(lastValid, origin);
        if (blocked && !progressed) {
          // 完全没挪成：还原快照并提示
          if (snapshot) this._writeFrames(snapshot);
          else if (origin) this._applyLocal(id, origin);
          if (blocked === 'others') {
            toast('挪到这里后，其余照片放不下');
          } else if (blocked === 'space' || mode === 'resize') {
            toast('剩余网格不足，无法继续放大');
          } else {
            toast('这个位置放不下，换一格试试');
          }
        } else {
          // 落在最后一次有效位置（即使松手时光标在无效格）
          if (blocked && progressed && snapshot && lastValid) {
            const built = this._cloneFrames(snapshot);
            built[id] = lastValid;
            (pendingReflow || []).forEach((item) => {
              if (item && item.id && item.cell) built[item.id] = item.cell;
            });
            this._writeFrames(built);
          }
          const cur = this._frames[id];
          const changed =
            !this._framesEqualCell(cur, origin) || !!(pendingReflow && pendingReflow.length);
          if (changed) {
            if (pendingReflow && pendingReflow.length) this._emitAllFrames();
            else this._emit(id);
          }
        }
        this._refreshFreeHint();
      }

      setTimeout(() => {
        this._moved = false;
      }, 40);
    },

    onResizeStart(e) {
      if (!this.data.editable) return;
      const t = e.touches[0];
      const id = e.currentTarget.dataset.id;
      if (!t || !id || !this._frames[id]) return;

      this._gesturing = true;
      this._resizeMode = true;
      this._moved = true;
      this._dragId = id;
      this._mode = 'resize';
      this._blocked = false;
      this._startX = t.clientX;
      this._startY = t.clientY;
      this._frameSnapshot = this._cloneFrames(this._frames);
      this._origin = { ...this._frames[id] };
      this._lastValid = { ...this._origin };
      this._lastKey = '';
      this._pendingReflow = null;
      this.setData({ selectedId: id, showGrid: true });
    },

    onResizeMove(e) {
      if (!this._gesturing || this._mode !== 'resize' || !this._dragId) return;
      const t = e.touches[0];
      const grid = this._grid;
      if (!t || !grid) return;
      const dx = t.clientX - this._startX;
      const dy = t.clientY - this._startY;

      const snapped = snapResizeByPx(this._origin, dx, dy, grid);
      const key = `${snapped.c}_${snapped.r}_${snapped.cs}_${snapped.rs}`;
      if (key === this._lastKey) return;

      const result = tryResizeCell(
        snapped,
        this._origin,
        this._otherCellsFromSnapshot(this._dragId),
        grid
      );
      if (result.ok) {
        this._blocked = false;
        this._lastValid = result.cell;
        this._pendingReflow = result.reflow || null;
        this._lastKey = key;
        const built = this._cloneFrames(this._frameSnapshot);
        built[this._dragId] = result.cell;
        (result.reflow || []).forEach((item) => {
          if (item && item.id && item.cell) built[item.id] = item.cell;
        });
        this._writeFrames(built);
      } else {
        this._blocked = result.reason || 'space';
      }
    },

    onResizeEnd() {
      this.onTileTouchEnd();
    },
  },
});
