import { snapToGrid } from '../../utils/snap-grid';

const MIN_W = 0.06;
const MIN_H = 0.06;
const MOVE_THRESHOLD = 4;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rad(deg) {
  return (deg * Math.PI) / 180;
}

/** 画布坐标 → 元素本地坐标（逆旋转，供旋转后的角点缩放） */
function toLocal(px, py, cx, cy, rotateDeg) {
  const r = rad(-rotateDeg);
  const dx = px - cx;
  const dy = py - cy;
  return {
    lx: dx * Math.cos(r) - dy * Math.sin(r),
    ly: dx * Math.sin(r) + dy * Math.cos(r),
  };
}

function normAngle(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return Math.round(d * 10) / 10;
}

/** 展示用 0–359 */
function displayAngle(deg) {
  let n = Math.round(Number(deg) || 0) % 360;
  if (n < 0) n += 360;
  return n;
}

function formatAngle(deg) {
  return `${displayAngle(deg)}°`;
}

function touchAngle(t0, t1) {
  return (
    (Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * 180) /
    Math.PI
  );
}

/** atan2（右=0）→ 表盘角度（上=0，顺时针） */
function atanToDial(atanDeg) {
  return atanDeg + 90;
}

Component({
  properties: {
    elId: { type: String, value: '' },
    x: { type: Number, value: 0 },
    y: { type: Number, value: 0 },
    w: { type: Number, value: 0.2 },
    h: { type: Number, value: 0.2 },
    rotate: { type: Number, value: 0 },
    selected: { type: Boolean, value: false },
    /** 画布已有锁定元素时，非选中项不响应手势 */
    locked: { type: Boolean, value: false },
    editMode: { type: String, value: 'position' },
    zIndex: { type: Number, value: 1 },
    canvasWidth: { type: Number, value: 0 },
    canvasHeight: { type: Number, value: 0 },
    canvasLeft: { type: Number, value: 0 },
    canvasTop: { type: Number, value: 0 },
    lockRatio: { type: Boolean, value: false },
    /** 与 edit-invite 共用网格吸附；本地预览也要吸，否则手势中 observer 不同步 */
    snapEnabled: { type: Boolean, value: false },
    snapCols: { type: Number, value: 12 },
    snapRows: { type: Number, value: 12 },
    /** 外部强制与 props 对齐（重置位置/大小/旋转时用） */
    layoutRev: { type: Number, value: 0 },
  },

  data: {
    dx: 0,
    dy: 0,
    dw: 0.2,
    dh: 0.2,
    drotate: 0,
    angleText: '0°',
    angleHudVisible: false,
  },

  observers: {
    'x, y, w, h, rotate': function (x, y, w, h, rotate) {
      if (this._gesturing) return;
      this._live = { x, y, w, h, rotate };
      this._syncView();
    },
    layoutRev(rev) {
      // 外部重置位置/大小/旋转时强制对齐本地预览
      if (!rev) return;
      this._gesturing = false;
      const { x, y, w, h, rotate } = this.data;
      this._live = { x, y, w, h, rotate };
      this._syncView();
    },
  },

  lifetimes: {
    attached() {
      const { x, y, w, h, rotate } = this.data;
      this._live = { x, y, w, h, rotate };
      this._syncView();
    },
  },

  methods: {
    _syncView() {
      const { x, y, w, h, rotate } = this._live || this.data;
      const angleText = formatAngle(rotate);
      const cur = this.data;
      if (
        cur.dx === x &&
        cur.dy === y &&
        cur.dw === w &&
        cur.dh === h &&
        cur.drotate === rotate &&
        cur.angleText === angleText
      ) {
        return;
      }
      this.setData({
        dx: x,
        dy: y,
        dw: w,
        dh: h,
        drotate: rotate,
        angleText,
      });
    },

    _freezeCanvas() {
      const cw = this.data.canvasWidth;
      const ch = this.data.canvasHeight;
      if (cw > 0 && ch > 0) {
        this._canvas = {
          cw,
          ch,
          left: this.data.canvasLeft,
          top: this.data.canvasTop,
        };
      }
      return this._canvas || null;
    },

    _toRel(clientX, clientY) {
      const c = this._canvas || this._freezeCanvas();
      if (!c) return null;
      return {
        px: (clientX - c.left) / c.cw,
        py: (clientY - c.top) / c.ch,
      };
    },

    _applyLocal(partial) {
      this._live = { ...this._live, ...partial };
      const { x, y, w, h, rotate } = this._live;
      this.setData({
        dx: x,
        dy: y,
        dw: w,
        dh: h,
        drotate: rotate,
        angleText: formatAngle(rotate),
      });
    },

    _snapPartial(partial) {
      if (!this.data.snapEnabled || !partial) return partial;
      const hasBox =
        partial.x != null ||
        partial.y != null ||
        partial.w != null ||
        partial.h != null;
      if (!hasBox) return partial;

      const live = this._live || this.data;
      const box = {
        x: partial.x != null ? partial.x : live.x,
        y: partial.y != null ? partial.y : live.y,
        w: partial.w != null ? partial.w : live.w,
        h: partial.h != null ? partial.h : live.h,
      };
      const resizing = partial.w != null || partial.h != null;
      const mode = resizing ? 'resize' : 'move';
      const result = snapToGrid(box, {
        cols: this.data.snapCols,
        rows: this.data.snapRows,
        thresholdPx: 6,
        canvasWidth: this.data.canvasWidth,
        mode,
        minW: MIN_W,
        minH: MIN_H,
      });
      const next = { ...partial };
      if (mode === 'move') {
        if (partial.x != null) next.x = result.box.x;
        if (partial.y != null) next.y = result.box.y;
      } else {
        if (partial.x != null || partial.w != null) next.x = result.box.x;
        if (partial.y != null || partial.h != null) next.y = result.box.y;
        if (partial.w != null) next.w = result.box.w;
        if (partial.h != null) next.h = result.box.h;
      }
      return next;
    },

    /**
     * 拖动中只改本地 dx/dy（跟手）；松手再 change 回写父级，避免每帧 setData 整页卡半拍。
     */
    _emit(partial, ended) {
      if (partial && Object.keys(partial).length) {
        const snapped = this._snapPartial(partial);
        this._applyLocal(snapped);
        // 手势进行中不冒泡；仅本地预览
        if (!ended) return;
      }
      if (ended) {
        const live = this._live || {};
        this.triggerEvent('change', { id: this.data.elId, ...live });
        this.triggerEvent('changeend', { id: this.data.elId, ...live });
      }
    },

    _setHud(visible) {
      if (this.data.angleHudVisible === visible) return;
      this.setData({ angleHudVisible: visible });
    },

    _beginPinchRotate(e) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      if (!t0 || !t1) return false;
      this._freezeCanvas();
      this._gesturing = true;
      this._mode = 'pinch-rotate';
      this._origin = {
        rotate: this._live.rotate,
        startAngle: touchAngle(t0, t1),
      };
      this._setHud(true);
      this.triggerEvent('select', { id: this.data.elId });
      this.triggerEvent('changestart', {
        id: this.data.elId,
        mode: 'rotate',
      });
      return true;
    },

    onBodyStart(e) {
      if (this.data.locked && !this.data.selected) return;
      if (e.touches.length >= 2) {
        this._beginPinchRotate(e);
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      this.triggerEvent('select', { id: this.data.elId });

      // 统一手势：拖主体 = 移动（角点/半圆另绑 resize / rotate）
      this._freezeCanvas();
      this._gesturing = true;
      this._mode = 'pending';
      this._startTouch = { x: t.clientX, y: t.clientY };
      this._origin = {
        x: this._live.x,
        y: this._live.y,
      };
    },

    onBodyMove(e) {
      if (e.touches.length >= 2) {
        if (this._mode !== 'pinch-rotate') this._beginPinchRotate(e);
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (!t0 || !t1 || !this._origin) return;
        const cur = touchAngle(t0, t1);
        this._emit({
          rotate: normAngle(this._origin.rotate + (cur - this._origin.startAngle)),
        });
        return;
      }

      if (this._mode === 'rotate') {
        this.onRotateMove(e);
        return;
      }

      const t = e.touches[0];
      const c = this._canvas;
      if (!t || !c || !this._startTouch || !this._origin) return;
      if (this._mode === 'pinch-rotate') return;

      const dxPx = t.clientX - this._startTouch.x;
      const dyPx = t.clientY - this._startTouch.y;

      if (this._mode === 'pending') {
        if (Math.abs(dxPx) < MOVE_THRESHOLD && Math.abs(dyPx) < MOVE_THRESHOLD) {
          return;
        }
        this._mode = 'drag';
        this.triggerEvent('changestart', { id: this.data.elId, mode: 'drag' });
      }
      if (this._mode !== 'drag') return;

      this._emit({
        x: this._origin.x + dxPx / c.cw,
        y: this._origin.y + dyPx / c.ch,
      });
    },

    onBodyEnd() {
      if (
        this._mode === 'drag' ||
        this._mode === 'pinch-rotate' ||
        this._mode === 'rotate'
      ) {
        this._emit({}, true);
      }
      this._resetGesture();
    },

    onResizeStart(e) {
      const t = e.touches[0];
      if (!t) return;
      this._freezeCanvas();
      this._gesturing = true;
      this.triggerEvent('select', { id: this.data.elId });

      const rel = this._toRel(t.clientX, t.clientY);
      if (!rel) return;

      const { x, y, w, h, rotate } = this._live;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const local = toLocal(rel.px, rel.py, cx, cy, rotate);

      this._mode = 'resize';
      this._origin = {
        cx,
        cy,
        rotate,
        ratio: w / Math.max(h, 0.0001),
        startW: w,
        startH: h,
        startLx: local.lx || 0.0001,
        startLy: local.ly || 0.0001,
      };
      this.triggerEvent('changestart', { id: this.data.elId, mode: 'resize' });
    },

    onResizeMove(e) {
      const t = e.touches[0];
      if (!t || this._mode !== 'resize' || !this._origin) return;
      const rel = this._toRel(t.clientX, t.clientY);
      if (!rel) return;

      const { cx, cy, rotate, ratio, startW, startH, startLx, startLy } =
        this._origin;
      const local = toLocal(rel.px, rel.py, cx, cy, rotate);

      const scaleX = local.lx / startLx;
      const scaleY = local.ly / startLy;
      let w = clamp(startW * Math.abs(scaleX), MIN_W, 1.5);
      let h = clamp(startH * Math.abs(scaleY), MIN_H, 1.5);

      if (this.data.lockRatio) {
        if (w / h > ratio) h = w / ratio;
        else w = h * ratio;
        w = clamp(w, MIN_W, 1.5);
        h = clamp(h, MIN_H, 1.5);
      }

      this._emit({
        w,
        h,
        x: cx - w / 2,
        y: cy - h / 2,
      });
    },

    onRotateStart(e) {
      const t = e.touches[0];
      if (!t) return;
      this._freezeCanvas();
      this._gesturing = true;
      this.triggerEvent('select', { id: this.data.elId });
      const rel = this._toRel(t.clientX, t.clientY);
      if (!rel) return;

      const { x, y, w, h, rotate } = this._live;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const dial = atanToDial(
        (Math.atan2(rel.py - cy, rel.px - cx) * 180) / Math.PI,
      );
      this._mode = 'rotate';
      this._origin = {
        rotate,
        cx,
        cy,
        startAngle: dial,
      };
      this._setHud(true);
      this.triggerEvent('changestart', { id: this.data.elId, mode: 'rotate' });
    },

    onRotateMove(e) {
      const t = e.touches[0];
      if (!t || this._mode !== 'rotate' || !this._origin) return;
      const rel = this._toRel(t.clientX, t.clientY);
      if (!rel) return;

      const { cx, cy, startAngle, rotate } = this._origin;
      const dial = atanToDial(
        (Math.atan2(rel.py - cy, rel.px - cx) * 180) / Math.PI,
      );
      this._emit({
        rotate: normAngle(rotate + (dial - startAngle)),
      });
    },

    onGestureEnd() {
      if (this._mode === 'resize' || this._mode === 'rotate') {
        this._emit({}, true);
      }
      this._resetGesture();
    },

    _resetGesture() {
      this._gesturing = false;
      this._mode = '';
      this._startTouch = null;
      this._origin = null;
      this._setHud(false);
    },
  },
});
