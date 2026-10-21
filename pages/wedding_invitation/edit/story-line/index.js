import { STORY_TOOLS } from '../toolbox';
import { BG_ASSETS } from '../bg-assets';
import {
  loadInviteDraft,
  saveInviteDraft,
  TEMP_INVITE_ID,
} from '~/services/invite-draft';
import { chooseAndPersistPhotos } from '~/services/invite-photo-local';
import { DESIGN_ASPECT } from '~/services/invite-canvas';
import { navigateBackToRoute, PAGES_ROUTE } from '../nav-route';
import {
  createChapter,
  normalizeStoryLine,
  STORY_MAX_CHAPTERS,
  STORY_LAYOUTS,
  layoutHasPhoto,
  layoutHasText,
  layoutNeedsBg,
} from '../../utils/story-line';

const PAGES_URL = '/pages/wedding_invitation/edit/invite-pages/index';

Page({
  data: {
    statusBarHeight: 20,
    windowHeight: 667,
    windowWidth: 375,
    backTop: 48,
    backSize: 32,
    inviteId: TEMP_INVITE_ID,
    workTitle: '未命名喜帖',
    chapters: [],
    current: 0,
    currentChapter: null,
    stageHeight: 400,
    toolboxTools: STORY_TOOLS,
    toolboxActive: '',
    layoutVisible: false,
    layoutOptions: STORY_LAYOUTS,
    textVisible: false,
    textDraft: { title: '', date: '', body: '' },
    bgVisible: false,
    bgAssets: BG_ASSETS,
    sortVisible: false,
    sortDraft: [],
    alertDialog: {
      visible: false,
      title: '',
      content: '',
      confirmText: '知道了',
    },
  },

  onLoad(query) {
    const info = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    const inviteId = (query && query.id) || TEMP_INVITE_ID;
    const statusBarHeight = info.statusBarHeight || 20;
    const windowHeight = info.windowHeight || 667;
    const windowWidth = info.windowWidth || 375;
    const backTop = menu.top || statusBarHeight + 6;
    const backSize = menu.height || 32;
    const head = backTop + backSize + 52;
    const foot = 120;
    this.setData({
      statusBarHeight,
      windowHeight,
      windowWidth,
      backTop,
      backSize,
      inviteId,
      stageHeight: Math.max(280, windowHeight - head - foot),
    });
  },

  onShow() {
    this.reload();
  },

  reload() {
    const draft = loadInviteDraft(this.data.inviteId);
    const story = normalizeStoryLine(draft && draft.storyLine);
    const chapters = story.chapters || [];
    let current = this.data.current || 0;
    if (current >= chapters.length) current = Math.max(0, chapters.length - 1);
    this.setData({
      workTitle: (draft && draft.title) || '未命名喜帖',
      chapters,
      current,
      currentChapter: chapters[current] || null,
      toolboxTools: this.buildTools(chapters[current]),
    });
  },

  buildTools(chapter) {
    if (!chapter) {
      return STORY_TOOLS.filter((t) => t.key === 'add' || t.key === 'preview');
    }
    const layout = chapter.layout || 'photoText';
    return STORY_TOOLS.filter((t) => {
      if (t.key === 'photo') return layoutHasPhoto(layout);
      if (t.key === 'text') return layoutHasText(layout);
      if (t.key === 'background') return layoutNeedsBg(layout);
      return true;
    });
  },

  persist(chapters, current) {
    const draft = loadInviteDraft(this.data.inviteId) || {};
    const storyLine = {
      style: 'chapters',
      chapters: chapters || [],
    };
    return saveInviteDraft({
      ...draft,
      inviteId: this.data.inviteId,
      title: this.data.workTitle,
      pages: draft.pages || [],
      photoWall: draft.photoWall || [],
      photoWallLayout: draft.photoWallLayout || 'carousel',
      storyLine,
      designAspect: DESIGN_ASPECT,
      meta: { ...(draft.meta || {}), source: 'edit/story-line' },
    }).then(() => {
      const cur = Math.max(
        0,
        Math.min((chapters || []).length - 1, current != null ? current : 0)
      );
      this.setData({
        chapters,
        current: cur,
        currentChapter: chapters[cur] || null,
        toolboxTools: this.buildTools(chapters[cur]),
      });
    });
  },

  onBack() {
    navigateBackToRoute(
      PAGES_ROUTE,
      `${PAGES_URL}?id=${encodeURIComponent(this.data.inviteId)}`
    );
  },

  onSwiperChange(e) {
    const current = Number(e.detail && e.detail.current) || 0;
    const ch = (this.data.chapters || [])[current] || null;
    this.setData({
      current,
      currentChapter: ch,
      toolboxTools: this.buildTools(ch),
      toolboxActive: '',
    });
  },

  onToolboxSelect(e) {
    const key = e.detail && e.detail.key;
    if (!key) return;
    this.setData({ toolboxActive: key });
    if (key === 'add') {
      this.onAddChapter();
      return;
    }
    if (key === 'layout') {
      if (!this.data.currentChapter) return;
      this.setData({ layoutVisible: true });
      return;
    }
    if (key === 'sort') {
      this.openSort();
      return;
    }
    if (key === 'photo') {
      this.onPickPhoto();
      return;
    }
    if (key === 'text') {
      this.openTextSheet();
      return;
    }
    if (key === 'background') {
      this.setData({ bgVisible: true });
      return;
    }
    if (key === 'delete') {
      this.onDeleteChapter();
      return;
    }
    if (key === 'preview') {
      this.onPreview();
      return;
    }
  },

  onAddChapter() {
    const list = (this.data.chapters || []).slice();
    if (list.length >= STORY_MAX_CHAPTERS) {
      this.setData({
        alertDialog: {
          visible: true,
          title: '章节已满',
          content: `最多 ${STORY_MAX_CHAPTERS} 章`,
          confirmText: '知道了',
        },
        toolboxActive: '',
      });
      return;
    }
    list.push(
      createChapter({
        title: `第 ${list.length + 1} 章`,
        body: '写下这一段故事…',
      })
    );
    const current = list.length - 1;
    this.persist(list, current).then(() => {
      this.setData({ toolboxActive: '' });
    });
  },

  onDeleteChapter() {
    const list = (this.data.chapters || []).slice();
    const idx = this.data.current || 0;
    if (!list[idx]) {
      this.setData({ toolboxActive: '' });
      return;
    }
    list.splice(idx, 1);
    const next = Math.max(0, Math.min(list.length - 1, idx));
    this.persist(list, next).then(() => {
      this.setData({ toolboxActive: '' });
    });
  },

  closeLayoutSheet() {
    this.setData({ layoutVisible: false, toolboxActive: '' });
  },

  onPickLayout(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    const list = (this.data.chapters || []).slice();
    const idx = this.data.current || 0;
    if (!list[idx]) return;
    list[idx] = { ...list[idx], layout: key };
    this.persist(list, idx).then(() => {
      this.setData({ layoutVisible: false, toolboxActive: '' });
    });
  },

  openTextSheet() {
    const ch = this.data.currentChapter;
    if (!ch) return;
    this.setData({
      textVisible: true,
      textDraft: {
        title: ch.title || '',
        date: ch.date || '',
        body: ch.body || '',
      },
    });
  },

  closeTextSheet() {
    this.setData({ textVisible: false, toolboxActive: '' });
  },

  onTextInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({
      [`textDraft.${field}`]: e.detail.value,
    });
  },

  confirmTextSheet() {
    const list = (this.data.chapters || []).slice();
    const idx = this.data.current || 0;
    if (!list[idx]) return;
    const d = this.data.textDraft || {};
    list[idx] = {
      ...list[idx],
      title: String(d.title || '').trim() || '未命名',
      date: String(d.date || '').trim(),
      body: String(d.body || '').trim(),
    };
    this.persist(list, idx).then(() => {
      this.setData({ textVisible: false, toolboxActive: '' });
    });
  },

  closeBgSheet() {
    this.setData({ bgVisible: false, toolboxActive: '' });
  },

  onBgSelect(e) {
    const color = e.currentTarget.dataset.color;
    if (!color) return;
    const list = (this.data.chapters || []).slice();
    const idx = this.data.current || 0;
    if (!list[idx]) return;
    list[idx] = { ...list[idx], bgColor: color, bgSrc: '' };
    this.persist(list, idx).then(() => {
      this.setData({ bgVisible: false, toolboxActive: '' });
    });
  },

  onPickPhoto() {
    const list = (this.data.chapters || []).slice();
    const idx = this.data.current || 0;
    if (!list[idx] || !layoutHasPhoto(list[idx].layout)) {
      this.setData({ toolboxActive: '' });
      return;
    }
    chooseAndPersistPhotos({ count: 1 })
      .then((photos) => {
        const p = photos && photos[0];
        if (!p || !p.src) return;
        list[idx] = {
          ...list[idx],
          photo: { id: p.id || '', src: p.src },
        };
        return this.persist(list, idx);
      })
      .catch(() => {})
      .then(() => {
        this.setData({ toolboxActive: '' });
      });
  },

  openSort() {
    const list = (this.data.chapters || []).slice();
    if (list.length < 2) {
      wx.showToast({ title: '至少两章才能排序', icon: 'none' });
      this.setData({ toolboxActive: '' });
      return;
    }
    this.setData({
      sortVisible: true,
      sortDraft: list.map((c) => ({ ...c })),
    });
  },

  closeSortSheet() {
    this.setData({ sortVisible: false, toolboxActive: '' });
  },

  onSortMoveUp(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!(index > 0)) return;
    const draft = (this.data.sortDraft || []).slice();
    const t = draft[index - 1];
    draft[index - 1] = draft[index];
    draft[index] = t;
    this.setData({ sortDraft: draft });
  },

  onSortMoveDown(e) {
    const index = Number(e.currentTarget.dataset.index);
    const draft = (this.data.sortDraft || []).slice();
    if (index < 0 || index >= draft.length - 1) return;
    const t = draft[index + 1];
    draft[index + 1] = draft[index];
    draft[index] = t;
    this.setData({ sortDraft: draft });
  },

  confirmSortSheet() {
    const draft = this.data.sortDraft || [];
    this.persist(draft, 0).then(() => {
      this.setData({ sortVisible: false, toolboxActive: '' });
    });
  },

  onPreview() {
    const list = this.data.chapters || [];
    if (!list.length) {
      wx.showToast({ title: '请先添加章节', icon: 'none' });
      this.setData({ toolboxActive: '' });
      return;
    }
    this.persist(list, this.data.current).then(() => {
      this.setData({ toolboxActive: '' });
      wx.navigateTo({
        url: `/pages/wedding_invitation/view/index?mode=draft&id=${this.data.inviteId}&module=story`,
      });
    });
  },

  onAlertClose() {
    this.setData({ 'alertDialog.visible': false });
  },

  noop() {},
});
