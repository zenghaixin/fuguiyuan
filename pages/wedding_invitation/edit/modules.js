/** 编辑入口模块列表（后续加祝福墙等在此扩展） */

export const EDIT_MODULES = [
  {
    key: 'invite',
    title: '喜帖',
    desc: '封面、内页与修饰文案',
    optional: false,
    path: '/pages/wedding_invitation/edit/invite/index',
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
