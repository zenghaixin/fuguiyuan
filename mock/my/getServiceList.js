export default {
  path: '/api/getServiceList',
  data: {
    code: 200,
    message: 'success',
    data: {
      service: [
        { image: '', name: '微信', type: 'weixin', url: '' },
        { image: '', name: 'QQ', type: 'QQ', url: '' },
        { image: '', name: '腾讯文档', type: 'document', url: '' },
        { image: '', name: '腾讯地图', type: 'map', url: '' },
        { image: '', name: '数据中心', type: 'data', url: '/pages/dataCenter/index' },
        { image: '', name: '数据中心', type: 'data', url: '/pages/dataCenter/index' },
        { image: '', name: '数据中心', type: 'data', url: '/pages/dataCenter/index' },
        { image: '', name: '数据中心', type: 'data', url: '/pages/dataCenter/index' },
      ],
    },
  },
};
