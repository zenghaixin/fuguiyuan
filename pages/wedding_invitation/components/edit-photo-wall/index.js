Component({
  properties: {
    photos: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    windowWidth: { type: Number, value: 375 },
    statusBarHeight: { type: Number, value: 20 },
    backTop: { type: Number, value: 48 },
    backSize: { type: Number, value: 32 },
    /** 轮播当前页 */
    current: { type: Number, value: 0 },
    /** 排版：carousel | column | grid4 | … */
    layout: { type: String, value: 'carousel' },
  },

  data: {
    stageHeight: 400,
    gridCols: 2,
    isGrid: false,
  },

  observers: {
    'windowHeight, windowWidth, backTop, backSize, photos, layout': function () {
      this.scheduleMeasure();
    },
    layout: function (layout) {
      const key = layout === 'grid' ? 'grid4' : layout;
      const isGrid = key === 'grid4' || key === 'grid9';
      this.setData({
        isGrid,
        gridCols: key === 'grid9' ? 3 : 2,
      });
      // 切叠放等排版时子组件刚挂载，补测高度避免舞台为 0 不显示
      this.scheduleMeasure(32);
      this.scheduleMeasure(120);
      this.scheduleMeasure(280);
    },
  },

  lifetimes: {
    ready() {
      this.scheduleMeasure();
    },
  },

  pageLifetimes: {
    show() {
      this.scheduleMeasure();
    },
  },

  methods: {
    scheduleMeasure(delay) {
      const ms = delay == null ? 32 : delay;
      if (this._measureTimers && this._measureTimers[ms]) {
        clearTimeout(this._measureTimers[ms]);
      }
      if (!this._measureTimers) this._measureTimers = {};
      this._measureTimers[ms] = setTimeout(() => this.measureStage(), ms);
    },

    /** 按舞台真实高度撑满，避免手算预留下大片空白 */
    measureStage() {
      this.createSelectorQuery()
        .select('.edit-photo__stage')
        .boundingClientRect((rect) => {
          if (!rect || !rect.height) return;
          const h = Math.floor(rect.height);
          if (h > 0 && h !== this.data.stageHeight) {
            this.setData({ stageHeight: h });
          }
        })
        .exec();
    },

    onAdd() {
      this.triggerEvent('add');
    },

    onDelete(e) {
      const id = e.detail && e.detail.id;
      if (!id) return;
      this.triggerEvent('delete', { id });
    },

    onChange(e) {
      this.triggerEvent('change', e.detail || {});
    },

    onPreview(e) {
      this.triggerEvent('preview', e.detail || {});
    },

    onReorder(e) {
      this.triggerEvent('reorder', e.detail || {});
    },
  },
});


