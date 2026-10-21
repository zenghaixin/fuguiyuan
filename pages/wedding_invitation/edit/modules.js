/** 编辑入口模块列表（后续加祝福墙等在此扩展） */

/** 本帖内模块（总控列表用；入口仍经 invite-pages） */
export const EDIT_MODULES = [
  {
    key: 'invite',
    title: '喜帖',
    desc: '多页喜帖与修饰',
    optional: false,
    path: '/pages/wedding_invitation/edit/invite-sheet/index',
    icon: 'mail',
    tone: 'red',
  },
  {
    key: 'story-line',
    title: '故事线',
    desc: '章节卡片讲述故事，可选',
    optional: true,
    path: '/pages/wedding_invitation/edit/story-line/index',
    icon: 'heart',
    tone: 'rose',
  },
  {
    key: 'photo-wall',
    title: '照片墙',
    desc: '合影与瞬间，可不启用',
    optional: true,
    path: '/pages/wedding_invitation/edit/photo-wall/index',
    icon: 'image',
    tone: 'gold',
  },
];
