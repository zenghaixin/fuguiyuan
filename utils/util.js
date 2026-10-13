const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`;
};

/** 补零为两位 */
const pad2 = (n) => `${n}`.padStart(2, '0');

/**
 * 将 Date 格式化为 yyyy-MM-dd HH:mm:ss
 */
const toDateTimeString = (date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const s = pad2(date.getSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
};

/**
 * 解析输入为 Date
 * 支持：
 * - 10 位秒级 / 13 位毫秒级时间戳（数字或字符串）
 * - yyyy-MM-dd HH:mm:ss / yyyy/MM/dd HH:mm:ss / yyyy:MM:dd HH:mm:ss
 * - 仅日期 yyyy-MM-dd 等（时分秒按 00:00:00）
 */
const parseToDate = (input) => {
  if (input === null || input === undefined || input === '') return null;

  // 已是 Date
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  // 数字时间戳
  if (typeof input === 'number' && Number.isFinite(input)) {
    const ms = String(Math.trunc(input)).length === 10 ? input * 1000 : input;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // 纯数字时间戳字符串
  if (/^\d{10}$/.test(raw)) {
    const d = new Date(Number(raw) * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{13}$/.test(raw)) {
    const d = new Date(Number(raw));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // yyyy[sep]MM[sep]dd[ 或 T]HH:mm:ss 或仅日期
  // sep 支持 - / :
  const matched = raw.match(
    /^(\d{4})[-/:.](\d{1,2})[-/:.](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (matched) {
    const year = Number(matched[1]);
    const month = Number(matched[2]) - 1;
    const day = Number(matched[3]);
    const hour = Number(matched[4] || 0);
    const minute = Number(matched[5] || 0);
    const second = Number(matched[6] || 0);
    const d = new Date(year, month, day, hour, minute, second);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // 兜底：尝试原生解析（如 ISO）
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * 通用相对时间展示
 * @param {string|number|Date} input 时间戳或日期时间字符串
 * @returns {string}
 * - 今天 → 今天 HH:mm:ss
 * - 昨天 → 昨天 HH:mm:ss
 * - 前天 → 前天 HH:mm:ss
 * - 同年更早/更晚 → M月d日 HH:mm:ss
 * - 跨年 → yyyy年M月d日 HH:mm:ss
 * 解析失败返回空字符串
 */
const formatRelativeDateTime = (input) => {
  const date = parseToDate(input);
  if (!date) return '';

  const hms = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return `今天 ${hms}`;
  if (diffDays === 1) return `昨天 ${hms}`;
  if (diffDays === 2) return `前天 ${hms}`;

  if (year === now.getFullYear()) {
    return `${month}月${day}日 ${hms}`;
  }

  return `${year}年${month}月${day}日 ${hms}`;
};

// 复制到本地临时路径，方便预览
const getLocalUrl = (path, name) => {
  const fs = wx.getFileSystemManager();
  const tempFileName = `${wx.env.USER_DATA_PATH}/${name}`;
  fs.copyFileSync(path, tempFileName);
  return tempFileName;
};

module.exports = {
  formatTime,
  getLocalUrl,
  parseToDate,
  toDateTimeString,
  formatRelativeDateTime,
};
