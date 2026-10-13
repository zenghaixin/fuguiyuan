/** 祝福板演示/种子数据（仅 mock，不含业务读写） */

/** 相对今天的某日固定时分秒 → 时间戳 */
function atDaysAgo(days, hour = 12, minute = 0, second = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, second, 0);
  return d.getTime();
}

/**
 * 演示数据：覆盖 今天 / 昨天 / 前天 / 本年 / 跨年
 * 正式接接口后由后端返回，此文件仅本地联调使用
 */
export function buildDefaultBlessings() {
  const thisYear = new Date().getFullYear();
  return [
    {
      id: 1,
      name: '王阿姨',
      initial: '王',
      tone: 'rose',
      createdAt: atDaysAgo(0, 10, 28, 15),
      content: '晨晨长大了也要结婚啦！祝福你们白头偕老，甜甜蜜蜜，早生贵子！',
    },
    {
      id: 2,
      name: '小学同学·阿杰',
      initial: '杰',
      tone: 'gold',
      createdAt: atDaysAgo(1, 21, 16, 0),
      content: '兄弟终于修成正果，新房我先订好位置了，红包准备好，人一定到！',
    },
    {
      id: 3,
      name: '婉儿闺蜜团',
      initial: '婉',
      tone: 'wine',
      createdAt: atDaysAgo(1, 19, 42, 30),
      content: '我们的小公主出嫁啦～愿你们岁岁年年，眼里都是彼此。婚礼见！',
    },
    {
      id: 4,
      name: '堂哥大强',
      initial: '强',
      tone: 'ink',
      createdAt: atDaysAgo(2, 22, 31, 8),
      content: '门当户对，天作之合。台上风光我们都帮衬着，好好过日子最要紧。',
    },
    {
      id: 5,
      name: '邻居张婶',
      initial: '婶',
      tone: 'peach',
      createdAt: new Date(thisYear, 2, 20, 12, 8, 0).getTime(),
      content: '大院里又办喜事，热闹！祝福小两口和和美美，家宅平安。',
    },
    {
      id: 6,
      name: '发小阿峰',
      initial: '峰',
      tone: 'rose',
      createdAt: `${thisYear - 1}:10:18 12:08:05`,
      content: '从光屁股玩到娶媳妇，不容易。幸福就好，酒我多喝两杯！',
    },
  ];
}
