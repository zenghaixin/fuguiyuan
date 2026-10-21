import {
  normalizeCoverCrop,
  coverFocusToCrop,
  defaultCoverCrop,
  cropToCoverFocus,
  cropToScreenRect,
  aspectFitRect,
  fitCoverCropToAspect,
} from '../../utils/cover-crop';

const MOVE_SLOP = 6;
const MIN_UV = 0.08;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function readMetrics() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      const info = wx.getWindowInfo();
      return {
        statusBarHeight: (info && info.statusBarHeight) || 20,
        vw: (info && info.windowWidth) || 375,
        vh: (info && info.windowHeight) || 667,
      };
    }
  } catch (e) {
    /* ignore */
  }
  try {
    const sys = wx.getSystemInfoSync();
    return {
      statusBarHeight: (sys && sys.statusBarHeight) || 20,
      vw: (sys && sys.windowWidth) || 375,
      vh: (sys && sys.windowHeight) || 667,
    };
  } catch (e2) {
    return { statusBarHeight: 20, vw: 375, vh: 667 };
  }
}

Component({
  data: {
    visible: false,
    chromeOn: true,
    statusBarHeight: 20,
    src: '',
    photoId: '',
    tipText: '拖边/角可自由调整选区，拖框内平移',
    /** 网格：锁比例，隐藏自由拉框把手时仍可用边角等比缩放 */
    lockAspect: false,
    imgStyle: '',
    frameStyle: '',
    maskTop: '',
    maskBottom: '',
    maskLeft: '',
    maskRight: '',
  },

  lifetimes: {
    attached() {
      this._m = readMetrics();
      this.setData({ statusBarHeight: this._m.statusBarHeight });
    },
  },

  methods: {
    noop() {},

    /**
     * @param {{
     *   id: string,
     *   src: string,
     *   cellAspect: number,
     *   lockAspect?: boolean,
     *   coverCrop?: object,
     *   coverFocus?: object,
     * }} payload
     */
    open(payload = {}) {
      const src = payload.src || '';
      const id = payload.id || '';
      if (!src || !id) return false;

      this._m = readMetrics();
      this._photoId = id;
      this._src = src;
      this._cellAspect = Math.max(0.2, Number(payload.cellAspect) || 1);
      this._lockAspect = !!payload.lockAspect;
      this._coverCropIn = payload.coverCrop || null;
      this._coverFocusIn = payload.coverFocus || null;
      this._nw = 0;
      this._nh = 0;
      this._imgDisp = null;
      this._crop = null;
      this._paintSig = '';

      this.setData({
        visible: true,
        chromeOn: true,
        statusBarHeight: this._m.statusBarHeight,
        src,
        photoId: id,
        lockAspect: this._lockAspect,
        tipText: this._lockAspect
          ? '框比例与格子一致；拖边等比缩放，拖框内平移'
          : '拖边/角可自由调整选区，拖框内平移',
        imgStyle: '',
        frameStyle: '',
      });

      wx.getImageInfo({
        src,
        success: (res) => {
          this._nw = res.width || 1;
          this._nh = res.height || 1;
          this._initCrop();
          this._layout();
        },
        fail: () => {
          this._nw = 1000;
          this._nh = Math.round(1000 / this._cellAspect);
          this._initCrop();
          this._layout();
        },
      });
      return true;
    },

    close() {
      this.setData({ visible: false });
      this._crop = null;
      return true;
    },

    isOpen() {
      return !!this.data.visible;
    },

    _initCrop() {
      const imgAspect = this._nw / Math.max(1, this._nh);
      const existing = normalizeCoverCrop(this._coverCropIn);
      if (existing) {
        this._crop = existing;
        if (this._lockAspect) this._fitCropAspect();
        return;
      }
      if (this._coverFocusIn) {
        this._crop = coverFocusToCrop(
          this._coverFocusIn,
          this._cellAspect,
          imgAspect
        );
        return;
      }
      this._crop = defaultCoverCrop(this._cellAspect, imgAspect);
    },

    _uvAspect() {
      const imgAspect = this._nw / Math.max(1, this._nh);
      return this._cellAspect / imgAspect;
    },

    _fitCropAspect() {
      const imgAspect = this._nw / Math.max(1, this._nh);
      this._crop = fitCoverCropToAspect(
        this._crop,
        this._cellAspect,
        imgAspect
      );
    },

    _stageRect() {
      const m = this._m || readMetrics();
      const top = (m.statusBarHeight || 20) + 56;
      const bottom = 100;
      return {
        left: 16,
        top,
        width: Math.max(1, m.vw - 32),
        height: Math.max(1, m.vh - top - bottom),
      };
    },

    _layout() {
      if (!this.data.visible || !this._nw) return;
      const stage = this._stageRect();
      this._imgDisp = aspectFitRect({ nw: this._nw, nh: this._nh }, stage);
      if (this._lockAspect) this._fitCropAspect();
      this._paint();
    },

    _paint() {
      if (this._paintBusy) {
        this._paintPending = true;
        return;
      }
      this._paintBusy = true;
      this._paintPending = false;
      try {
        this._paintNow();
      } finally {
        setTimeout(() => {
          this._paintBusy = false;
          if (this._paintPending) this._paint();
        }, 16);
      }
    },

    _paintNow() {
      const disp = this._imgDisp;
      const crop = normalizeCoverCrop(this._crop);
      if (!disp || !crop) return;

      const frame = cropToScreenRect(disp, crop);
      if (!frame) return;

      const imgStyle = `left:${disp.left}px;top:${disp.top}px;width:${disp.width}px;height:${disp.height}px;`;
      const frameStyle = `left:${frame.left}px;top:${frame.top}px;width:${frame.width}px;height:${frame.height}px;`;

      const vw = (this._m && this._m.vw) || 375;
      const vh = (this._m && this._m.vh) || 667;
      const maskTop = `left:0;top:0;width:${vw}px;height:${Math.max(0, frame.top)}px;`;
      const maskBottom = `left:0;top:${frame.top + frame.height}px;width:${vw}px;height:${Math.max(0, vh - frame.top - frame.height)}px;`;
      const maskLeft = `left:0;top:${frame.top}px;width:${Math.max(0, frame.left)}px;height:${frame.height}px;`;
      const maskRight = `left:${frame.left + frame.width}px;top:${frame.top}px;width:${Math.max(0, vw - frame.left - frame.width)}px;height:${frame.height}px;`;

      const sig = `${imgStyle}|${frameStyle}`;
      if (sig === this._paintSig) return;
      this._paintSig = sig;
      this.setData({
        imgStyle,
        frameStyle,
        maskTop,
        maskBottom,
        maskLeft,
        maskRight,
      });
    },

    onClose() {
      this.close();
      this.triggerEvent('cancel');
    },

    onReset() {
      const imgAspect = this._nw / Math.max(1, this._nh);
      this._crop = defaultCoverCrop(this._cellAspect, imgAspect);
      this._paint();
    },

    onConfirm() {
      if (!this._photoId) {
        this.close();
        return;
      }
      if (this._lockAspect) this._fitCropAspect();
      const crop = normalizeCoverCrop(this._crop);
      if (!crop) {
        this.close();
        return;
      }
      this.triggerEvent('confirm', {
        id: this._photoId,
        coverCrop: crop,
        coverFocus: cropToCoverFocus(crop),
        imgRatio: this._nw / Math.max(1, this._nh),
      });
      this.close();
    },

    onTouchStart(e) {
      const t = e.touches && e.touches[0];
      if (!t || !this._imgDisp || !this._crop) return;
      const handle = (e.currentTarget && e.currentTarget.dataset.handle) || '';
      this._gesturing = true;
      this._moved = false;
      this._startX = t.clientX;
      this._startY = t.clientY;
      this._cropOrigin = { ...normalizeCoverCrop(this._crop) };
      this._handle = handle || 'move';
      this._mode = handle ? 'resize' : 'move';
    },

    /** 自由拖边/角：宽高独立 */
    _resizeFree(o, hdl, dx, dy) {
      const right = o.x + o.w;
      const bottom = o.y + o.h;
      let x = o.x;
      let y = o.y;
      let w = o.w;
      let h = o.h;

      if (hdl === 'e' || hdl === 'ne' || hdl === 'se') {
        w = clamp(o.w + dx, MIN_UV, 1 - o.x);
      }
      if (hdl === 'w' || hdl === 'nw' || hdl === 'sw') {
        x = clamp(o.x + dx, 0, right - MIN_UV);
        w = right - x;
      }
      if (hdl === 's' || hdl === 'se' || hdl === 'sw') {
        h = clamp(o.h + dy, MIN_UV, 1 - o.y);
      }
      if (hdl === 'n' || hdl === 'ne' || hdl === 'nw') {
        y = clamp(o.y + dy, 0, bottom - MIN_UV);
        h = bottom - y;
      }

      return {
        x: clamp(x, 0, 1 - MIN_UV),
        y: clamp(y, 0, 1 - MIN_UV),
        w: clamp(w, MIN_UV, 1 - x),
        h: clamp(h, MIN_UV, 1 - y),
      };
    },

    /** 锁定格子比例：拖边/角等比缩放 */
    _resizeLocked(o, hdl, dx, dy, aspect) {
      const minW = 0.08;
      const minH = minW / Math.max(0.05, aspect);

      const applySizeFromW = (nextW, anchorX, anchorY) => {
        let nw = clamp(nextW, minW, 1);
        let nh = nw / aspect;
        if (nh > 1) {
          nh = 1;
          nw = nh * aspect;
        }
        if (nw < minW) {
          nw = minW;
          nh = nw / aspect;
        }
        let nx = anchorX === 'left' ? o.x : o.x + o.w - nw;
        let ny =
          anchorY === 'top'
            ? o.y
            : anchorY === 'bottom'
              ? o.y + o.h - nh
              : o.y + (o.h - nh) / 2;
        nx = clamp(nx, 0, 1 - nw);
        ny = clamp(ny, 0, 1 - nh);
        return { x: nx, y: ny, w: nw, h: nh };
      };

      const applySizeFromH = (nextH, anchorX, anchorY) => {
        let nh = clamp(nextH, minH, 1);
        let nw = nh * aspect;
        if (nw > 1) {
          nw = 1;
          nh = nw / aspect;
        }
        if (nh < minH) {
          nh = minH;
          nw = nh * aspect;
        }
        let ny = anchorY === 'top' ? o.y : o.y + o.h - nh;
        let nx =
          anchorX === 'left'
            ? o.x
            : anchorX === 'right'
              ? o.x + o.w - nw
              : o.x + (o.w - nw) / 2;
        nx = clamp(nx, 0, 1 - nw);
        ny = clamp(ny, 0, 1 - nh);
        return { x: nx, y: ny, w: nw, h: nh };
      };

      if (hdl === 'e') return applySizeFromW(o.w + dx, 'left', 'center');
      if (hdl === 'w') return applySizeFromW(o.w - dx, 'right', 'center');
      if (hdl === 's') return applySizeFromH(o.h + dy, 'center', 'top');
      if (hdl === 'n') return applySizeFromH(o.h - dy, 'center', 'bottom');

      if (hdl === 'se') {
        return Math.abs(dx) * aspect >= Math.abs(dy)
          ? applySizeFromW(o.w + dx, 'left', 'top')
          : applySizeFromH(o.h + dy, 'left', 'top');
      }
      if (hdl === 'sw') {
        return Math.abs(dx) * aspect >= Math.abs(dy)
          ? applySizeFromW(o.w - dx, 'right', 'top')
          : applySizeFromH(o.h + dy, 'right', 'top');
      }
      if (hdl === 'ne') {
        return Math.abs(dx) * aspect >= Math.abs(dy)
          ? applySizeFromW(o.w + dx, 'left', 'bottom')
          : applySizeFromH(o.h - dy, 'left', 'bottom');
      }
      if (hdl === 'nw') {
        return Math.abs(dx) * aspect >= Math.abs(dy)
          ? applySizeFromW(o.w - dx, 'right', 'bottom')
          : applySizeFromH(o.h - dy, 'right', 'bottom');
      }

      return { x: o.x, y: o.y, w: o.w, h: o.h };
    },

    onTouchMove(e) {
      if (!this._gesturing || !this._cropOrigin || !this._imgDisp) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dxPx = t.clientX - this._startX;
      const dyPx = t.clientY - this._startY;
      if (
        !this._moved &&
        Math.abs(dxPx) < MOVE_SLOP &&
        Math.abs(dyPx) < MOVE_SLOP
      ) {
        return;
      }
      this._moved = true;

      const disp = this._imgDisp;
      const dx = dxPx / disp.width;
      const dy = dyPx / disp.height;
      const o = this._cropOrigin;

      if (this._mode === 'move') {
        const w = o.w;
        const h = o.h;
        const x = clamp(o.x + dx, 0, 1 - w);
        const y = clamp(o.y + dy, 0, 1 - h);
        this._crop = { x, y, w, h };
        this._paint();
        return;
      }

      if (this._lockAspect) {
        this._crop = this._resizeLocked(
          o,
          this._handle,
          dx,
          dy,
          this._uvAspect()
        );
      } else {
        this._crop = this._resizeFree(o, this._handle, dx, dy);
      }
      this._paint();
    },

    onTouchEnd() {
      this._gesturing = false;
      this._mode = '';
      this._handle = '';
    },

    onStageTap() {
      if (this._moved) {
        this._moved = false;
        return;
      }
      this.setData({ chromeOn: !this.data.chromeOn });
    },
  },
});
