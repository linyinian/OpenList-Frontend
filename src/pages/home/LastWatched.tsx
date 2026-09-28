import {
  Box,
  Button,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Tooltip,
  VStack,
  createDisclosure,
} from "@hope-ui/solid"
import { For, Show, createSignal } from "solid-js"
import { BsPlayFill } from "solid-icons/bs"
import { TbX } from "solid-icons/tb"
import { useRouter, useT } from "~/hooks"
import {
  WatchedItem,
  clearProgress,
  formatSeconds,
  listRecentWatched,
} from "./previews/play_progress"
import { getMainColor } from "~/store"
import { hoverColor } from "~/utils"

/** 首页直接展示的条数;超出部分收进「更多」弹窗 */
const PREVIEW_COUNT = 3
/** 弹窗内最多展示多少条(与 play_progress 的 PROGRESS_MAX=50 对齐) */
const MODAL_COUNT = 50

/**
 * 根目录「上次观看」入口。
 *
 * 数据来自视频播放器写入的播放进度(见 ./previews/play_progress)。
 * 点击条目即跳到该视频的播放页(视频文件的默认预览就是播放器,所以直接导航到路径即可)。
 *
 * 显示条件(三者同时满足):
 *   ① 当前处于**根目录**(`pathname() === "/"`)—— 子文件夹里不占位,避免干扰浏览;
 *   ② 存在视频类型的观看记录;
 *   ③ 不是刚被 × 清除(用 signal 覆盖掉 localStorage 的旧值)。
 *
 * 首页展示最近 3 条,超出部分通过右上角「更多」在弹窗里查看。
 */
export const LastWatched = () => {
  const t = useT()
  const { to, pathname } = useRouter()
  const { isOpen, onOpen, onClose } = createDisclosure()
  // 进首页时读一次;点 × 清除后重读
  const [items, setItems] = createSignal<WatchedItem[]>(
    listRecentWatched(MODAL_COUNT),
  )

  // 仅根目录显示
  const visible = () => pathname() === "/" && items().length > 0
  /** 首页直接展示的前 3 条 */
  const preview = () => items().slice(0, PREVIEW_COUNT)
  /** 弹窗里展示的全部记录 */
  const all = () => items()
  const hasMore = () => items().length > PREVIEW_COUNT

  const remove = (e: MouseEvent, path: string) => {
    e.stopPropagation()
    clearProgress(path)
    setItems(listRecentWatched(MODAL_COUNT))
  }

  /** 单条记录的进度条比例;时长未知时返回 undefined(只显示位置) */
  const percentOf = (it: WatchedItem) => {
    if (!it.duration) return undefined
    return Math.min(100, Math.max(0, (it.time / it.duration) * 100))
  }

  const timeTextOf = (it: WatchedItem) =>
    it.duration
      ? formatSeconds(it.time) + " / " + formatSeconds(it.duration)
      : formatSeconds(it.time)

  /** 单行记录(首页预览与弹窗共用) */
  const Row = (props: { item: WatchedItem; inModal?: boolean }) => {
    const pct = () => percentOf(props.item)
    return (
      <Tooltip label={props.item.path} placement="top">
        <HStack
          w="$full"
          spacing="$3"
          px="$2"
          py="$1_5"
          rounded="$md"
          cursor="pointer"
          class="last-watched-row"
          _hover={{ bgColor: hoverColor() }}
          data-last-watched-path={props.item.path}
          onClick={() => {
            if (props.inModal) onClose()
            to(props.item.path)
          }}
        >
          <Icon
            as={BsPlayFill}
            boxSize="$6"
            color={getMainColor()}
            flexShrink={0}
          />
          <VStack alignItems="start" spacing="$0_5" flexGrow={1} minW={0}>
            <HStack spacing="$2" w="$full">
              <Text
                fontSize="$sm"
                fontWeight="$medium"
                css={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                flexGrow={1}
                minW={0}
              >
                {props.item.name}
              </Text>
              <Text fontSize="$xs" color="$neutral11" flexShrink={0}>
                {timeTextOf(props.item)}
              </Text>
            </HStack>
            <Show when={pct() !== undefined}>
              <Box
                w="$full"
                h="3px"
                rounded="$full"
                bgColor="$neutral5"
                overflow="hidden"
              >
                <Box
                  w={pct() + "%"}
                  h="$full"
                  rounded="$full"
                  bgColor={getMainColor()}
                />
              </Box>
            </Show>
          </VStack>
          <Icon
            as={TbX}
            boxSize="$4"
            color="$neutral9"
            flexShrink={0}
            data-last-watched-clear={props.item.path}
            aria-label={t("home.last_watched.clear")}
            title={t("home.last_watched.clear")}
            onClick={(e: MouseEvent) => remove(e, props.item.path)}
          />
        </HStack>
      </Tooltip>
    )
  }

  return (
    <Show when={visible()}>
      <VStack
        class="last-watched"
        w="$full"
        alignItems="start"
        spacing="$0_5"
        px="$2"
        py="$1_5"
        rounded="$lg"
        border="1px solid"
        borderColor="$neutral5"
        bgColor="transparent"
      >
        {/* 标题行:标题 + 更多 */}
        <HStack w="$full" spacing="$2" px="$1" flexShrink={0}>
          <Icon as={BsPlayFill} boxSize="$4" color={getMainColor()} />
          <Text fontSize="$xs" color="$neutral11" flexGrow={1}>
            {t("home.last_watched.title")}
          </Text>
          <Show when={hasMore()}>
            <Text
              fontSize="$xs"
              color="$neutral11"
              cursor="pointer"
              flexShrink={0}
              userSelect="none"
              data-last-watched-more
              _hover={{ color: getMainColor() }}
              onClick={onOpen}
            >
              {t("home.last_watched.more")} ({items().length})
            </Text>
          </Show>
        </HStack>
        <For each={preview()}>{(item) => <Row item={item} />}</For>
      </VStack>

      {/* 弹窗:全部记录 */}
      <Modal
        blockScrollOnMount={false}
        opened={isOpen()}
        onClose={onClose}
        size={{ "@initial": "sm", "@md": "md" }}
      >
        <ModalOverlay />
        <ModalContent data-last-watched-modal>
          <ModalHeader>{t("home.last_watched.title")}</ModalHeader>
          <ModalBody>
            <VStack
              w="$full"
              alignItems="start"
              spacing="$0_5"
              maxH="60vh"
              overflowY="auto"
            >
              <For each={all()}>{(item) => <Row item={item} inModal />}</For>
            </VStack>
          </ModalBody>
          <ModalFooter display="flex" gap="$2">
            <Button onClick={onClose} colorScheme="neutral">
              {t("global.close")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Show>
  )
}
