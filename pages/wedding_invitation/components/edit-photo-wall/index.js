import { isMagazineLayout } from '~/services/invite-photo-local';

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
    /** 排版：carousel | column | grid4 | magazine* | … */
    layout: { type: String, value: 'carousel' },
    /** 网格裁剪调焦 */
    coverPan: { type: Boolean, value: false },
  },

  data: {
    stageHeight: 400,
    gridCols: 2,
    isGrid: false,
    isMagazine: false,
    subText: '添加你们的合影与瞬间',
  },

  observers: {
    'windowHeight, windowWidth, backTop, backSize, photos, layout': function () {
      this.scheduleMeasure();
    },
    'photos, layout': function (photos, layout) {
      const key = layout === 'grid' ? 'grid4' : layout || this.data.layout;
      const isGrid = key === 'grid4' || key === 'grid9';
      const isMagazine = isMagazineLayout(key);
      const n = (photos && photos.length) || 0;
      let subText = '添加你们的合影与瞬间';
      if (n > 0) {
        subText = isGrid || isMagazine
          ? `已添加 ${n} 张，可点空位继续添加`
          : `已添加 ${n} 张，可继续添加`;
      } else if (isGrid || isMagazine) {
        subText = '点击空位或下方按钮添加照片';
      }
      this.setData({
        isGrid,
        isMagazine,
        gridCols: key === 'grid9' ? 3 : 2,
        subText,
      });
    },
    layout: function () {
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

    onFramesEnsure(e) {
      this.triggerEvent('framesensure', e.detail || {});
    },

    onFrameChange(e) {
      this.triggerEvent('framechange', e.detail || {});
    },

    onCoverFocus(e) {
      this.triggerEvent('coverfocus', e.detail || {});
    },

    onSelect(e) {
      this.triggerEvent('select', e.detail || {});
    },

    /** 透传杂志布局的裁剪打开参数（含真实格子宽高比） */
    getCropPayload(photoId) {
      const mag = this.selectComponent('#magLayout');
      if (mag && typeof mag.getCropPayload === 'function') {
        return mag.getCropPayload(photoId);
      }
      return null;
    },

    /** 非网格排版：舞台可视区宽高比（裁剪框比例） */
    getViewportAspect() {
      const w = Math.max(1, Number(this.data.windowWidth) || 375);
      const h = Math.max(1, Number(this.data.stageHeight) || 400);
      return w / h;
    },
  },
});



