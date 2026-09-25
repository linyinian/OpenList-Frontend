import Artplayer from "artplayer"
import { type Setting } from "artplayer"

/**
 * fork 定制：在 artplayer 内置倍速列表（默认 [0.5, 0.75, 1, 1.25, 1.5, 2]）上补充 1.75 倍。
 *
 * ⚠️ 必须在 `new Artplayer(...)` 之前赋值：内置的倍速 setting 是在播放器构造时
 *    从 `art.constructor.PLAYBACK_RATE` 读取这个静态属性的。模块级赋值 + import 提升
 *    即可保证顺序（两个播放器页面都 import 本模块）。
 */
Artplayer.PLAYBACK_RATE = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

/**
 * artplayer 的倍速标签是用 `value.toFixed(1)` 生成的，1.75 会被四舍五入显示成 "1.8"。
 * 这里在播放器创建后把这类「丢精度」的标签改回精确值。
 *
 * ⚠️ 判定必须收紧到「小数位 > 1 位」，不能写成 `value.toFixed(1) !== String(value)`：
 *    artplayer 对 1× 用的是 `i18n.get("Normal")`（中文「正常」），2× 用的是 "2.0"，
 *    用宽松判定会把这两档一起改写掉（实测踩过，1× 变成 "1"）。
 *
 * 写法说明：`SettingOption.html` 在 item 首次渲染前是普通属性，渲染后会被 artplayer
 * 换成带 setter 的访问器（setter 直接改写 DOM）——两种时机下赋值都生效。
 *
 * ⚠️ `SettingOption` 的 `Omit<Setting, ...>` 里带索引签名，`selector` 会被放宽成 any，
 *    所以这里显式标成 `Setting[]`，否则 strict 下 forEach 回调参数报隐式 any。
 */
/**
 * fork 定制：记住用户上次选择的倍速，并在每次打开/换源后静默恢复。
 *
 * 实现要点（2026-09-25，均为实测/查库结论）：
 * - 库内 5.4.0 的 `option.playbackRate` 类型只有 boolean，没有「默认倍速」支持 → 自己实现。
 * - 记录时机：监听 `video:ratechange`（媒体事件，菜单选择/右键菜单/代码赋值都会触发）。
 *   用档位白名单过滤可自然挡掉移动端长按快进的临时倍速（FAST_FORWARD_VALUE=3 不在列表里）。
 * - 恢复时机：`loadedmetadata` / `loadeddata` / `canplay` 三钩子幂等（§5.2 的
 *   「loadedmetadata 会被冲掉」只针对 currentTime seek；倍速赋值无此问题）。
 * - 恢复手段：直接改 video 元素的 `playbackRate` + `defaultPlaybackRate`，
 *   **不走 `player.playbackRate` setter** —— 那个 setter 每次赋值都会弹 notice（"Rate: 1.5x"），
 *   开场自动恢复会非常吵。直接改元素同样会触发 `video:ratechange`，
 *   设置菜单的选中态（库内监听该事件做高亮）会正常跟随。
 */
const RATE_STORAGE_KEY = "video_playback_rate"

function isKnownRate(rate: number): boolean {
  return (Artplayer.PLAYBACK_RATE as number[]).includes(rate)
}

/** 读取上次选择的倍速（未记录 / 非法值时回退 1，即「正常」） */
export function getLastPlaybackRate(): number {
  try {
    const n = Number(localStorage.getItem(RATE_STORAGE_KEY))
    return isKnownRate(n) ? n : 1
  } catch {
    return 1
  }
}

/** 记录用户选择的倍速；并在每次换源后静默恢复到上次选择 */
export function rememberPlaybackRate(player: Artplayer) {
  player.on("video:ratechange", () => {
    const rate = player.playbackRate
    if (isKnownRate(rate)) localStorage.setItem(RATE_STORAGE_KEY, String(rate))
  })
  const apply = () => {
    const rate = getLastPlaybackRate()
    const $video = player.video as HTMLVideoElement
    if (rate === 1 || Math.abs($video.playbackRate - rate) < 0.01) return
    // defaultPlaybackRate 一并设置：浏览器加载新资源时 playbackRate 会重置回它
    $video.defaultPlaybackRate = rate
    $video.playbackRate = rate
  }
  // loadedmetadata 也挂上：非自动播放时 preload=metadata 只到 HAVE_METADATA，
  // loadeddata/canplay 不会触发（§5.2 的「loadedmetadata 会被冲掉」只针对 currentTime seek，
  // 倍速赋值无此问题，且 defaultPlaybackRate 已兜底资源加载重置）。三个钩子幂等。
  player.on("video:loadedmetadata", apply)
  player.on("video:loadeddata", apply)
  player.on("video:canplay", apply)
}

export function fixPlaybackRateLabel(player: Artplayer) {
  const item = player.setting.option.find((s) => s.name === "playback-rate")
  const selector = item?.selector as Setting[] | undefined
  selector?.forEach((s) => {
    const value = s.value as number | undefined
    if (typeof value !== "number") return
    const exact = String(value)
    const decimals = exact.includes(".") ? exact.split(".")[1] : ""
    if (decimals.length > 1) s.html = exact
  })
}
