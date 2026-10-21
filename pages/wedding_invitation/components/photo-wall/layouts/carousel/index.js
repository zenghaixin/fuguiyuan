import { photoCropDisplayForCell } from '../../../../utils/cover-crop';

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

function mapViewPhotos(list, height) {
  const vw = readViewportWidth();
  const cellAspect = vw / Math.max(1, Number(height) || 400);
  return (list || [])
    .map((p) => {
      if (!p) return null;
      const disp = photoCropDisplayForCell(p, cellAspect) || {};
      return {
        id: p.id,
        src: p.src,
        caption: p.caption || '',
        useCrop: !!disp.useCrop,
        imgBoxStyle: disp.imgBoxStyle || '',
      };
    })
    .filter(Boolean);
}

Component({
  properties: {
    photos: { type: Array, value: [] },
    height: { type: Number, value: 400 },
    editable: { type: Boolean, value: false },
    current: { type: Number, value: 0 },
  },

  data: {
    innerCurrent: 0,
    viewPhotos: [],
  },

  observers: {
    // 只在 photos/height 变化时重建，避免跟 current 互相触发 setData
    'photos, height': function (photos, height) {
      const list = photos || [];
      const viewPhotos = mapViewPhotos(list, height);
      const max = Math.max(list.length - 1, 0);
      let next = Number(this.properties.current);
      if (!Number.isFinite(next)) next = this.data.innerCurrent || 0;
      next = Math.max(0, Math.min(max, next));
      this.setData({ viewPhotos, innerCurrent: next });
    },
    current: function (current) {
      const max = Math.max((this.data.viewPhotos || []).length - 1, 0);
      let next = Number(current);
      if (!Number.isFinite(next)) next = 0;
      next = Math.max(0, Math.min(max, next));
      if (next !== this.data.innerCurrent) {
        this.setData({ innerCurrent: next });
      }
    },
  },

  methods: {
    onChange(e) {
      const current = (e.detail && e.detail.current) || 0;
      if (current !== this.data.innerCurrent) {
        this.setData({ innerCurrent: current });
      }
      this.triggerEvent('change', { current });
    },

    onPreview(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (Number.isNaN(index)) return;
      this.triggerEvent('preview', { index });
    },

    onDelete(e) {
      const id = e.currentTarget.dataset.id;
      if (!id) return;
      this.triggerEvent('delete', { id });
    },
  },
});
