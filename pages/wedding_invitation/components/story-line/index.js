const {
  decorateElementsWithScrub,
  pageHasScrubText,
} = require('../../utils/story-scrub-bind');

const SNAP_RATIO = 0.12;
const SCRUB_PX_RATIO = 0.85;

Component({
  properties: {
    /** 故事块列表（图 / 文）；文案页可含 textAnim=scrubLine */
    blocks: { type: Array, value: [] },
    /** @deprecated 兼容旧调用，会被转成 blocks */
    chapters: { type: Array, value: [] },
    windowHeight: { type: Number, value: 667 },
    windowWidth: { type: Number, value: 375 },
    statusBarHeight: { type: Number, value: 20 },
    active: { type: Boolean, value: false },
    leftBehind: { type: Boolean, value: false },
    hasNextModule: { type: Boolean, value: false },
    startIndex: { type: Number, value: 0 },
  },

  data: {
    list: [],
    current: 0,
    translateY: 0,
    trackHeight: 667,
    animating: false,
    pageText: '',
    hintText: '上滑继续',
    hintBack: false,
    /** 故事线默认进度条：当前页 0~1 */
    scrubProgress: 0,
  },

  observers: {
    'blocks, chapters, startIndex, windowHeight': function (
      blocks,
      chapters,
      startIndex,
      windowHeight,
    ) {
      const raw =
        (blocks && blocks.length && blocks) ||
        (chapters && chapters.length && chapters) ||
        [];
      const h = windowHeight || 667;
      const max = Math.max(raw.length - 1, 0);
      let next = Number(startIndex);
      if (!Number.isFinite(next)) next = this.data.current || 0;
      next = Math.max(0, Math.min(max, next));

      if (!this._highWater || this._highWater.length !== raw.length) {
        const prev = this._highWater || [];
        this._highWater = raw.map((_, i) =>
          prev[i] != null ? prev[i] : 0,
        );
      }

      const scrubProgress = this._progressForIndex(next, raw);
      const list = this._decorateList(raw, next, scrubProgress);

      this.setData({
        list,
        current: next,
        translateY: -next * h,
        trackHeight: h * Math.max(raw.length, 1),
        pageText: raw.length ? `${next + 1} / ${raw.length}` : '',
        animating: false,
        scrubProgress,
      });
      this.syncHint(next, raw.length, scrubProgress);
    },
    'leftBehind, hasNextModule, current': function () {
      this.syncHint(
        this.data.current,
        (this.data.list || []).length,
        this.data.scrubProgress,
      );
    },
  },

  methods: {
    _rawList() {
      const { blocks, chapters } = this.properties;
      return (
        (blocks && blocks.length && blocks) ||
        (chapters && chapters.length && chapters) ||
        []
      );
    },

    _progressForIndex(index, raw) {
      const list = raw || this._rawList();
      const block = list[index];
      if (!pageHasScrubText(block)) return 1;
      return Math.max(0, Math.min(1, (this._highWater && this._highWater[index]) || 0));
    },

    _decorateList(raw, current, progress) {
      return (raw || []).map((block, index) => {
        if (!block || block.type === 'photo') return block;
        const p =
          index === current ? progress : this._progressForIndex(index, raw);
        return {
          ...block,
          elements: decorateElementsWithScrub(block.elements, p),
        };
      });
    },

    _commitScrub(progress) {
      const current = this.data.current;
      const raw = this._rawList();
      let next = Math.max(0, Math.min(1, progress));
      if (!pageHasScrubText(raw[current])) {
        next = 1;
      } else {
        if (!this._highWater) this._highWater = [];
        const hw = this._highWater[current] || 0;
        // 未看完：只升不降；已看完锁 1
        if (hw >= 0.995) {
          next = 1;
        } else if (next < hw) {
          next = hw;
        }
        if (next > hw) this._highWater[current] = next;
        if (next >= 0.995) {
          next = 1;
          this._highWater[current] = 1;
        }
      }
      const list = this._decorateList(raw, current, next);
      this.setData({ scrubProgress: next, list });
      this.syncHint(current, raw.length, next);
      return next;
    },

    syncHint(current, total, scrubProgress) {
      let hintText = '';
      let hintBack = false;
      const raw = this._rawList();
      const hasScrub = pageHasScrubText(raw[current]);
      const p = scrubProgress != null ? scrubProgress : this.data.scrubProgress;

      if (this.data.leftBehind) {
        hintText = '下滑返回';
        hintBack = true;
      } else if (hasScrub && p < 0.995) {
        hintText = '上滑出字';
      } else if (total > 1 && current < total - 1) {
        hintText = '上滑继续';
      } else if (this.data.hasNextModule) {
        hintText = '上滑继续';
      } else {
        hintText = '';
      }
      if (
        hintText !== this.data.hintText ||
        hintBack !== this.data.hintBack
      ) {
        this.setData({ hintText, hintBack });
      }
    },

    setBlock(index) {
      const h = this.data.windowHeight || 667;
      const raw = this._rawList();
      const max = Math.max(raw.length - 1, 0);
      const next = Math.max(0, Math.min(max, index));
      const scrubProgress = this._progressForIndex(next, raw);
      const list = this._decorateList(raw, next, scrubProgress);
      this.setData({
        current: next,
        list,
        translateY: -next * h,
        animating: true,
        pageText: raw.length ? `${next + 1} / ${raw.length}` : '',
        scrubProgress,
      });
      this.syncHint(next, raw.length, scrubProgress);
    },

    emitModuleDrag(phase, dy) {
      this.triggerEvent('moduledrag', { phase, dy });
    },

    onTouchStart(e) {
      if (!this.data.active) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      this._touching = true;
      this._dragging = false;
      this._moduleDragging = false;
      this._mode = ''; // scrub | page | module
      this._startY = t.clientY;
      this._baseY = -this.data.current * (this.data.windowHeight || 667);
      this._baseScrub = this.data.scrubProgress || 0;
      this._lastDy = 0;
      this.setData({ animating: false });
    },

    onTouchMove(e) {
      if (!this._touching || !this.data.active) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dy = t.clientY - this._startY;
      this._lastDy = dy;
      if (!this._dragging && Math.abs(dy) < 8) return;
      this._dragging = true;

      const h = this.data.windowHeight || 667;
      const scrubPx = Math.max(320, h * SCRUB_PX_RATIO);
      const max = Math.max((this.data.list || []).length - 1, 0);
      const current = this.data.current;
      const minY = -max * h;
      const raw = this._rawList();
      const hasScrub = pageHasScrubText(raw[current]);
      const scrubDone =
        !hasScrub || (this._highWater && this._highWater[current] >= 0.995);

      // —— 1) 本页滑动出字未完成：手势只改进度 ——
      if (hasScrub && !scrubDone) {
        this._mode = 'scrub';
        const up = -dy;
        const next = Math.max(0, Math.min(1, this._baseScrub + up / scrubPx));
        this._commitScrub(next);
        this.setData({ translateY: -current * h });
        return;
      }

      // —— 2) 边界交给外层模块 ——
      const atLastUp = current >= max && dy < 0;
      const atFirstDown = current <= 0 && dy > 0;
      if (atLastUp || atFirstDown) {
        if (atLastUp && !this.data.hasNextModule) {
          this._mode = 'page';
          this.setData({ translateY: minY + dy * 0.35 });
          return;
        }
        this._mode = 'module';
        this.setData({ translateY: current >= max ? minY : 0 });
        if (!this._moduleDragging) {
          this._moduleDragging = true;
          this.emitModuleDrag('start', 0);
        }
        this.emitModuleDrag('move', dy);
        return;
      }

      if (this._moduleDragging) {
        this._moduleDragging = false;
        this.emitModuleDrag('cancel', 0);
      }

      // —— 3) 翻页跟手 ——
      this._mode = 'page';
      let next = this._baseY + dy;
      if (next > 0) next *= 0.35;
      if (next < minY) next = minY + (next - minY) * 0.35;
      this.setData({ translateY: next });
    },

    onTouchEnd() {
      if (!this._touching || !this.data.active) return;
      const wasDragging = this._dragging;
      const mode = this._mode;
      const lastDy = this._lastDy;
      this._touching = false;
      this._dragging = false;
      this._moduleDragging = false;
      this._mode = '';
      this._lastDy = 0;

      if (!wasDragging) return;

      if (mode === 'module') {
        this.setBlock(this.data.current);
        this.emitModuleDrag('end', lastDy);
        return;
      }

      if (mode === 'scrub') {
        const p = this.data.scrubProgress || 0;
        if (p > 0.9) this._commitScrub(1);
        else this._commitScrub(p);
        this.setData({
          translateY: -this.data.current * (this.data.windowHeight || 667),
          animating: true,
        });
        return;
      }

      const h = this.data.windowHeight || 667;
      const threshold = h * SNAP_RATIO;
      const delta = this.data.translateY - this._baseY;
      const max = Math.max((this.data.list || []).length - 1, 0);
      let current = this.data.current;

      if (delta < -threshold && current < max) current += 1;
      else if (delta > threshold && current > 0) current -= 1;

      this.setBlock(current);
    },
  },
});
