/** PS 式选色：上 SV 面板 + 色相条，下常用色 */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgb(hex) {
  const s = String(hex || '').replace('#', '');
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    return { r, g, b };
  }
  if (s.length !== 6) return { r: 61, g: 41, b: 20 };
  return {
    r: parseInt(s.slice(0, 2), 16) || 0,
    g: parseInt(s.slice(2, 4), 16) || 0,
    b: parseInt(s.slice(4, 6), 16) || 0,
  };
}

function rgbToHex(r, g, b) {
  const h = (n) => {
    const s = clamp(Math.round(n), 0, 255).toString(16);
    return s.length === 1 ? `0${s}` : s;
  };
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s, v };
}

function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

Component({
  properties: {
    visible: { type: Boolean, value: false },
    value: { type: String, value: '#3d2914' },
    presets: { type: Array, value: [] },
    title: { type: String, value: '选择颜色' },
  },

  data: {
    h: 20,
    s: 0.55,
    v: 0.3,
    hex: '#3d2914',
    hueColor: '#ff5500',
    panelStyle: '',
    thumbLeft: 55,
    thumbTop: 70,
    hueTop: 5.5,
    panelW: 0,
    panelH: 0,
    hueH: 0,
  },

  observers: {
    visible(v) {
      if (v) {
        this._syncFromValue(this.data.value);
        setTimeout(() => this._measure(), 40);
      }
    },
    value(hex) {
      if (!this.data.visible) return;
      if (String(hex || '').toLowerCase() === String(this.data.hex || '').toLowerCase()) {
        return;
      }
      this._syncFromValue(hex);
    },
  },

  methods: {
    noop() {},

    onMask() {
      this.triggerEvent('close');
    },

    onDone() {
      this.triggerEvent('change', { color: this.data.hex });
      this.triggerEvent('close');
    },

    _syncFromValue(hex) {
      const rgb = hexToRgb(hex);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      const nextHex = rgbToHex(rgb.r, rgb.g, rgb.b);
      this._h = hsv.h;
      this._s = hsv.s;
      this._v = hsv.v;
      this._hex = nextHex;
      this.setData({
        h: hsv.h,
        s: hsv.s,
        v: hsv.v,
        hex: nextHex,
        ...this._uiFromHsv(hsv.h, hsv.s, hsv.v),
      });
    },

    _uiFromHsv(h, s, v) {
      const hueColor = hsvToHex(h, 1, 1);
      return {
        hueColor,
        panelStyle: `background: ${hueColor};`,
        thumbLeft: s * 100,
        thumbTop: (1 - v) * 100,
        hueTop: (h / 360) * 100,
      };
    },

    /** 拖动中只更新滑块 UI；颜色回写父级节流，避免整页 setData 拖死跟手 */
    _paint(h, s, v, notify) {
      const hex = hsvToHex(h, s, v);
      const ui = this._uiFromHsv(h, s, v);
      this._h = h;
      this._s = s;
      this._v = v;
      this._hex = hex;
      this.setData({
        h,
        s,
        v,
        hex,
        hueColor: ui.hueColor,
        panelStyle: ui.panelStyle,
        thumbLeft: ui.thumbLeft,
        thumbTop: ui.thumbTop,
        hueTop: ui.hueTop,
      });
      if (!notify) return;
      const now = Date.now();
      if (notify === 'move') {
        if (this._lastNotify && now - this._lastNotify < 50) {
          this._needFlush = true;
          return;
        }
        this._lastNotify = now;
        this._needFlush = false;
      }
      this.triggerEvent('change', { color: hex });
    },

    _flushNotify() {
      if (!this._needFlush && !this._hex) return;
      this._needFlush = false;
      this._lastNotify = Date.now();
      this.triggerEvent('change', { color: this._hex || this.data.hex });
    },

    _measure(cb) {
      this.createSelectorQuery()
        .select('.color-picker__sv')
        .boundingClientRect()
        .select('.color-picker__hue')
        .boundingClientRect()
        .exec((res) => {
          const sv = res && res[0];
          const hue = res && res[1];
          if (sv && sv.width && sv.height) this._svRect = sv;
          if (hue && hue.height) this._hueRect = hue;
          if (typeof cb === 'function') cb();
        });
    },

    onSvStart(e) {
      this._dragging = 'sv';
      const touch = e;
      this._measure(() => this._applySvTouch(touch));
    },

    onSvMove(e) {
      if (this._dragging !== 'sv') return;
      this._applySvTouch(e);
    },

    onSvEnd(e) {
      if (this._dragging === 'sv') this._applySvTouch(e);
      this._dragging = '';
      this._flushNotify();
    },

    _applySvTouch(e) {
      const t =
        (e.touches && e.touches[0]) ||
        (e.changedTouches && e.changedTouches[0]);
      if (!t) return;
      const rect = this._svRect;
      if (!rect || !rect.width) return;
      const x = clamp(t.clientX - rect.left, 0, rect.width);
      const y = clamp(t.clientY - rect.top, 0, rect.height);
      const s = x / rect.width;
      const v = 1 - y / rect.height;
      const h = this._h != null ? this._h : this.data.h;
      this._paint(h, s, v, this._dragging === 'sv' ? 'move' : 'end');
    },

    onHueStart(e) {
      this._dragging = 'hue';
      const touch = e;
      this._measure(() => this._applyHueTouch(touch));
    },

    onHueMove(e) {
      if (this._dragging !== 'hue') return;
      this._applyHueTouch(e);
    },

    onHueEnd(e) {
      if (this._dragging === 'hue') this._applyHueTouch(e);
      this._dragging = '';
      this._flushNotify();
    },

    _applyHueTouch(e) {
      const t =
        (e.touches && e.touches[0]) ||
        (e.changedTouches && e.changedTouches[0]);
      if (!t) return;
      const rect = this._hueRect;
      if (!rect || !rect.height) return;
      const y = clamp(t.clientY - rect.top, 0, rect.height);
      const h = (y / rect.height) * 360;
      const s = this._s != null ? this._s : this.data.s;
      const v = this._v != null ? this._v : this.data.v;
      this._paint(h, s, v, this._dragging === 'hue' ? 'move' : 'end');
    },

    onPickPreset(e) {
      const color = e.currentTarget.dataset.color;
      if (!color) return;
      this._syncFromValue(color);
      this._hex = this.data.hex;
      this.triggerEvent('change', { color: this.data.hex });
    },
  },
});
