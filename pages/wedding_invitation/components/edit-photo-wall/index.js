Component({
  properties: {
    photos: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    statusBarHeight: { type: Number, value: 20 },
    backTop: { type: Number, value: 48 },
    backSize: { type: Number, value: 32 },
  },

  data: {
    stageHeight: 400,
  },

  observers: {
    'windowHeight, backTop, backSize, photos': function (
      windowHeight,
      backTop,
      backSize,
      photos
    ) {
      const head = (backTop || 48) + (backSize || 32) + 56;
      const toolbox = 120;
      const addBar = photos && photos.length ? 88 : 0;
      const h = Math.max(240, (windowHeight || 667) - head - toolbox - addBar);
      this.setData({ stageHeight: h });
    },
  },

  methods: {
    onAdd() {
      this.triggerEvent('add');
    },

    onDelete(e) {
      const id = e.detail && e.detail.id;
      if (!id) return;
      this.triggerEvent('delete', { id });
    },
  },
});
