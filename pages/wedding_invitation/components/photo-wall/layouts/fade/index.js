import { photoCropDisplayForCell } from '../../../../utils/cover-crop';

const MOVE_SLOP = 10;
const SWIPE_THRESHOLD = 40;
const FADE_MS = 420;

function readViewportWidth() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      return wx.getWindowInfo().windowWidth || 375;
    }
  } catch (e) {
    /* ignore */
  }
  try {
    return wx.getSystemInfoSync().windowWidth || 375;
  } catch (e2) {
    return 375;
  }
}

function emptySlot() {
  return { id: '', src: '', useCrop: false, imgBoxStyle: '', caption: '' };
}

function toSlot(photo, cellAspect) {
  if (!photo) return emptySlot();
  const disp = photoCropDisplayForCell(photo, cellAspect) || {};
  return {
    id: photo.id || '',
    src: photo.src || '',
    caption: photo.caption || '',
    useCrop: !!disp.useCrop,
    imgBoxStyle: disp.imgBoxStyle || '',
  };
}

function buildDots(n) {
  const list = [];
  for (let i = 0; i < n; i += 1) list.push(i);
  return list;
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
    activeSlot: 'a',
    slotA: emptySlot(),
    slotB: emptySlot(),
    opacityA: 1,
    opacityB: 0,
    topId: '',
    caption: '',
    dotCount: 0,
    dotList: [],
  },

  observers: {
    'photos, height': function (photos, height) {
      this._list = photos || [];
      this._cellAspect =
        readViewportWidth() / Math.max(1, Number(height) || 400);
      const n = this._list.length;
      let next = Number(this.properties.current);
      if (!Number.isFinite(next)) next = this.data.innerCurrent || 0;
      if (n <= 0) next = 0;
      else next = Math.max(0, Math.min(n - 1, next));
      this._applyIndex(next, { animate: false });
    },
    current: function (current) {
      if (this._selfNavigate) return;
      const n = (this._list || []).length;
      if (n <= 0) return;
      let next = Number(current);
      if (!Number.isFinite(next)) next = 0;
      next = Math.max(0, Math.min(n - 1, next));
      if (next === this.data.innerCurrent) return;
      this._applyIndex(next, { animate: true });
    },
  },

  lifetimes: {
    attached() {
      this._list = this.properties.photos || [];
      this._cellAspect =
        readViewportWidth() /
        Math.max(1, Number(this.properties.height) || 400);
      this._fading = false;
      this._selfNavigate = false;
      this._applyIndex(Number(this.properties.current) || 0, {
        animate: false,
      });
    },
    detached() {
      clearTimeout(this._fadeTimer);
      clearTimeout(this._fadeKick);
    },
  },

  methods: {
    _clearFadeTimers() {
      clearTimeout(this._fadeTimer);
      clearTimeout(this._fadeKick);
    },

    _applyIndex(index, opts = {}) {
      const list = this._list || [];
      const n = list.length;
      const animate = !!opts.animate;
      if (n <= 0) {
        this._clearFadeTimers();
        this._fading = false;
        this._selfNavigate = false;
        this.setData({
          innerCurrent: 0,
          slotA: emptySlot(),
          slotB: emptySlot(),
          activeSlot: 'a',
          opacityA: 1,
          opacityB: 0,
          topId: '',
          caption: '',
          dotCount: 0,
          dotList: [],
        });
        return;
      }

      const next = Math.max(0, Math.min(n - 1, Number(index) || 0));
      const slot = toSlot(list[next], this._cellAspect || 0.75);
      const dots = buildDots(n);

      if (!animate) {
        this._snapTo(next, slot, dots);
        return;
      }
      if (next === this.data.innerCurrent) return;

      // 动画进行中再滑：先落稳当前页，再淡到新目标（可连滑）
      if (this._fading) {
        this._interruptThenFade(next, slot, dots);
        return;
      }

      this._fadeTo(next, slot, dots);
    },

    _snapTo(next, slot, dots) {
      this._clearFadeTimers();
      this._fading = false;
      const active = this.data.activeSlot === 'b' ? 'b' : 'a';
      const patch = {
        innerCurrent: next,
        topId: slot.id,
        caption: slot.caption,
        dotCount: dots.length,
        dotList: dots,
        activeSlot: active,
        opacityA: active === 'a' ? 1 : 0,
        opacityB: active === 'b' ? 1 : 0,
      };
      if (active === 'a') patch.slotA = slot;
      else patch.slotB = slot;
      this.setData(patch);
    },

    /** 打断进行中的淡入：立刻显示当前目标，再开下一趟淡入 */
    _interruptThenFade(next, slot, dots) {
      this._clearFadeTimers();
      const list = this._list || [];
      const cur = this.data.innerCurrent || 0;
      const curSlot = toSlot(list[cur], this._cellAspect || 0.75);
      const active = this.data.activeSlot === 'b' ? 'b' : 'a';
      const settle = {
        topId: curSlot.id,
        caption: curSlot.caption,
        opacityA: active === 'a' ? 1 : 0,
        opacityB: active === 'b' ? 1 : 0,
      };
      if (active === 'a') settle.slotA = curSlot;
      else settle.slotB = curSlot;

      this._fading = false;
      this.setData(settle, () => {
        this._fadeTo(next, slot, dots);
      });
    },

    /**
     * 交叉淡化：先铺隐藏层，再交叉改 opacity
     */
    _fadeTo(next, slot, dots) {
      const from = this.data.activeSlot === 'b' ? 'b' : 'a';
      const to = from === 'a' ? 'b' : 'a';
      this._fading = true;
      this._selfNavigate = true;
      this._clearFadeTimers();

      const preload = {
        topId: slot.id,
        caption: slot.caption,
        dotCount: dots.length,
        dotList: dots,
        innerCurrent: next,
      };
      if (to === 'a') {
        preload.slotA = slot;
        preload.opacityA = 0;
        preload.opacityB = 1;
      } else {
        preload.slotB = slot;
        preload.opacityB = 0;
        preload.opacityA = 1;
      }

      this.setData(preload, () => {
        this._fadeKick = setTimeout(() => {
          const cross = { activeSlot: to };
          if (to === 'a') {
            cross.opacityA = 1;
            cross.opacityB = 0;
          } else {
            cross.opacityB = 1;
            cross.opacityA = 0;
          }
          this.setData(cross);
          this._fadeTimer = setTimeout(() => {
            this._fading = false;
            this._selfNavigate = false;
            this.triggerEvent('change', { current: next });
          }, FADE_MS + 20);
        }, 24);
      });
    },

    goTo(index) {
      const n = (this._list || []).length;
      if (n <= 0) return;
      const next = Math.max(0, Math.min(n - 1, index));
      if (next === this.data.innerCurrent && !this._fading) return;
      this._applyIndex(next, { animate: true });
    },

    onDelete(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this.triggerEvent('delete', { id });
    },

    onTouchStart(e) {
      const t = e.touches && e.touches[0];
      if (!t) return;
      this._touching = true;
      this._dragging = false;
      this._dir = '';
      this._moduleDragging = false;
      this._startX = t.clientX;
      this._startY = t.clientY;
      this._lastDx = 0;
      this._lastDy = 0;
    },

    onTouchMove(e) {
      if (!this._touching) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dx = t.clientX - this._startX;
      const dy = t.clientY - this._startY;
      this._lastDx = dx;
      this._lastDy = dy;

      if (!this._dir) {
        if (Math.abs(dx) < MOVE_SLOP && Math.abs(dy) < MOVE_SLOP) return;
        this._dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        this._dragging = true;
      }

      // 淡入进行中仍允许左右连滑；纵向切模块等动画结束更稳
      if (this._dir !== 'v' || this._fading) return;

      if (dy < 0 && !this.properties.hasNextModule) {
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
    },

    onTouchEnd() {
      if (!this._touching) return;
      const dragging = this._dragging;
      const dir = this._dir;
      const moduleDragging = this._moduleDragging;
      const lastDx = this._lastDx;
      const lastDy = this._lastDy;
      this._touching = false;
      this._dragging = false;
      this._dir = '';
      this._moduleDragging = false;
      this._lastDx = 0;
      this._lastDy = 0;

      if (moduleDragging) {
        this.triggerEvent('moduledrag', { phase: 'end', dy: lastDy });
        return;
      }

      if (!dragging) {
        if (this._fading) return;
        this.triggerEvent('preview', { index: this.data.innerCurrent || 0 });
        return;
      }

      if (dir !== 'h') return;

      const n = (this._list || []).length;
      if (n <= 1) return;
      const cur = this.data.innerCurrent || 0;
      if (lastDx <= -SWIPE_THRESHOLD && cur < n - 1) {
        this.goTo(cur + 1);
      } else if (lastDx >= SWIPE_THRESHOLD && cur > 0) {
        this.goTo(cur - 1);
      }
    },
  },
});
