import { Box, HStack, Icon, Text, Tooltip, VStack } from "@hope-ui/solid"
import { For, Show, createSignal } from "solid-js"
import { TbFolder, TbStarFilled, TbX } from "solid-icons/tb"
import { useRouter, useT } from "~/hooks"
import { favorites, removeFavorite } from "~/store"
import { hoverColor } from "~/utils"

/**
 * 侧边栏「收藏」区（类似 Windows 资源管理器的固定快速访问）
 * 收藏项来自文件夹右键菜单的「收藏到侧边栏」，持久化在 localStorage。
 */
export const SidebarFavorites = () => {
  const t = useT()
  const { to, pathname } = useRouter()
  const [hoverPath, setHoverPath] = createSignal<string>()

  return (
    <Box w="$full" mb="$1">
      <HStack
        spacing="$1"
        px="$1"
        mb="$1"
        color="$neutral11"
        userSelect="none"
        flexShrink={0}
      >
        <Icon as={TbStarFilled} boxSize="$4" color="$warning9" />
        <Text fontSize="$xs" fontWeight="$semibold">
          {t("home.sidebar.favorites")}
        </Text>
        <Show when={favorites().length > 0}>
          <Text fontSize="$xs" color="$neutral9">
            {favorites().length}
          </Text>
        </Show>
      </HStack>
      <Show
        when={favorites().length > 0}
        fallback={
          <Text px="$1" fontSize="$xs" color="$neutral9" userSelect="none">
            {t("home.sidebar.favorites_empty")}
          </Text>
        }
      >
        <VStack w="$full" alignItems="start" spacing="$0_5">
          <For each={favorites()}>
            {(item) => {
              const active = () => pathname() === item.path
              return (
                <HStack
                  w="$full"
                  spacing="$1"
                  px="$1"
                  py="$0_5"
                  rounded="$md"
                  cursor="pointer"
                  data-favorite-path={item.path}
                  bgColor={active() ? "$info8" : "transparent"}
                  _hover={{ bgColor: active() ? "$info8" : hoverColor() }}
                  onMouseEnter={() => setHoverPath(item.path)}
                  onMouseLeave={() =>
                    hoverPath() === item.path && setHoverPath(undefined)
                  }
                  onClick={() => to(item.path)}
                >
                  <Icon
                    as={TbFolder}
                    boxSize="$4"
                    color="$neutral10"
                    flexShrink={0}
                  />
                  <Text
                    flexGrow={1}
                    fontSize="$sm"
                    css={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={item.path}
                  >
                    {item.name}
                  </Text>
                  <Show when={hoverPath() === item.path}>
                    <Tooltip label={t("home.sidebar.remove_favorite")}>
                      <Icon
                        as={TbX}
                        boxSize="$3_5"
                        color="$neutral9"
                        flexShrink={0}
                        data-favorite-remove={item.path}
                        aria-label={t("home.sidebar.remove_favorite")}
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation()
                          removeFavorite(item.path)
                        }}
                      />
                    </Tooltip>
                  </Show>
                </HStack>
              )
            }}
          </For>
        </VStack>
      </Show>
    </Box>
  )
}
