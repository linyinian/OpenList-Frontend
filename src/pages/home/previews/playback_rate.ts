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
