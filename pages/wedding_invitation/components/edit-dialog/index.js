Component({
  properties: {
    visible: { type: Boolean, value: false },
    /** prompt | confirm */
    mode: { type: String, value: 'prompt' },
    title: { type: String, value: '' },
    content: { type: String, value: '' },
    value: { type: String, value: '' },
    placeholder: { type: String, value: '请输入' },
    maxlength: { type: Number, value: 20 },
    cancelText: { type: String, value: '取消' },
    confirmText: { type: String, value: '确定' },
    danger: { type: Boolean, value: false },
    /** 是否显示取消按钮（提示类弹窗可关） */
    showCancel: { type: Boolean, value: true },
  },


  data: {
    innerValue: '',
  },

  observers: {
    'visible, value': function (visible, value) {
      if (visible) {
        this.setData({ innerValue: value || '' });
      }
    },
  },

  methods: {
    noop() {},

    onInput(e) {
      this.setData({ innerValue: (e.detail && e.detail.value) || '' });
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      this.triggerEvent('confirm', {
        value: (this.data.innerValue || '').trim(),
      });
    },
  },
});
