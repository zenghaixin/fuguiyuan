/**
 * 故事线动效 Demo
 * 上滑：图片钉住 → 文字随滑动浮现 → 字出完再进下一趴
 * 已看过的趴：文字保持满显；上下滑只用来切趴，可下滑回上一趴
 */

import { previewPhotos } from '../../utils/preview-photos';

const CHAPTERS = [
  {
    id: 'c1',
    src: '/static/image/cat/1.jpg',
    lines: [
      '2019 年 3 月',
      '南京 · 老门东',
      '那天下着小雨',
      '你撑着一把透明的伞',
      '我迟到了整整十二分钟',
      '却刚好遇见你',
      '从那天起',
      '咖啡的味道里都有了你',
    ],
  },
  {
    id: 'c2',
    src: '/static/image/cat/2.jpg',
    lines: [
      '2021 年夏天',
      '我们去看了一次海',
      '风很大，浪一层层拍过来',
      '你说想把日子过成这样',
      '慢一点，亮一点',
      '傍晚的时候',
      '我把戒指放进你的掌心',
      '说：剩下的路，一起走',
    ],
  },
  {
    id: 'c3',
    src: '/static/image/cat/3.jpg',
    lines: [
      '今天',
      '请你来见证',
      '那些琐碎又珍贵的日子',
      '终于写成了这一页',
      '有欢喜，有等待',
      '也有说不完的谢谢',
      '故事还在继续',
      '下一章，有你',
    ],
  },
];

const SCRUB_PX = 560;
const ADVANCE_PX = 100;
/**
 * 同一条进度条上的里程碑：
 * 0%～10%  慢慢压暗
 * 10%～90% 文字逐行浮现
 * ≥90%     本趴字出完（可切下一趴）
 */
const P_VEIL = 0.1;
const P_TEXT_END = 0.9;
/** 压暗峰值（略亮一点，别把图压死） */
const VEIL_MAX = 0.58;

/**
 * 滑到阈值就整行亮起（只有显/隐），不再半透跟手磨
 * textProgress：压暗段之后映射到的 0~1
 */
function buildLineStates(lines, textProgress) {
  const list = lines || [];
  const n = list.length || 1;
  const p = Math.max(0, Math.min(1, textProgress || 0));
  return list.map((text, i) => {
    const threshold = i / n;
    const on = p >= threshold && (i > 0 || p > 0.001);
    return { text, on: !!on };
  });
}

/** 0→10%：压暗 0→VEIL_MAX；之后保持 */
function veilFromProgress(progress) {
  const p = Math.max(0, Math.min(1, progress || 0));
  if (p <= 0) return 0;
  if (p >= P_VEIL) return VEIL_MAX;
  return Math.round((p / P_VEIL) * VEIL_MAX * 1000) / 1000;
}

/** 10%→90%：文字 0→1；90% 后字已全部出完 */
function textProgressFrom(progress) {
  const p = Math.max(0, Math.min(1, progress || 0));
  if (p <= P_VEIL) return 0;
  if (p >= P_TEXT_END) return 1;
  return (p - P_VEIL) / (P_TEXT_END - P_VEIL);
}

function isFull(hw) {
  return (hw || 0) >= 0.995;
}

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    backTop: 48,
    backSize: 32,
    chapters: CHAPTERS,
    chapterIndex: 0,
    progress: 0,
    /** 压暗强度 0~1，跟 progress 走，一开始为 0 */
    veilOpacity: 0,
    lineStates: buildLineStates(CHAPTERS[0].lines, 0),
    atEnd: false,
  },

  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = info.statusBarHeight || 20;
    const h = info.windowHeight || 667;
    this.setData({
      statusBarHeight,
      windowHeight: h,
      backTop: menu.top || statusBarHeight + 6,
      backSize: menu.height || 32,
      lineStates: buildLineStates(CHAPTERS[0].lines, 0),
    });
    // 行数多时拉长拖动距离，避免几行挤在一次短滑里
    this._scrubPx = Math.max(640, Math.round(h * 0.95));
    this._stepPx = Math.max(ADVANCE_PX, Math.round(h * 0.14));
    this._highWater = CHAPTERS.map(() => 0);
    this._raf = 0;
    this._pending = null;
  },

  onUnload() {
    if (this._raf) {
      clearTimeout(this._raf);
      this._raf = 0;
    }
  },

  onBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  onTouchStart(e) {
    const t = e.touches && e.touches[0];
    if (!t) return;
    this._touching = true;
    this._chapterLatch = false;
    this._startY = t.clientY;
    this._baseProgress = this.data.progress;
    this._baseChapter = this.data.chapterIndex;
    this._baseFull = isFull(this._highWater[this._baseChapter]);
  },

  onTouchMove(e) {
    if (!this._touching || this._chapterLatch) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    this._queueApply(this._startY - t.clientY);
  },

  onTouchEnd() {
    if (!this._touching) return;
    this._touching = false;
    if (!this._chapterLatch && this._pending != null) {
      this._applyDrag(this._pending);
      this._pending = null;
    } else {
      this._pending = null;
    }
    this._snapSoft();
    this._chapterLatch = false;
  },

  _queueApply(dy) {
    if (this._chapterLatch) {
      this._pending = null;
      return;
    }
    this._pending = dy;
    if (this._raf) return;
    this._raf = setTimeout(() => {
      this._raf = 0;
      if (this._pending == null || this._chapterLatch) return;
      const dy = this._pending;
      this._pending = null;
      this._applyDrag(dy);
    }, 16);
  },

  /** 本手势已切过趴：锁住，余量不带进下一趴 */
  _latchChapter(chapter, progress) {
    this._chapterLatch = true;
    this._pending = null;
    this._commit(chapter, progress);
  },

  _commit(chapter, progress) {
    const n = CHAPTERS.length;
    chapter = Math.max(0, Math.min(n - 1, chapter));
    progress = Math.max(0, Math.min(1, progress));

    const hw = this._highWater[chapter] || 0;
    // 未看完：进度只升不降；已看完：始终满显
    let next = progress;
    if (isFull(hw)) {
      next = 1;
    } else if (next < hw) {
      next = hw;
    }
    if (next > hw) this._highWater[chapter] = next;
    if (next >= 0.995) this._highWater[chapter] = 1;

    const seenFull = isFull(this._highWater[chapter]);
    const atEnd = chapter >= n - 1 && seenFull;
    const veilOpacity = veilFromProgress(next);
    const textProgress = textProgressFrom(next);

    this.setData({
      chapterIndex: chapter,
      progress: next,
      veilOpacity,
      lineStates: buildLineStates(CHAPTERS[chapter].lines, textProgress),
      atEnd,
    });
  },

  /** 自定义 photo-viewer：只看当前趴这一张，不左右切图 */
  onPreviewPhoto() {
    const ch = CHAPTERS[this.data.chapterIndex] || CHAPTERS[0];
    if (!ch || !ch.src) return;
    previewPhotos([{ id: ch.id, src: ch.src }], 0, {
      showIndex: false,
      swipeable: false,
      fail: () => {
        wx.showToast({ title: '无法打开预览', icon: 'none' });
      },
    });
  },

  /**
   * dy > 0 上滑
   * - 未看完：拖动浮现文字；字满后再拖切下一趴
   * - 已看完：上下滑只切趴（可下滑回上一趴），文字保持满显
   * - 单次手势最多切 1 趴；切过去后锁定，余量不继承到新趴文字
   */
  _applyDrag(dy) {
    if (this._chapterLatch) return;

    const scrub = this._scrubPx || SCRUB_PX;
    const step = this._stepPx || ADVANCE_PX;
    const n = CHAPTERS.length;
    const base = this._baseChapter;
    const gap = step / scrub;

    if (this._baseFull) {
      // —— 已看完：按步长切趴（一次最多 ±1） ——
      if (dy >= 0) {
        if (dy < step * 0.55 || base >= n - 1) {
          this._commit(base, 1);
          return;
        }
        const next = base + 1;
        // 新趴从 0 起，不带滑动余量；已看过则满显
        this._latchChapter(next, isFull(this._highWater[next]) ? 1 : 0);
        return;
      }

      if (-dy < step * 0.55 || base <= 0) {
        this._commit(base, 1);
        return;
      }
      const prev = base - 1;
      const prevHw = this._highWater[prev] || 0;
      this._latchChapter(prev, isFull(prevHw) ? 1 : prevHw);
      return;
    }

    // —— 未看完：跟手浮现 ——
    let progress = this._baseProgress + dy / scrub;

    // 上滑出头：字满后切入下一趴，进度清零（不继承余量）
    if (progress > 1) {
      this._highWater[base] = 1;
      if (base >= n - 1) {
        this._commit(base, 1);
        return;
      }
      const over = progress - 1;
      if (over < gap * 0.35) {
        this._commit(base, 1);
        return;
      }
      const next = base + 1;
      this._latchChapter(next, isFull(this._highWater[next]) ? 1 : 0);
      return;
    }

    if (progress < 0) {
      if (base <= 0) {
        this._commit(0, 0);
        return;
      }
      const prev = base - 1;
      this._latchChapter(prev, isFull(this._highWater[prev]) ? 1 : this._highWater[prev] || 0);
      return;
    }

    this._commit(base, progress);
  },

  _snapSoft() {
    const chapter = this.data.chapterIndex;
    const hw = this._highWater[chapter] || 0;
    let p = this.data.progress;
    if (isFull(hw) || p > 0.9) {
      p = 1;
      this._highWater[chapter] = 1;
    } else if (p < 0.06 && hw < 0.06) {
      p = 0;
    } else {
      p = Math.max(p, hw);
    }
    this._commit(chapter, p);
  },

  noop() {},
});
