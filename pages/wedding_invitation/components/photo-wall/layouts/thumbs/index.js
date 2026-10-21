import { photoCropDisplayForCell } from '../../../../utils/cover-crop';

const MOVE_SLOP = 10;
const SWIPE_THRESHOLD = 40;
const FADE_MS = 320;

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
    thumbs: [],
    scrollInto: '',
  },

  observers: {
    'photos, height': function (photos, height) {
      this._list = photos || [];
      // 主图区域大约总高减去缩略条
      const mainH = Math.max(120, (Number(height) || 400) - 72);
      this._cellAspect = readViewportWidth() / mainH;
      const n = this._list.length;
      let next = Number(this.properties.current);
      if (!Number.isFinite(next)) next = this.data.innerCurrent || 0;
      if (n <= 0) next = 0;
      else next = Math.max(0, Math.min(n - 1, next));
      this._syncThumbs();
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
      const mainH = Math.max(120, (Number(this.properties.height) || 400) - 72);
      this._cellAspect = readViewportWidth() / mainH;
      this._fading = false;
      this._selfNavigate = false;
      this._syncThumbs();
      this._applyIndex(Number(this.properties.current) || 0, {
        animate: false,
      });
    },
    detached() {
      clearTimeout(this._fadeTimer);
      clearTimeout(this._fadeKick);
      clearTimeout(this._scrollTimer);
    },
  },

  methods: {
    _syncThumbs() {
      const thumbs = (this._list || []).map((p) => ({
        id: (p && p.id) || '',
        src: (p && p.src) || '',
      }));
      this.setData({ thumbs });
    },

    _clearFadeTimers() {
      clearTimeout(this._fadeTimer);
      clearTimeout(this._fadeKick);
    },

    _scrollThumbIntoView(index) {
      // 先清空再设，确保相同 id 也能触发滚动
      this.setData({ scrollInto: '' });
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => {
        this.setData({ scrollInto: `thumb-${index}` });
      }, 30);
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
          scrollInto: '',
        });
        return;
      }

      const next = Math.max(0, Math.min(n - 1, Number(index) || 0));
      const slot = toSlot(list[next], this._cellAspect || 0.75);

      if (!animate) {
        this._snapTo(next, slot);
        return;
      }
      if (next === this.data.innerCurrent) return;

      if (this._fading) {
        this._interruptThenFade(next, slot);
        return;
      }
      this._fadeTo(next, slot);
    },

    _snapTo(next, slot) {
      this._clearFadeTimers();
      this._fading = false;
      const active = this.data.activeSlot === 'b' ? 'b' : 'a';
      const patch = {
        innerCurrent: next,
        topId: slot.id,
        caption: slot.caption,
        activeSlot: active,
        opacityA: active === 'a' ? 1 : 0,
        opacityB: active === 'b' ? 1 : 0,
      };
      if (active === 'a') patch.slotA = slot;
      else patch.slotB = slot;
      this.setData(patch);
      this._scrollThumbIntoView(next);
    },

    _interruptThenFade(next, slot) {
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
      this.setData(settle, () => this._fadeTo(next, slot));
    },

    _fadeTo(next, slot) {
      const from = this.data.activeSlot === 'b' ? 'b' : 'a';
      const to = from === 'a' ? 'b' : 'a';
      this._fading = true;
      this._selfNavigate = true;
      this._clearFadeTimers();

      const preload = {
        topId: slot.id,
        caption: slot.caption,
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
        this._scrollThumbIntoView(next);
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

    onThumbTap(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index)) return;
      this.goTo(index);
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
