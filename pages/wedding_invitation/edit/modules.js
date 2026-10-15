/** 编辑入口模块列表（后续加祝福墙等在此扩展） */

export const EDIT_MODULES = [
  {
    key: 'invite',
    title: '喜帖',
    desc: '多页喜帖与修饰',
    optional: false,
    path: '/pages/wedding_invitation/edit/invite-works/index',
    icon: 'mail',
    tone: 'red',
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
