/**
 * 照片墙本地图：无服务器时写入用户目录，路径存进草稿 photoWall[].src
 * 临时路径 chooseMedia 会失效，必须 copy 到 USER_DATA_PATH
 */

export const MAX_PHOTO_WALL = 20;
export const DEFAULT_PHOTO_LAYOUT = 'carousel';
/** 四宫格 / 九宫格最多张数 */
export const GRID4_MAX = 4;
export const GRID9_MAX = 9;

/** 旧版 grid → 四宫格 */
export function normalizePhotoLayout(layout) {
  if (layout === 'grid') return 'grid4';
  return layout || DEFAULT_PHOTO_LAYOUT;
}

export function isGridLayout(layout) {
  const key = normalizePhotoLayout(layout);
  return key === 'grid4' || key === 'grid9';
}

/** 排序 / 宫格列数 */
export function layoutSortCols(layout) {
  return normalizePhotoLayout(layout) === 'grid4' ? 2 : 3;
}

/** 宫格排版张数上限；非宫格返回 0 */
export function layoutGridMax(layout) {
  const key = normalizePhotoLayout(layout);
  if (key === 'grid4') return GRID4_MAX;
  if (key === 'grid9') return GRID9_MAX;
  return 0;
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
    fs.copyFile({
      srcPath: tempFilePath,
      destPath: dest,
      success: () => resolve({ id, src: dest, caption: '' }),
      fail: (err) => {
        // 部分基础库 copyFile 异常时退回 saveFile
        fs.saveFile({
          tempFilePath,
          success: (res) => {
            resolve({ id, src: res.savedFilePath, caption: '' });
          },
          fail: reject,
        });
      },
    });
  });
}

/** 可选：删图时顺带清文件（失败忽略） */
export function removeLocalImage(src) {
  if (!src || String(src).indexOf(wx.env.USER_DATA_PATH) !== 0) {
    return Promise.resolve();
  }
  const fs = wx.getFileSystemManager();
  return new Promise((resolve) => {
    fs.unlink({
      filePath: src,
      complete: () => resolve(),
    });
  });
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
