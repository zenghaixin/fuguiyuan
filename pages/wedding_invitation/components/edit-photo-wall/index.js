Component({
  properties: {
    photos: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    statusBarHeight: { type: Number, value: 20 },
  },

  methods: {
    onAdd() {
      this.triggerEvent('add');
    },
  },
});
