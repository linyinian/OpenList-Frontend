import { Box, HStack, Icon, Text, Tooltip, VStack } from "@hope-ui/solid"
import { Show, createSignal } from "solid-js"
import { BsPlayFill } from "solid-icons/bs"
import { TbX } from "solid-icons/tb"
import { useRouter, useT } from "~/hooks"
import { clearProgress, formatSeconds, getLastWatched } from "./previews/play_progress"
import { getMainColor } from "~/store"
import { hoverColor } from "~/utils"

/**
 * 首页「上次观看」入口。
 *
 * 数据来自视频播放器写入的播放进度（见 ./previews/play_progress）。
 * 点击整卡即跳到该视频的播放页（视频文件的默认预览就是播放器，所以直接导航到路径即可）。
 * 无记录 / 非视频类型时不渲染任何内容。
 */
export const LastWatched = () => {
  const t = useT()
  const { to } = useRouter()
  // 进首页时读一次;点 × 清除后置空隐藏
  const [item, setItem] = createSignal(getLastWatched())

  const percent = () => {
    const it = item()
    if (!it || !it.duration) return undefined
    return Math.min(100, Math.max(0, (it.time / it.duration) * 100))
  }

  const remove = (e: MouseEvent) => {
    e.stopPropagation()
    const it = item()
    if (it) clearProgress(it.path)
    setItem(undefined)
  }

  return (
    <Show when={item()}>
      <Tooltip label={item()?.path} placement="top">
        <HStack
          class="last-watched"
          w="$full"
          spacing="$3"
          px="$3"
          py="$2"
          rounded="$lg"
          cursor="pointer"
          border="1px solid"
          borderColor="$neutral5"
          bgColor="transparent"
          _hover={{ bgColor: hoverColor(), borderColor: getMainColor() }}
          data-last-watched-path={item()?.path}
          onClick={() => to(item()!.path)}
        >
          <Icon as={BsPlayFill} boxSize="$7" color={getMainColor()} flexShrink={0} />
          <VStack alignItems="start" spacing="$0_5" flexGrow={1} minW={0}>
            <HStack spacing="$2" w="$full">
              <Text fontSize="$xs" color="$neutral11" flexShrink={0}>
                {t("home.last_watched.title")}
              </Text>
              <Text
                fontSize="$sm"
                fontWeight="$medium"
                css={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                flexGrow={1}
                minW={0}
              >
                {item()?.name}
              </Text>
              <Text fontSize="$xs" color="$neutral11" flexShrink={0}>
                {item()?.duration
                  ? formatSeconds(item()!.time) + " / " + formatSeconds(item()!.duration!)
                  : formatSeconds(item()!.time)}
              </Text>
            </HStack>
            <Show when={percent() !== undefined}>
              <Box w="$full" h="3px" rounded="$full" bgColor="$neutral5" overflow="hidden">
                <Box w={percent() + "%"} h="$full" rounded="$full" bgColor={getMainColor()} />
              </Box>
            </Show>
          </VStack>
          <Icon
            as={TbX}
            boxSize="$4"
            color="$neutral9"
            flexShrink={0}
            data-last-watched-clear
            aria-label={t("home.last_watched.clear")}
            title={t("home.last_watched.clear")}
            onClick={remove}
          />
        </HStack>
      </Tooltip>
    </Show>
  )
}
