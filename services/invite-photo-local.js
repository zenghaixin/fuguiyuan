/**
 * 照片墙本地图：无服务器时写入用户目录，路径存进草稿 photoWall[].src
 * 临时路径 chooseMedia 会失效，必须 copy 到 USER_DATA_PATH
 */

export const MAX_PHOTO_WALL = 20;
export const DEFAULT_PHOTO_LAYOUT = 'carousel';
/** 四宫格 / 九宫格最多张数 */
export const GRID4_MAX = 4;
export const GRID9_MAX = 9;
/** 杂志主图：正方形网格半格吸附，最多 7 张（与 magazine-layout 一致） */
export const MAGAZINE_MAX = 7;
/** 杂志拼贴风格（可拖格） */
export const MAGAZINE_LAYOUT_KEYS = [
  'magazine',
  'magazineTop',
  'magazineSplit',
  'magazineFocus',
];

/** 旧版 grid → 四宫格；已下线的书页翻页 → 左右滑动 */
export function normalizePhotoLayout(layout) {
  if (layout === 'grid') return 'grid4';
  if (layout === 'book') return 'carousel';
  return layout || DEFAULT_PHOTO_LAYOUT;
}

export function isGridLayout(layout) {
  const key = normalizePhotoLayout(layout);
  return key === 'grid4' || key === 'grid9';
}

export function isMagazineLayout(layout) {
  const key = normalizePhotoLayout(layout);
  return MAGAZINE_LAYOUT_KEYS.indexOf(key) >= 0;
}

/** 排序 / 宫格列数 */
export function layoutSortCols(layout) {
  const key = normalizePhotoLayout(layout);
  if (key === 'grid4') return 2;
  if (isMagazineLayout(key)) return 3;
  return 3;
}

/** 宫格 / 杂志排版张数上限；非此类返回 0 */
export function layoutGridMax(layout) {
  const key = normalizePhotoLayout(layout);
  if (key === 'grid4') return GRID4_MAX;
  if (key === 'grid9') return GRID9_MAX;
  if (isMagazineLayout(key)) return MAGAZINE_MAX;
  return 0;
}

/** 排版中文名（风格名；切换超量提示用） */
export function layoutDisplayName(layout) {
  const key = normalizePhotoLayout(layout);
  if (key === 'grid4') return '四宫格';
  if (key === 'grid9') return '九宫格';
  if (key === 'magazine') return '经典拼贴';
  if (key === 'magazineTop') return '顶栏主图';
  if (key === 'magazineSplit') return '左右对开';
  if (key === 'magazineFocus') return '底栏主图';
  if (key === 'stack') return '叠放翻看';
  if (key === 'column') return '上下浏览';
  if (key === 'fade') return '淡入淡出';
  if (key === 'thumbs') return '缩略导览';
  return '左右滑动';
}

/** 排版族：browse 翻页 | grid 网格 | stack 叠放 */
export function layoutFamilyOf(layout) {
  const key = normalizePhotoLayout(layout);
  if (key === 'grid4' || key === 'grid9' || isMagazineLayout(key)) return 'grid';
  if (key === 'stack') return 'stack';
  return 'browse';
}

export function layoutFamilyDisplayName(layout) {
  const family = layoutFamilyOf(layout);
  if (family === 'grid') return '网格';
  if (family === 'stack') return '叠放';
  return '翻页';
}




function uid() {
  return `photo_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function ensurePhotoDir() {
  const dir = `${wx.env.USER_DATA_PATH}/invite_photos`;
  const fs = wx.getFileSystemManager();
  try {
    fs.accessSync(dir);
  } catch (e) {
    try {
      fs.mkdirSync(dir, true);
    } catch (err) {
      console.warn('[invite-photo] mkdir failed', err);
    }
  }
  return dir;
}

function extOf(path) {
  const m = String(path || '').match(/\.(jpe?g|png|gif|webp)$/i);
  return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

/** 把临时文件落到本地用户目录，返回可长期使用的路径 */
export function persistLocalImage(tempFilePath) {
  if (!tempFilePath) return Promise.reject(new Error('empty path'));
  const dir = ensurePhotoDir();
  const id = uid();
  const dest = `${dir}/${id}${extOf(tempFilePath)}`;
  const fs = wx.getFileSystemManager();
  return new Promise((resolve, reject) => {
    const done = (savedPath) => {
      try {
        fs.accessSync(savedPath);
        resolve({ id, src: savedPath, caption: '' });
      } catch (e) {
        reject(new Error('persist verify failed'));
      }
    };
    fs.copyFile({
      srcPath: tempFilePath,
      destPath: dest,
      success: () => done(dest),
      fail: () => {
        // 部分基础库 copyFile 异常时退回 saveFile
        fs.saveFile({
          tempFilePath,
          success: (res) => done(res.savedFilePath),
          fail: reject,
        });
      },
    });
  });
}

/** 本地用户目录文件是否还在（草稿只存路径，清缓存后文件会丢） */
export function localImageExists(src) {
  if (!src) return false;
  const path = String(src);
  // 网络图先视为可用；本地路径做 access
  if (/^https?:\/\//i.test(path) && path.indexOf('http://usr/') !== 0) {
    return true;
  }
  const fs = wx.getFileSystemManager();
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    // DevTools 里有时是 http://usr/…，与 USER_DATA_PATH 等价
    if (path.indexOf('http://usr/') === 0) {
      const mapped = `${wx.env.USER_DATA_PATH}${path.slice('http://usr'.length)}`;
      try {
        fs.accessSync(mapped);
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }
}

/**
 * 过滤掉文件已丢失的本地图，并顺带删掉无效条目对应文件（忽略失败）
 * @returns {{ list: Array, removed: number }}
 */
export function pruneMissingLocalPhotos(photos) {
  const raw = Array.isArray(photos) ? photos : [];
  const list = [];
  let removed = 0;
  raw.forEach((p) => {
    if (!p) return;
    if (localImageExists(p.src)) {
      list.push(p);
    } else {
      removed += 1;
    }
  });
  return { list, removed };
}

/** 可选：删图时顺带清文件（失败忽略） */
export function removeLocalImage(src) {
  if (!src) return Promise.resolve();
  const path = String(src);
  const fs = wx.getFileSystemManager();
  const tryUnlink = (filePath) =>
    new Promise((resolve) => {
      fs.unlink({
        filePath,
        complete: () => resolve(),
      });
    });
  if (path.indexOf(wx.env.USER_DATA_PATH) === 0) {
    return tryUnlink(path);
  }
  if (path.indexOf('http://usr/') === 0) {
    return tryUnlink(
      `${wx.env.USER_DATA_PATH}${path.slice('http://usr'.length)}`
    );
  }
  return Promise.resolve();
}

/**
 * 选图并持久化
 * @param {{ count?: number }} [opts]
 * @returns {Promise<Array<{id:string,src:string,caption:string}>>}
 */
export function chooseAndPersistPhotos(opts = {}) {
  const count = Math.max(1, Math.min(9, opts.count || 9));
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const temps = (res.tempFiles || [])
          .map((f) => f.tempFilePath)
          .filter(Boolean);
        if (!temps.length) {
          resolve([]);
          return;
        }
        Promise.all(temps.map((p) => persistLocalImage(p)))
          .then(resolve)
          .catch(reject);
      },
      fail: (err) => {
        // 用户取消不报错
        if (err && /cancel/i.test(err.errMsg || '')) {
          resolve([]);
          return;
        }
        reject(err);
      },
    });
  });
}
