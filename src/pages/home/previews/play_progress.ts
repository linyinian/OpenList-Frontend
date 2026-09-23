/**
 * 静默记住 / 恢复视频播放进度。
 *
 * 替代 artplayer 内置的 `autoPlayback: true` —— 内置实现在打开视频时会弹出
 * 「上次看到 xx:xx / 跳转播放」浮层,需要手动点击才 seek;这里改为加载完成后
 * 直接静默跳转,不打扰用户。
 *
 * 存储:localStorage["video_play_times"] = { "t:<路径>": 秒数 }
 * key 带 "t:" 前缀,避免纯数字样式的路径被 JS 当成整数键重排,
 * 从而保证「按写入顺序淘汰最旧记录」的 FIFO 语义。
 */

const STORAGE_KEY = "video_play_times"
const ENABLE_KEY = "video_remember_progress"

/** 短于该秒数不记录(与 artplayer 内置 AUTO_PLAYBACK_MIN 对齐) */
export const PROGRESS_MIN = 5
/** 距结尾不足该秒数视为已看完:清除记录,下次从头播 */
export const PROGRESS_NEAR_END = 30
/** 最多保留多少条记录,超出按写入顺序淘汰最旧的 */
const PROGRESS_MAX = 50

type Times = Record<string, number>

const toKey = (id: string) => `t:${id}`

const readAll = (): Times => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    return raw && typeof raw === "object" ? (raw as Times) : {}
  } catch {
    return {}
  }
}

const writeAll = (times: Times) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(times))
  } catch {
    // 无痕模式等 localStorage 不可用时静默降级为「不记忆」
  }
}

/** 开关是否开启(默认开启) */
export const isRememberEnabled = () =>
  localStorage.getItem(ENABLE_KEY) !== "false"

export const setRememberEnabled = (v: boolean) =>
  localStorage.setItem(ENABLE_KEY, String(v))

/** 读取某路径的上次播放位置(秒);无记录返回 0 */
export const getProgress = (id?: string) => {
  if (!id) return 0
  return readAll()[toKey(id)] || 0
}

/** 写入播放位置;不足 PROGRESS_MIN 秒不记 */
export const saveProgress = (id: string | undefined, time: number) => {
  if (!id || !Number.isFinite(time) || time < PROGRESS_MIN) return
  const times = readAll()
  const key = toKey(id)
  // 先删后加,让最近播放的键排到末尾
  if (key in times) delete times[key]
  times[key] = Math.floor(time)
  const keys = Object.keys(times)
  if (keys.length > PROGRESS_MAX) {
    keys.slice(0, keys.length - PROGRESS_MAX).forEach((k) => delete times[k])
  }
  writeAll(times)
}

/** 清除某路径的记录(看完、或从头重播时调用) */
export const clearProgress = (id?: string) => {
  if (!id) return
  const times = readAll()
  const key = toKey(id)
  if (key in times) {
    delete times[key]
    writeAll(times)
  }
}

/**
 * 计算应当恢复到的位置(秒)。
 * 返回 0 表示无需恢复:无记录 / 记录过短 / 已接近结尾。
 * 接近结尾的情况会顺手清除记录,避免下次打开直接跳到片尾。
 */
export const resolveResumeTime = (id: string | undefined, duration: number) => {
  const time = getProgress(id)
  if (!time) return 0
  if (!Number.isFinite(duration) || duration <= 0) return time
  if (time > duration - PROGRESS_NEAR_END) {
    clearProgress(id)
    return 0
  }
  return time
}
