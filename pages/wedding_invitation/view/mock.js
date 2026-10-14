/** 喜帖浏览页本地示意数据（跟页走） */

/** 封面请柬页列表（可变长，不限定 3 张） */
export const invitePages = [
  {
    id: 'p1',
    src: '/static/invite/cn-red-01/page1-cover.jpg',
    hint: '上滑继续阅读请柬',
    backHint: '下滑返回',
  },
  {
    id: 'p2',
    src: '/static/invite/cn-red-01/page2-info.jpg',
    hint: '上滑查看婚宴信息',
    backHint: '下滑返回',
  },
  {
    id: 'p3',
    src: '/static/invite/cn-red-01/page3-invite.jpg',
    hint: '上滑查看我们的照片',
    backHint: '下滑返回',
  },
];

/** 照片墙：用户上传示意，当前用 static/image/cat（已压缩 jpg） */
export const photoWall = [
  {
    id: 1,
    src: '/static/image/cat/1.jpg',
    caption: '我们的照片 1',
  },
  {
    id: 2,
    src: '/static/image/cat/2.jpg',
    caption: '我们的照片 2',
  },
  {
    id: 3,
    src: '/static/image/cat/3.jpg',
    caption: '我们的照片 3',
  },
  {
    id: 4,
    src: '/static/image/cat/4.jpg',
    caption: '我们的照片 4',
  },
];

/** 婚礼现场花絮（与祝福板同屏 Tab） */
export const stagePhotos = [
  {
    id: 1,
    title: '迎宾门楼',
    desc: '红绸花结 · 喜字高悬',
    tone: 'a',
    tall: true,
  },
  {
    id: 2,
    title: '主舞台全景',
    desc: '灯光矩阵调试完成',
    tone: 'b',
    tall: false,
  },
  {
    id: 3,
    title: '签到桌花艺',
    desc: '香槟玫瑰搭配麦穗',
    tone: 'c',
    tall: false,
  },
  {
    id: 4,
    title: '夜晚灯光秀',
    desc: '收工后实拍 15 秒秀',
    tone: 'd',
    tall: true,
    hasVideo: true,
  },
  {
    id: 5,
    title: '仪式区过道',
    desc: '地毯与两侧花柱',
    tone: 'e',
    tall: false,
  },
  {
    id: 6,
    title: '喜宴席面',
    desc: '桌花与席位卡',
    tone: 'f',
    tall: false,
  },
];
