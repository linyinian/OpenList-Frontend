import { Box } from "@hope-ui/solid"
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { useRouter, useLink } from "~/hooks"
import {
  getMainColor,
  getSettingBool,
  objStore,
  setShouldKeepState,
} from "~/store"
import { Obj, ObjType } from "~/types"
import { ext, pathDir, pathJoin } from "~/utils"
import Artplayer from "artplayer"
import { type Option } from "artplayer"
import { type Setting } from "artplayer"
import { type Events } from "artplayer"
import artplayerPluginDanmuku from "artplayer-plugin-danmuku"
import { type Option as DanmukuOption } from "artplayer-plugin-danmuku"
import artplayerPluginAss from "~/components/artplayer-plugin-ass"
import mpegts from "mpegts.js"
import Hls from "hls.js"
import { currentLang } from "~/app/i18n"
import { AutoHeightPlugin, VideoBox } from "./video_box"
import {
  clearProgress,
  isRememberEnabled,
  resolveResumeTime,
  saveProgress,
} from "./play_progress"
import { ArtPlayerIconsSubtitle } from "~/components/icons"
import { useNavigate } from "@solidjs/router"
import "./artplayer.css"

// 空格键暂停的判定窗口(ms):artplayer 的 hotkey 事件与随后排队的 video:pause 只隔毫秒级。
// 这个窗口用于兜住「按了空格但其实没暂停」的情况,避免标记残留影响后续的暂停。
const HOTKEY_PAUSE_WINDOW = 1000

const Preview = () => {
  const { pathname, searchParams } = useRouter()
  const { proxyLink } = useLink()
  const navigate = useNavigate()
  const videos = createMemo(() =>
    objStore.objs.filter((obj) => obj.type === ObjType.VIDEO),
  )
  const next_video = () => {
    const index = videos().findIndex((f) => f.name === objStore.obj.name)
    if (index < videos().length - 1) {
      navigate(
        pathJoin(pathDir(location.pathname), videos()[index + 1].name) +
          "?auto_fullscreen=" +
          player.fullscreen,
      )
    }
  }
  const previous_video = () => {
    const index = videos().findIndex((f) => f.name === objStore.obj.name)
    if (index > 0) {
      navigate(
        pathJoin(pathDir(location.pathname), videos()[index - 1].name) +
          "?auto_fullscreen=" +
          player.fullscreen,
      )
    }
  }
  let player: Artplayer
  let flvPlayer: mpegts.Player
  let hlsPlayer: Hls
  let option: Option = {
    container: "#video-player",
    volume: 1.0,
    autoplay: getSettingBool("video_autoplay"),
    autoSize: false,
    autoMini: true,
    loop: false,
    flip: true,
    playbackRate: true,
    aspectRatio: true,
    screenshot: true,
    setting: true,
    hotkey: true,
    pip: true,
    mutex: true,
    fullscreen: true,
    fullscreenWeb: true,
    subtitleOffset: true,
    miniProgressBar: false,
    playsInline: true,
    theme: getMainColor(),
    // layers: [],
    // settings: [],
    // contextmenu: [],
    controls: [
      {
        name: "previous-button",
        index: 10,
        position: "left",
        html: '<svg fill="none" stroke-width="2" xmlns="http://www.w3.org/2000/svg" height="22" width="22" class="icon icon-tabler icon-tabler-player-track-prev-filled" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible; color: currentcolor;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M20.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647 .565 1.659 .106 1.659 -.753v-14c0 -.86 -1.012 -1.318 -1.659 -.753z" stroke-width="0" fill="currentColor"></path><path d="M9.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647 .565 1.659 .106 1.659 -.753v-14c0 -.86 -1.012 -1.318 -1.659 -.753z" stroke-width="0" fill="currentColor"></path></svg>',
        tooltip: "Previous",
        click: function () {
          previous_video()
        },
      },
      {
        name: "next-button",
        index: 11,
        position: "left",
        html: '<svg fill="none" stroke-width="2" xmlns="http://www.w3.org/2000/svg" height="22" width="22" class="icon icon-tabler icon-tabler-player-track-next-filled" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible; color: currentcolor;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M2 5v14c0 .86 1.012 1.318 1.659 .753l8 -7a1 1 0 0 0 0 -1.506l-8 -7c-.647 -.565 -1.659 -.106 -1.659 .753z" stroke-width="0" fill="currentColor"></path><path d="M13 5v14c0 .86 1.012 1.318 1.659 .753l8 -7a1 1 0 0 0 0 -1.506l-8 -7c-.647 -.565 -1.659 -.106 -1.659 .753z" stroke-width="0" fill="currentColor"></path></svg>',
        tooltip: "Next",
        click: function () {
          next_video()
        },
      },
    ],
    quality: [],
    // highlight: [],
    plugins: [AutoHeightPlugin],
    whitelist: [],
    settings: [],
    // subtitle:{}
    moreVideoAttr: {
      // @ts-ignore
      "webkit-playsinline": true,
      playsInline: true,
      crossOrigin: "anonymous",
    },
    customType: {
      flv: function (video: HTMLMediaElement, url: string) {
        flvPlayer?.destroy()
        flvPlayer = mpegts.createPlayer(
          {
            type: "flv",
            url: url,
          },
          { referrerPolicy: "same-origin" },
        )
        flvPlayer.attachMediaElement(video)
        flvPlayer.load()
      },
      m2ts: function (video: HTMLMediaElement, url: string) {
        flvPlayer?.destroy()
        flvPlayer = mpegts.createPlayer(
          {
            type: "m2ts",
            url: url,
          },
          { referrerPolicy: "same-origin" },
        )
        flvPlayer.attachMediaElement(video)
        flvPlayer.load()
      },
      m3u8: function (video: HTMLMediaElement, url: string) {
        hlsPlayer?.destroy()
        hlsPlayer = new Hls()
        hlsPlayer.loadSource(url)
        hlsPlayer.attachMedia(video)
        if (!video.src) {
          video.src = url
        }
      },
    },
    lang: ["en", "zh-cn", "zh-tw"].includes(currentLang().toLowerCase())
      ? (currentLang().toLowerCase() as string)
      : "en",
    lock: true,
    fastForward: true,
    // 注意:不要开 `autoPlayback`,它会在打开视频时弹出「上次看到 xx / 跳转播放」
    // 的询问浮层。进度记忆改由 ./play_progress 静默处理。
    autoOrientation: true,
    airplay: true,
  }
  const subtitleAndDanmu = createMemo(() => {
    const subtitle: Obj[] = []
    let danmu: Obj | undefined
    for (const obj of objStore.related) {
      const name = obj.name.toLowerCase()
      if (
        name.endsWith(".srt") ||
        name.endsWith(".ass") ||
        name.endsWith(".vtt")
      ) {
        subtitle.push(obj)
      } else if (!danmu && name.endsWith(".xml")) {
        danmu = obj
      }
    }
    return { subtitle, danmu }
  })

  // TODO: add a switch in manage panel to choose whether to enable `libass-wasm`
  const enableEnhanceAss = true

  const switchUrl = (url: string) => {
    const { playing } = player
    player.pause()
    player.option.id = pathname()
    player.option.type = ext(objStore.obj.name)
    player.switchUrl(url).finally(() => playing && player.play())

    const { subtitle, danmu } = subtitleAndDanmu()
    let isEnhanceAssMode = false
    const setSubtitleVisible = (visible: boolean) => {
      const type = isEnhanceAssMode ? "ass" : "webvtt"

      switch (type) {
        case "ass":
          player.subtitle.show = false
          player.emit("artplayer-plugin-ass:visible" as keyof Events, visible)
          break

        case "webvtt":
        default:
          player.subtitle.show = visible
          player.emit("artplayer-plugin-ass:visible" as keyof Events, false)
          break
      }
    }
    if (subtitle.length) {
      // render subtitle toggle menu
      const innerMenu: Setting[] = [
        {
          name: "setting_subtitle_display",
          html: "Display",
          tooltip: "Show",
          switch: true,
          onSwitch: function (item: Setting) {
            item.tooltip = item.switch ? "Hide" : "Show"
            setSubtitleVisible(!item.switch)

            // sync menu subtitle tooltip
            const menu_sub = this.setting.find("setting_subtitle")
            menu_sub && (menu_sub.tooltip = item.tooltip)

            return !item.switch
          },
        },
      ]
      subtitle.forEach((item, i) => {
        innerMenu.push({
          default: i === 0,
          html: (
            <span
              title={item.name}
              style={{
                "max-width": "200px",
                overflow: "hidden",
                "text-overflow": "ellipsis",
                "word-break": "break-all",
                "white-space": "normal",
                display: "-webkit-box",
                "-webkit-line-clamp": "2",
                "-webkit-box-orient": "vertical",
                "font-size": "12px",
              }}
            >
              {item.name}
            </span>
          ) as HTMLElement,
          name: item.name,
          url: proxyLink(item, true),
        })
      })

      const onSelect = function (this: Artplayer, item: Setting) {
        if (enableEnhanceAss && ext(item.name).toLowerCase() === "ass") {
          isEnhanceAssMode = true
          if (!player.plugins.artplayerPluginAss) {
            player.plugins.add(artplayerPluginAss({ subUrl: item.url }))
          } else {
            this.emit("artplayer-plugin-ass:switch" as keyof Events, item.url)
          }
          setSubtitleVisible(true)
        } else {
          isEnhanceAssMode = false
          this.subtitle.switch(item.url, { name: item.name })
          this.once("subtitleLoad", setSubtitleVisible.bind(this, true))
        }

        const switcher = innerMenu.find(
          (_) => _.name === "setting_subtitle_display",
        )

        if (switcher && !switcher.switch) switcher.$html?.click?.()

        // sync from display switcher
        return switcher?.tooltip
      }
      player.setting.update({
        name: "setting_subtitle",
        html: "Subtitle",
        tooltip: "Show",
        icon: ArtPlayerIconsSubtitle({ size: 24 }) as HTMLElement,
        selector: innerMenu,
        onSelect,
      })
      onSelect.call(player, innerMenu[1])
    } else {
      player.setting.find("setting_subtitle") &&
        player.setting.remove("setting_subtitle")
      setSubtitleVisible(false)
    }
    const danmukuPlugin = player.plugins.artplayerPluginDanmuku as ReturnType<
      ReturnType<typeof artplayerPluginDanmuku>
    >
    if (danmukuPlugin) {
      danmukuPlugin.reset()
      danmukuPlugin.option.danmuku = []
      danmukuPlugin.load(danmu ? proxyLink(danmu, true) : undefined)
    } else if (danmu) {
      player.plugins.add(
        artplayerPluginDanmuku({
          speed: 5,
          opacity: 1,
          fontSize: 25,
          mode: 0,
          antiOverlap: false,
          synchronousPlayback: false,
          theme: "dark",
          heatmap: true,
          ...JSON.parse(localStorage.getItem("danmuku_config") || "{}"),
          emitter: false,
          danmuku: proxyLink(danmu, true),
        }),
      )
      player.on("artplayerPluginDanmuku:config", (option) => {
        const {
          speed,
          margin,
          opacity,
          mode,
          modes,
          fontSize,
          antiOverlap,
          synchronousPlayback,
          heatmap,
          visible,
        } = option as DanmukuOption
        localStorage.setItem(
          "danmuku_config",
          JSON.stringify({
            speed,
            margin,
            opacity,
            mode,
            modes,
            fontSize,
            antiOverlap,
            synchronousPlayback,
            heatmap,
            visible,
          }),
        )
      })
    }
  }

  onMount(() => {
    player = new Artplayer(option)
    createEffect(on(() => objStore.raw_url, switchUrl))

    // 静默记住 / 恢复播放进度(替代 artplayer 内置 autoPlayback 的询问浮层)
    let resumeId: string | undefined
    let resumeTarget = 0
    let lastSaved = 0
    const currentId = () => {
      const id = player.option.id
      return id === undefined || id === null ? undefined : String(id)
    }
    player.on("video:timeupdate", () => {
      if (!player.playing || !remember()) return
      const now = Date.now()
      if (now - lastSaved < 1000) return // timeupdate 约 4 次/秒,节流到 1 秒
      lastSaved = now
      // 一并记录总时长,供首页「上次观看」显示进度比例(缺失也不影响续播)
      saveProgress(currentId(), player.currentTime, player.duration)
    })
    // metadata 就绪后才能算出目标位置(那时才拿得到 duration)
    player.on("video:loadedmetadata", () => {
      const id = currentId()
      if (!id || resumeId === id) return
      resumeId = id
      resumeTarget = remember() ? resolveResumeTime(id, player.duration) : 0
    })
    // ⚠️ 真正的 seek 必须等到数据可播(loadeddata / canplay):
    // 在 loadedmetadata 阶段赋 currentTime 会被浏览器随后的「初始 seek 到 0」冲掉
    const applyResume = () => {
      if (!resumeId || resumeTarget <= 0) return
      if (player.video.readyState < 2) return
      if (Math.abs(player.currentTime - resumeTarget) <= 1.5) {
        // 已经到位(或用户已经拖到这附近),不再干预
        resumeTarget = 0
        return
      }
      player.seek = resumeTarget
    }
    player.on("video:loadeddata", applyResume)
    player.on("video:canplay", applyResume)

    // ── 控制栏显示时机定制(Allen 2026-09-24 指定)────────────────────────────
    // artplayer 默认行为:鼠标移出不收(等 CONTROL_HIDE_TIME=3s 超时)、任何暂停都强制显示控制栏。
    // 这里改成:① 播放中鼠标移出播放器 → 立即收起;② 空格键暂停 → 不强制显示控制栏。
    const hideControls = () => {
      // 设置面板以控制栏为锚点,面板开着时收起会留下一个悬空的面板
      if (player.setting.show) return
      player.controls.show = false
    }
    player.on("hover", (state, event) => {
      // 仅处理「指针离开播放器」:暂停时保持默认、按住鼠标(拖进度条拖出边界)时不打扰
      if (state || !player.playing || (event as MouseEvent).buttons !== 0)
        return
      hideControls()
    })
    // 空格暂停的识别:hotkey 事件在 art.toggle() 之后同步 emit,而 video:pause 是媒体事件(异步排队),
    // 所以标记一定先就位、后消费;时间窗兜住「按了空格但没暂停」的情况。
    let hotkeyPauseAt = 0
    player.on("hotkey", (event) => {
      if (event.code === "Space") hotkeyPauseAt = Date.now()
    })
    player.on("video:play", () => {
      hotkeyPauseAt = 0
    })
    // 库内部那句 `art.controls.show = true` 注册在构造期,本回调注册在其后 → 后执行、可覆盖它
    player.on("video:pause", () => {
      if (Date.now() - hotkeyPauseAt > HOTKEY_PAUSE_WINDOW) return
      hotkeyPauseAt = 0
      hideControls()
    })

    let auto_fullscreen: boolean
    switch (searchParams["auto_fullscreen"]) {
      case "true":
        auto_fullscreen = true
      case "false":
        auto_fullscreen = false
      default:
        auto_fullscreen = false
    }
    player.on("ready", () => {
      player.fullscreen = auto_fullscreen
    })
    const onFullscreen = () =>
      setShouldKeepState(player.fullscreen || player.fullscreenWeb)
    player.on("fullscreen", onFullscreen)
    player.on("fullscreenWeb", onFullscreen)
    player.on("video:ended", () => {
      // 已看完,清掉进度,下次从头播
      clearProgress(currentId())
      if (!autoNext()) return
      next_video()
    })
    player.on("error", () => {
      if (player.video.crossOrigin) {
        console.log(
          "Error detected. Trying to remove Cross-Origin attribute. Screenshot may not be available.",
        )
        player.video.crossOrigin = null
      }
    })
  })
  onCleanup(() => {
    setShouldKeepState(false)
    if (player) {
      player.fullscreenWeb = false
      player.fullscreen = false
      player.pip && (player.pip = false)
      player.destroy()
    }
    flvPlayer?.destroy()
    hlsPlayer?.destroy()
  })
  const [autoNext, setAutoNext] = createSignal()
  const [remember, setRemember] = createSignal(isRememberEnabled())
  return (
    <VideoBox
      onAutoNextChange={setAutoNext}
      onRememberProgressChange={setRemember}
    >
      <Box w="$full" h="60vh" id="video-player" />
    </VideoBox>
  )
}

export default Preview
