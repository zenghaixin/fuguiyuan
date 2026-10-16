const { previewPhotos } = require('../../../../utils/preview-photos');

const DIR_LOCK = 10;
const TAP_SLOP = 28;
const FLY_RATIO = 0.1;
const FLY_MS = 280;
/** 同时露出的叠层数（含顶牌）；list 仍按全部照片建层，仅 show 前几张 */
const STACK_SHOW = 5;
const ROT_MIN = -6.5;
const ROT_MAX = 6.5;
const ROT_DELTA_MIN = 1.1;
const ROT_DELTA_MAX = 2.4;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hashUnit(str) {
  const s = String(str || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function mediaStyle(rot, depth) {
  const lean = rot >= 0 ? 1 : -1;
  const tx = lean * (6 + Math.abs(rot) * 0.6) + lean * depth * 1.5;
  const ty = depth * 10;
  const scale = Math.max(0.82, 1 - depth * 0.04);
  const opacity = depth <= 2 ? 1 : Math.max(0.92, 1 - (depth - 2) * 0.04);
  return `transform: translate3d(${tx}px, ${ty}px, 0) scale(${scale}); opacity: ${opacity};`;
}

function imgStyle(rot) {
  return `transform: rotate(${rot}deg);`;
}

function countLabel(current, total) {
  if (!total) return '';
  const cur = ((Number(current) || 0) % total) + 1;
  return `${cur} / ${total}`;
}

function leanSide(rot) {
  if (rot > 0.35) return 'right';
  if (rot < -0.35) return 'left';
  return 'mid';
}

Component({
  properties: {
    photos: { type: Array, value: [] },
    height: { type: Number, value: 400 },
    editable: { type: Boolean, value: false },
    current: { type: Number, value: 0 },
    hasNextModule: { type: Boolean, value: false },
  },

  data: {
    innerCurrent: 0,
    layers: [],
    topId: '',
    totalCount: 0,
    countText: '',
    topMediaDrag: '',
    topImgDrag: '',
    topMediaStyle: '',
    topImgStyle: '',
  },

  observers: {
    photos: function (photos) {
      const list = photos || [];
      const sig = list.map((p) => p && p.id).join(',');
      if (sig === this._photosSig && (this.data.layers || []).length) return;
      this._photosSig = sig;
      this.syncFromProps({ resetAngles: true });
    },
    current: function (current) {
      if (this._flying) return;
      let next = Number(current);
      if (!Number.isFinite(next)) next = 0;
      const list = this.properties.photos || this.data.photos || [];
      const n = list.length;
      if (n > 0) next = ((next % n) + n) % n;
      else next = 0;
      if (next === this.data.innerCurrent && (this.data.layers || []).length) return;
      this.syncFromProps({ resetAngles: false, current: next });
    },
  },

  lifetimes: {
    attached() {
      this.resetTouch();
      this.syncFromProps({ resetAngles: true });
    },
    ready() {
      this.syncFromProps({
        resetAngles: !(this.data.layers && this.data.layers.length),
      });
    },
  },

  methods: {
    syncFromProps(opts = {}) {
      if (this._flying) return;
      const list = this.properties.photos || this.data.photos || [];
      const n = list.length;
      let next =
        opts.current != null ? Number(opts.current) : Number(this.properties.current);
      if (!Number.isFinite(next)) next = Number(this.data.innerCurrent) || 0;
      if (n > 0) next = ((next % n) + n) % n;
      else next = 0;

      if (opts.resetAngles || !this._angleById) {
        this.resetAngleBook(list);
        this._photosSig = list.map((p) => p && p.id).join(',');
      }

      const patch = this.layersPatch(list, next);
      if (
        !opts.resetAngles &&
        next === this.data.innerCurrent &&
        (this.data.layers || []).length === (patch.layers || []).length &&
        this.data.topId === patch.topId
      ) {
        return;
      }

      this.setData({
        innerCurrent: next,
        ...patch,
        topMediaDrag: '',
        topImgDrag: '',
      });
    },

    resetAngleBook(photos) {
      this._angleById = {};
      this._leanBalance = { left: 0, right: 0 };
      (photos || []).forEach((p) => {
        if (p && p.id) this._angleById[p.id] = null;
      });
    },

    balancePreferSide() {
      const b = this._leanBalance || { left: 0, right: 0 };
      if (b.left < b.right) return -1;
      if (b.right < b.left) return 1;
      return 0;
    },

    noteLean(rot, prevRot) {
      if (!this._leanBalance) this._leanBalance = { left: 0, right: 0 };
      if (prevRot != null) {
        const prev = leanSide(prevRot);
        if (prev === 'left') this._leanBalance.left = Math.max(0, this._leanBalance.left - 1);
        if (prev === 'right') this._leanBalance.right = Math.max(0, this._leanBalance.right - 1);
      }
      const side = leanSide(rot);
      if (side === 'left') this._leanBalance.left += 1;
      if (side === 'right') this._leanBalance.right += 1;
    },

    calcAngleFromAbove(aboveRot, photoId) {
      const unit = hashUnit(photoId);
      const prefer = this.balancePreferSide();
      let dir = prefer;
      if (!dir) dir = aboveRot >= 0 ? -1 : 1;
      const sameSide = (aboveRot >= 0 && dir > 0) || (aboveRot < 0 && dir < 0);
      const mag = sameSide
        ? ROT_DELTA_MIN + unit * 0.5
        : ROT_DELTA_MIN + unit * (ROT_DELTA_MAX - ROT_DELTA_MIN);
      let rot = clamp(aboveRot + dir * mag, ROT_MIN, ROT_MAX);
      if (rot >= ROT_MAX - 0.2) rot = clamp(aboveRot - mag, ROT_MIN, ROT_MAX);
      if (rot <= ROT_MIN + 0.2) rot = clamp(aboveRot + mag, ROT_MIN, ROT_MAX);
      return rot;
    },

    initialTopAngle(photoId) {
      const unit = hashUnit(photoId);
      const prefer = this.balancePreferSide();
      const dir = prefer || (unit > 0.5 ? 1 : -1);
      return clamp(dir * (2.4 + unit * 2.2), ROT_MIN, ROT_MAX);
    },

    ensureInitialAngles(order) {
      order.forEach((row, i) => {
        const id = row.p && row.p.id;
        if (!id || this._angleById[id] != null) return;
        // 只给会露出来的层补角
        if (row.depth >= STACK_SHOW) {
          this._angleById[id] = 0;
          return;
        }
        let rot;
        if (i === 0) rot = this.initialTopAngle(id);
        else {
          const above = order[i - 1];
          const aboveRot =
            above && above.p ? this._angleById[above.p.id] : 0;
          rot = this.calcAngleFromAbove(aboveRot == null ? 0 : aboveRot, id);
        }
        this.noteLean(rot, null);
        this._angleById[id] = rot;
      });
    },

    /**
     * 按 photos 全量建层：一张图一层。
     * depth=0 顶牌；翻牌后 current 前进，整表循环重排。
     * show：仅前 STACK_SHOW 张进 DOM（走影单独一项 isGhost 也 show）。
     */
    buildLayers(photos, current, opts = {}) {
      const list = photos || [];
      const n = list.length;
      if (!n) return [];
      if (!this._angleById) this.resetAngleBook(list);

      const cur = ((Number(current) || 0) % n + n) % n;
      const flewId = opts.flewId || '';
      const ghost = opts.ghost || null;

      // 从顶到底：depth 0..n-1，对应 list 循环序
      const order = [];
      for (let depth = 0; depth < n; depth += 1) {
        const photoIndex = (cur + depth) % n;
        order.push({
          photoIndex,
          p: list[photoIndex],
          depth,
        });
      }

      this.ensureInitialAngles(order.filter((r) => r.depth < STACK_SHOW));

      if (flewId) {
        const idx = order.findIndex((r) => r.p && r.p.id === flewId);
        let aboveRot = 0;
        if (idx > 0) aboveRot = this._angleById[order[idx - 1].p.id] || 0;
        else if (order.length) {
          aboveRot = this._angleById[order[order.length - 1].p.id] || 0;
        }
        if (idx !== 0) {
          const prevRot = this._angleById[flewId];
          const rot = this.calcAngleFromAbove(aboveRot, flewId);
          this.noteLean(rot, prevRot);
          this._angleById[flewId] = rot;
        }
      }

      // 底层先、顶层后，方便同 z 时的绘制顺序
      const layers = [];
      for (let i = order.length - 1; i >= 0; i -= 1) {
        const { p, photoIndex, depth } = order[i];
        if (!p) continue;
        const rot = this._angleById[p.id] || 0;
        const show = depth < STACK_SHOW;
        layers.push({
          id: p.id,
          photoId: p.id,
          src: p.src,
          caption: p.caption || '',
          photoIndex,
          isTop: depth === 0,
          isGhost: false,
          depth,
          rot,
          show,
          z: n - depth,
          mediaStyle: show ? mediaStyle(rot, depth) : '',
          imgStyle: show ? imgStyle(rot) : '',
        });
      }

      // 走影也是 layers 里的一项
      if (ghost) {
        layers.push({
          id: `ghost-${ghost.photoId}`,
          photoId: ghost.photoId,
          src: ghost.src,
          caption: '',
          photoIndex: ghost.photoIndex,
          isTop: false,
          isGhost: true,
          depth: -1,
          rot: ghost.rot || 0,
          show: true,
          z: n + 10,
          mediaStyle: ghost.mediaStyle || '',
          imgStyle: ghost.imgStyle || '',
        });
      }

      return layers;
    },

    layersPatch(list, current, opts) {
      const layers = this.buildLayers(list, current, opts);
      const top = layers.find((l) => l.isTop && !l.isGhost);
      return {
        layers,
        topId: (top && top.photoId) || '',
        topMediaStyle: (top && top.mediaStyle) || '',
        topImgStyle: (top && top.imgStyle) || '',
        totalCount: (list || []).length,
        countText: countLabel(current, (list || []).length),
      };
    },

    resetTouch() {
      this._touching = false;
      this._dragging = false;
      this._dir = '';
      this._startX = 0;
      this._startY = 0;
      this._dx = 0;
      this._dy = 0;
      this._moduleDragging = false;
      this._cardDragging = false;
    },

    onDelete(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this._skipTap = true;
      this.triggerEvent('delete', { id });
    },

    /** 与左右轮播同一套：utils/preview-photos → wx.previewImage */
    openPreview(index) {
      const list = this.data.photos || this.properties.photos || [];
      console.log('[pw-stack] openPreview', { index, listLen: list.length });
      previewPhotos(list, index, {
        fail: (err) => console.error('[pw-stack] previewImage fail', err),
      });
    },

    onTap() {
      console.log('[pw-stack] onTap', { skip: this._skipTap, flying: this._flying });
      this._awaitingTap = false;
      if (this._flying || this._skipTap) return;
      const top = (this.data.layers || []).find((l) => l.isTop && !l.isGhost);
      if (!top) return;
      this.openPreview(top.photoIndex);
    },

    onTouchStart(e) {
      if (this._flying) return;
      this.resetTouch();
      this._skipTap = false;
      this._touching = true;
      this._startX = e.touches[0].clientX;
      this._startY = e.touches[0].clientY;
    },

    onTouchMove(e) {
      if (!this._touching || this._flying) return;
      const dx = e.touches[0].clientX - this._startX;
      const dy = e.touches[0].clientY - this._startY;

      if (!this._dir) {
        if (Math.abs(dx) < DIR_LOCK && Math.abs(dy) < DIR_LOCK) return;
        this._dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        this._dragging = true;
      }

      this._dx = dx;
      this._dy = dy;

      if (this._dir === 'v') {
        this._cardDragging = false;
        if (dy < 0 && !this.data.hasNextModule) {
          if (this._moduleDragging) {
            this._moduleDragging = false;
            this.triggerEvent('moduledrag', { phase: 'cancel', dy: 0 });
          }
          return;
        }
        if (!this._moduleDragging) {
          this._moduleDragging = true;
          this.triggerEvent('moduledrag', { phase: 'start', dy: 0 });
        }
        this.triggerEvent('moduledrag', { phase: 'move', dy });
        return;
      }

      if (this._moduleDragging) {
        this._moduleDragging = false;
        this.triggerEvent('moduledrag', { phase: 'cancel', dy: 0 });
      }
      this._cardDragging = true;

      const top = (this.data.layers || []).find((l) => l.isTop && !l.isGhost);
      const baseRot = (top && top.rot) || 0;
      const n = (this.data.photos || []).length;
      const dragX = n <= 1 ? dx * 0.35 : dx;
      const dragRot = Math.max(-14, Math.min(14, dragX / 18));
      this.setData({
        topMediaDrag: `transform: translate3d(${dragX}px, 0, 0);`,
        topImgDrag: `transform: rotate(${baseRot + dragRot}deg);`,
      });
    },

    onTouchEnd() {
      if (!this._touching) return;
      if (this._flying) {
        this.resetTouch();
        this.setData({ topMediaDrag: '', topImgDrag: '' });
        return;
      }

      const moduleDragging = this._moduleDragging;
      const cardDragging = this._cardDragging;
      const dir = this._dir;
      const dx = this._dx;
      const dy = this._dy;
      this._touching = false;

      const n = (this.data.photos || []).length;
      const w =
        typeof wx !== 'undefined' && wx.getWindowInfo
          ? wx.getWindowInfo().windowWidth
          : 375;
      const flyTh = w * FLY_RATIO;

      // 轻点：交给 button bindtap 调 previewImage；若 tap 没来，本地全屏兜底
      if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) {
        if (moduleDragging) {
          this._moduleDragging = false;
          this.triggerEvent('moduledrag', { phase: 'cancel', dy: 0 });
        }
        const top = (this.data.layers || []).find((l) => l.isTop && !l.isGhost);
        this.setData({ topMediaDrag: '', topImgDrag: '' });
        this.resetTouch();
        // tap 由 button.bindtap 触发；此处只清状态
        this._awaitingTap = true;
        clearTimeout(this._tapFallbackTimer);
        this._tapFallbackTimer = setTimeout(() => {
          this._awaitingTap = false;
        }, 120);
        return;
      }

      // 有明显滑动：吞掉随后的 tap
      this._skipTap = true;
      this._awaitingTap = false;

      if (moduleDragging && dir === 'v' && Math.abs(dy) >= TAP_SLOP) {
        this._moduleDragging = false;
        this.triggerEvent('moduledrag', { phase: 'end', dy });
        this.setData({ topMediaDrag: '', topImgDrag: '' });
        this.resetTouch();
        return;
      }

      if (cardDragging && dir === 'h') {
        if (n > 1 && Math.abs(dx) >= flyTh) {
          this.flyToBottom(dx > 0 ? 1 : -1, dx);
        } else {
          const top = (this.data.layers || []).find((l) => l.isTop && !l.isGhost);
          const back = (top && top.mediaStyle) || '';
          const imgBack = (top && top.imgStyle) || '';
          this.setData({
            topMediaDrag: back
              ? `${back} transition: transform 0.28s cubic-bezier(0.22, 0.8, 0.28, 1);`
              : '',
            topImgDrag: imgBack,
          });
          clearTimeout(this._springTimer);
          this._springTimer = setTimeout(() => {
            if (!this._flying) this.setData({ topMediaDrag: '', topImgDrag: '' });
          }, 280);
        }
        this.resetTouch();
        return;
      }

      if (moduleDragging) {
        this._moduleDragging = false;
        this.triggerEvent('moduledrag', { phase: 'cancel', dy: 0 });
      }
      this.setData({ topMediaDrag: '', topImgDrag: '' });
      this.resetTouch();
    },

    flyToBottom(sign, fromDx) {
      const list = this.data.photos || [];
      const n = list.length;
      if (n <= 1) return;

      const cur = this.data.innerCurrent;
      const photo = list[cur];
      if (!photo) return;

      const next = (cur + 1) % n;
      const w =
        typeof wx !== 'undefined' && wx.getWindowInfo
          ? wx.getWindowInfo().windowWidth
          : 375;
      const startX = Number(fromDx) || 0;
      const top = (this.data.layers || []).find((l) => l.isTop && !l.isGhost);
      const baseRot = (top && top.rot) || 0;
      const startRot = baseRot + Math.max(-14, Math.min(14, startX / 18));
      const dist = (w + 80) * (sign >= 0 ? 1 : -1);
      const endRot = baseRot + (sign >= 0 ? 18 : -18);

      this._flying = true;
      const patch = this.layersPatch(list, next, {
        flewId: photo.id,
        ghost: {
          photoId: photo.id,
          photoIndex: cur,
          src: photo.src,
          rot: baseRot,
          mediaStyle: `transform: translate3d(${startX}px, 0, 0);`,
          imgStyle: `transform: rotate(${startRot}deg);`,
        },
      });

      this.setData({
        topMediaDrag: '',
        topImgDrag: '',
        innerCurrent: next,
        ...patch,
      });

      const ghostIndex = patch.layers.findIndex((l) => l.isGhost);
      clearTimeout(this._flyKick);
      this._flyKick = setTimeout(() => {
        if (ghostIndex < 0) return;
        this.setData({
          [`layers[${ghostIndex}].mediaStyle`]: `transform: translate3d(${dist}px, 0, 0); opacity: 0; transition: transform ${FLY_MS}ms ease, opacity ${FLY_MS}ms ease;`,
          [`layers[${ghostIndex}].imgStyle`]: `transform: rotate(${endRot}deg); transition: transform ${FLY_MS}ms ease;`,
        });
      }, 16);

      clearTimeout(this._flyTimer);
      this._flyTimer = setTimeout(() => {
        this._flying = false;
        // 去掉走影项，保留新牌序
        const cleaned = (this.data.layers || []).filter((l) => !l.isGhost);
        this.setData({ layers: cleaned });
        this.triggerEvent('change', { current: next });
      }, FLY_MS + 24);
    },
  },
});
