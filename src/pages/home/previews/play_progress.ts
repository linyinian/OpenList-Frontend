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
/**
 * 各视频的总时长(秒)。独立于 video_play_times 存放:
 * ① 不动已上线的续播数据格式,零回归风险;
 * ② 时长缺失只影响"进度条比例",不影响续播本身。
 */
const DURATION_KEY = "video_play_durations"

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

const readDurations = (): Times => {
  try {
    const raw = JSON.parse(localStorage.getItem(DURATION_KEY) || "{}")
    return raw && typeof raw === "object" ? (raw as Times) : {}
  } catch {
    return {}
  }
}

const writeDurations = (durations: Times) => {
  try {
    localStorage.setItem(DURATION_KEY, JSON.stringify(durations))
  } catch {
    // 同上,静默降级
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
export const saveProgress = (
  id: string | undefined,
  time: number,
  duration?: number,
) => {
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
  // 总时长单独存:仅用于首页"上次观看"显示进度比例,缺失不影响续播
  if (Number.isFinite(duration) && (duration as number) > 0) {
    const durations = readDurations()
    durations[key] = Math.floor(duration as number)
    const dkeys = Object.keys(durations)
    if (dkeys.length > PROGRESS_MAX) {
      dkeys.slice(0, dkeys.length - PROGRESS_MAX).forEach((k) => delete durations[k])
    }
    writeDurations(durations)
  }
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
  const durations = readDurations()
  if (key in durations) {
    delete durations[key]
    writeDurations(durations)
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

/**
 * ===== 首页「上次观看」入口用的读取接口 =====
 * 存储顺序即播放顺序(saveProgress 先删后加),所以「最后一项 = 最近观看」。
 */

/** 视频扩展名白名单 —— 入口仅限视频类型 */
const VIDEO_EXTS = new Set([
  "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v",
  "mpg", "mpeg", "ts", "m2ts", "rmvb", "rm", "3gp", "vob", "ogv",
])

export interface WatchedItem {
  /** 完整路径,可直接用于跳转 */
  path: string
  /** 文件名(路径最后一段) */
  name: string
  /** 已观看到的位置(秒) */
  time: number
  /** 总时长(秒);未知则 undefined —— 此时只显示位置,不显示比例 */
  duration?: number
}

const isVideoPath = (path: string) => {
  const dot = path.lastIndexOf(".")
  if (dot < 0) return false
  return VIDEO_EXTS.has(path.slice(dot + 1).toLowerCase())
}

const nameOfPath = (path: string) => {
  const seg = path.split("/").filter(Boolean).pop()
  return seg || path
}

/**
 * 最近观看列表(按最近播放倒序)。
 * 仅返回视频类型;非视频或位置为 0 的记录会被跳过。
 */
export const listRecentWatched = (limit = 1): WatchedItem[] => {
  const times = readAll()
  const durations = readDurations()
  const keys = Object.keys(times)
  const out: WatchedItem[] = []
  for (let i = keys.length - 1; i >= 0 && out.length < limit; i--) {
    const key = keys[i]
    if (!key.startsWith("t:")) continue
    const path = key.slice(2)
    if (!isVideoPath(path)) continue
    const time = times[key]
    if (!time || time <= 0) continue
    const duration = durations[key]
    out.push({
      path,
      name: nameOfPath(path),
      time,
      duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    })
  }
  return out
}

/** 最近看过的那个视频;没有则返回 undefined */
export const getLastWatched = (): WatchedItem | undefined =>
  listRecentWatched(1)[0]

/** 秒 → m:ss / h:mm:ss */
export const formatSeconds = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? h + ":" + pad(m) + ":" + pad(ss) : m + ":" + pad(ss)
}
