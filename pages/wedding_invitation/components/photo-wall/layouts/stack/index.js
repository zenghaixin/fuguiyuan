const { previewPhotos } = require('../../../../utils/preview-photos');

const DIR_LOCK = 10;
const TAP_SLOP = 28;
const FLY_RATIO = 0.1;
const FLY_MS = 280;
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

/** 静置：位移 + 旋转 + 缩放都在同一张牌上（跟手时也只改这一条） */
function layerTransform(rot, depth, show) {
  const lean = rot >= 0 ? 1 : -1;
  const tx = lean * (6 + Math.abs(rot) * 0.6) + lean * depth * 1.5;
  const ty = depth * 10;
  const scale = Math.max(0.82, 1 - depth * 0.04);
  const opacity = depth <= 2 ? 1 : Math.max(0.92, 1 - (depth - 2) * 0.04);
  const z = show - depth;
  return `transform: translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale}); opacity: ${opacity}; z-index: ${z};`;
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
    deck: [],
    topId: '',
    totalCount: 0,
    countText: '',
    topStyle: '',
    topLayerStyle: '',
    /** 翻牌上浮过渡中 */
    rising: false,
    flyGhost: {
      show: false,
      src: '',
      style: '',
    },
  },

  observers: {
    // 合并监听：父级一次 setData 同时改 photos+current 时，避免连续两次重建 deck 触发渲染层崩溃
    'photos, current': function (photos, current) {
      if (this._flying) return;
      const list = photos || [];
      const sig = list.map((p) => p && p.id).join(',');
      const photosChanged = sig !== this._photosSig;
      let next = Number(current);
      if (!Number.isFinite(next)) next = 0;
      const n = list.length;
      if (n > 0) next = ((next % n) + n) % n;
      else next = 0;

      if (
        !photosChanged &&
        next === this.data.innerCurrent &&
        (this.data.deck || []).length
      ) {
        return;
      }
      if (photosChanged) this._photosSig = sig;
      this.syncFromProps({
        resetAngles: photosChanged,
        current: next,
      });
    },
  },

  lifetimes: {
    attached() {
      this.resetTouch();
      this.syncFromProps({ resetAngles: true });
    },
    ready() {
      this.syncFromProps({
        resetAngles: !(this.data.deck && this.data.deck.length),
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

      if (opts.resetAngles || !this._angleByAbs) {
        this.resetAngleBook(list);
        this._photosSig = list.map((p) => p && p.id).join(',');
        this._absCurrent = next;
      } else {
        // 对齐到同一张图，绝对游标只平移，不整表重建 → 环形 key 可衔接
        this.alignAbsCurrent(next, n);
      }

      const patch = this.deckPatch(list, next);
      if (
        !opts.resetAngles &&
        next === this.data.innerCurrent &&
        (this.data.deck || []).length === (patch.deck || []).length &&
        this.data.topId === patch.topId
      ) {
        return;
      }

      this.setData({
        innerCurrent: next,
        ...patch,
        topStyle: '',
        rising: false,
        flyGhost: { show: false, src: '', style: '' },
      });
    },

    /** 让 _absCurrent % n === current，保留单调递增，供环形 wx:key */
    alignAbsCurrent(current, n) {
      if (!n) {
        this._absCurrent = 0;
        return;
      }
      const cur = ((Number(current) || 0) % n + n) % n;
      if (this._absCurrent == null || !Number.isFinite(this._absCurrent)) {
        this._absCurrent = cur;
        return;
      }
      const a = this._absCurrent;
      const mod = ((a % n) + n) % n;
      this._absCurrent = a - mod + cur;
    },

    resetAngleBook() {
      this._angleByAbs = {};
      this._leanBalance = { left: 0, right: 0 };
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
      if (!this._angleByAbs) this._angleByAbs = {};
      order.forEach((row, i) => {
        const abs = row.abs;
        if (abs == null || this._angleByAbs[abs] != null) return;
        const seed = `${(row.p && row.p.id) || 'p'}:${abs}`;
        let rot;
        if (i === 0) rot = this.initialTopAngle(seed);
        else {
          const aboveRot = this._angleByAbs[order[i - 1].abs];
          rot = this.calcAngleFromAbove(aboveRot == null ? 0 : aboveRot, seed);
        }
        this.noteLean(rot, null);
        this._angleByAbs[abs] = rot;
      });
    },

    /**
     * 环形预留：始终铺 STACK_SHOW 层（可重复 A,B,C,D,A…）。
     * wx:key 用绝对下标 k-{abs}，飞走只丢掉顶层 key，底下已有的下一张不会「突然生成」。
     */
    buildDeck(photos, current, opts = {}) {
      const list = photos || [];
      const n = list.length;
      if (!n) return [];
      if (!this._angleByAbs) this.resetAngleBook();

      const cur = ((Number(current) || 0) % n + n) % n;
      // 多于 1 张时固定铺满 STACK_SHOW，不足则循环重复（像无限列表预载）
      const show = n <= 1 ? 1 : STACK_SHOW;

      let absBase = opts.absBase;
      if (absBase == null) absBase = this._absCurrent;
      if (absBase == null || !Number.isFinite(absBase)) absBase = cur;
      const mod = ((absBase % n) + n) % n;
      if (mod !== cur) absBase = absBase - mod + cur;

      const order = [];
      for (let depth = 0; depth < show; depth += 1) {
        const abs = absBase + depth;
        const photoIndex = ((abs % n) + n) % n;
        order.push({
          abs,
          photoIndex,
          p: list[photoIndex],
          depth,
        });
      }

      this.ensureInitialAngles(order);

      const cards = [];
      for (let i = order.length - 1; i >= 0; i -= 1) {
        const { p, photoIndex, depth, abs } = order[i];
        if (!p) continue;
        const rot = this._angleByAbs[abs] || 0;
        const style = layerTransform(rot, depth, show);
        cards.push({
          id: `k-${abs}`,
          photoId: p.id,
          src: p.src,
          caption: p.caption || '',
          photoIndex,
          isTop: depth === 0,
          depth,
          rot,
          layerStyle: style,
        });
      }
      return cards;
    },

    deckPatch(list, current, opts) {
      const deck = this.buildDeck(list, current, opts);
      const top = deck.find((c) => c.isTop);
      return {
        deck,
        topId: (top && top.photoId) || '',
        topLayerStyle: (top && top.layerStyle) || '',
        totalCount: (list || []).length,
        countText: countLabel(current, (list || []).length),
      };
    },

    pruneAngleAbs(absBase) {
      if (!this._angleByAbs) return;
      const minKeep = (Number(absBase) || 0) - 2;
      Object.keys(this._angleByAbs).forEach((k) => {
        if (Number(k) < minKeep) delete this._angleByAbs[k];
      });
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

    /**
     * 原生 button 内子节点经常收不到 tap，只稳定收到 touch*。
     * 用 touchstart 标记、touchend 真正删除（防重复）。
     * 删除事件必须延后抛出：在 touch 回调里立刻 setData 拆掉 button/自定义组件，
     * 会触发渲染层 FLOW_ALLOC_NODE_ID。
     */
    onDeleteStart(e) {
      const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
      this._skipTap = true;
      this._touching = false;
      this._deletePendingId = id || this.data.topId || '';
    },

    onDeleteCancel() {
      this._deletePendingId = '';
    },

    onDelete(e) {
      const id =
        (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) ||
        this._deletePendingId ||
        '';
      if (!id) return;
      // touchend + tap 可能连续到，同一按下只删一次
      if (this._deleteFiredId === id && Date.now() - (this._deleteFiredAt || 0) < 400) {
        return;
      }
      this._deleteFiredId = id;
      this._deleteFiredAt = Date.now();
      this._deletePendingId = '';
      this._skipTap = true;
      if (this._deleteTimer) clearTimeout(this._deleteTimer);
      this._deleteTimer = setTimeout(() => {
        this._deleteTimer = null;
        this.triggerEvent('delete', { id });
      }, 32);
    },

    openPreview(index) {
      previewPhotos(this.data.photos || this.properties.photos || [], index, {
        fail: (err) => console.error('[pw-stack] previewImage fail', err),
      });
    },

    onTap() {
      this._awaitingTap = false;
      if (this._flying || this._skipTap) return;
      const top = (this.data.deck || []).find((c) => c.isTop);
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

      const n = (this.data.photos || []).length;
      const dragX = n <= 1 ? dx * 0.35 : dx;
      const rot = Math.max(-14, Math.min(14, dragX / 18));
      // 一条 topStyle：位移+倾斜，只动顶牌
      this.setData({
        topStyle: `transform: translate3d(${dragX}px, 0, 0) rotate(${rot}deg); z-index: 10;`,
      });
    },

    onTouchEnd() {
      if (!this._touching) return;
      if (this._flying) {
        this.resetTouch();
        this.setData({ topStyle: '' });
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

      if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) {
        if (moduleDragging) {
          this._moduleDragging = false;
          this.triggerEvent('moduledrag', { phase: 'cancel', dy: 0 });
        }
        this.setData({ topStyle: '' });
        this.resetTouch();
        return;
      }

      this._skipTap = true;

      if (moduleDragging && dir === 'v' && Math.abs(dy) >= TAP_SLOP) {
        this._moduleDragging = false;
        this.triggerEvent('moduledrag', { phase: 'end', dy });
        this.setData({ topStyle: '' });
        this.resetTouch();
        return;
      }

      if (cardDragging && dir === 'h') {
        if (n > 1 && Math.abs(dx) >= flyTh) {
          this.flyToBottom(dx > 0 ? 1 : -1, dx);
        } else {
          const top = (this.data.deck || []).find((c) => c.isTop);
          const back = (top && top.layerStyle) || '';
          this.setData({
            topStyle: back
              ? `${back} transition: transform 0.28s cubic-bezier(0.22, 0.8, 0.28, 1);`
              : '',
          });
          clearTimeout(this._springTimer);
          this._springTimer = setTimeout(() => {
            if (!this._flying) this.setData({ topStyle: '' });
          }, 280);
        }
        this.resetTouch();
        return;
      }

      if (moduleDragging) {
        this._moduleDragging = false;
        this.triggerEvent('moduledrag', { phase: 'cancel', dy: 0 });
      }
      this.setData({ topStyle: '' });
      this.resetTouch();
    },

    flyToBottom(sign, fromDx) {
      const list = this.data.photos || this.properties.photos || [];
      const n = list.length;
      if (n <= 1) return;

      const cur = this.data.innerCurrent;
      const photo = list[cur];
      if (!photo) return;

      const next = (cur + 1) % n;
      const absNext =
        (this._absCurrent != null && Number.isFinite(this._absCurrent)
          ? this._absCurrent
          : cur) + 1;
      this._absCurrent = absNext;
      this.pruneAngleAbs(absNext);

      const w =
        typeof wx !== 'undefined' && wx.getWindowInfo
          ? wx.getWindowInfo().windowWidth
          : 375;
      const startX = Number(fromDx) || 0;
      const startRot = Math.max(-14, Math.min(14, startX / 18));
      const dist = (w + 80) * (sign >= 0 ? 1 : -1);
      const endRot = sign >= 0 ? 18 : -18;
      const ease = `transform ${FLY_MS}ms cubic-bezier(0.22, 0.8, 0.28, 1), opacity ${FLY_MS}ms ease`;

      this._flying = true;

      // ① 先开 rise；换 deck 时顶层 k-{old} 卸掉，底下已预留的环向牌上浮，底部只多一张新 key
      this.setData({ rising: true, topStyle: '' }, () => {
        const patch = this.deckPatch(list, next, { absBase: absNext });

        this.setData(
          {
            innerCurrent: next,
            ...patch,
            flyGhost: {
              show: true,
              src: photo.src,
              style: `transform: translate3d(${startX}px, 0, 0) rotate(${startRot}deg);`,
            },
          },
          () => {
            clearTimeout(this._flyKick);
            this._flyKick = setTimeout(() => {
              this.setData({
                'flyGhost.style': `transform: translate3d(${dist}px, 0, 0) rotate(${endRot}deg); opacity: 0; transition: ${ease};`,
              });
            }, 20);
          }
        );
      });

      clearTimeout(this._flyTimer);
      this._flyTimer = setTimeout(() => {
        const patch = this.deckPatch(list, next, { absBase: absNext });
        this._flying = false;
        this.setData({
          rising: false,
          flyGhost: { show: false, src: '', style: '' },
          ...patch,
        });
        this.triggerEvent('change', { current: next });
      }, FLY_MS + 32);
    },
  },
});

