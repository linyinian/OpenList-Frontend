import { Box, Grid, Text } from "@hope-ui/solid"
import { For, Show } from "solid-js"
import { GridItem } from "./GridItem"
import "lightgallery/css/lightgallery-bundle.css"
import { smartCountMsg, local, objStore, isGroupCollapsed } from "~/store"
import { useSelectWithMouse } from "./helper"
import { useT } from "~/hooks"
import { GroupHeader } from "./GroupHeader"
import { useSections } from "./group"

const GridLayout = () => {
  const { isMouseSupported, registerSelectContainer, captureContentMenu } =
    useSelectWithMouse()
  registerSelectContainer()
  const t = useT()
  const sections = useSections()
  const gridTemplate = `repeat(auto-fill, minmax(${
    parseInt(local["grid_item_size"]) + 20
  }px,1fr))`
  return (
    <>
      <Show when={local["show_count_msg"] === "visible"}>
        <Box w="100%" textAlign="left" pl="$2">
          <Text size="sm" color="$neutral11">
            {smartCountMsg()}
          </Text>
        </Box>
      </Show>
      <For each={sections()}>
        {(s) => (
          <>
            <Show when={s.labelKey}>
              <GroupHeader
                label={t(s.labelKey!)}
                count={s.items.length}
                groupKey={s.key!}
              />
            </Show>
            {/* Toggle visibility with CSS instead of unmounting, so
                collapsing/expanding never re-mounts items (avoids replaying
                each item's enter animation and reloading thumbnails). */}
            <Box
              w="$full"
              style={{
                display:
                  s.labelKey && isGroupCollapsed(s.key!) ? "none" : "block",
              }}
            >
              <Grid
                oncapture:contextmenu={captureContentMenu}
                class="viselect-container"
                w="$full"
                gap="$1"
                templateColumns={gridTemplate}
              >
                <For each={s.items}>
                  {(it) => {
                    return <GridItem obj={it.obj} index={it.index} />
                  }}
                </For>
              </Grid>
            </Box>
          </>
        )}
      </For>
    </>
  )
}

export default GridLayout
