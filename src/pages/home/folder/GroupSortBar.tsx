import { Button, HStack, Box, Tooltip } from "@hope-ui/solid"
import { createSignal, Show } from "solid-js"
import {
  FiLayers,
  FiArrowUp,
  FiArrowDown,
  FiChevronsDown,
  FiChevronsUp,
} from "solid-icons/fi"
import { useT } from "~/hooks"
import {
  groupByType,
  sortObjs,
  toggleGroupByType,
  isGroupCollapsed,
  setGroupsCollapsed,
} from "~/store"
import { useSections, type GroupKey } from "./group"

const GroupSortBar = () => {
  const t = useT()
  const [reverse, setReverse] = createSignal(false)
  const sections = useSections()

  const toggleSort = () => {
    const next = !reverse()
    setReverse(next)
    sortObjs("name", next)
  }

  const groupKeys = (): GroupKey[] =>
    sections()
      .map((s) => s.key)
      .filter((k): k is GroupKey => k !== undefined)
  const allCollapsed = () => {
    const keys = groupKeys()
    return keys.length > 0 && keys.every((k) => isGroupCollapsed(k))
  }
  const toggleAll = () => setGroupsCollapsed(groupKeys(), !allCollapsed())

  return (
    <HStack
      class="group-sort-bar"
      w="$full"
      px="$2"
      py="$1"
      spacing="$2"
      alignItems="center"
      borderBottom="1px solid $neutral4"
    >
      <Tooltip
        label={
          groupByType()
            ? t("home.toolbar.group_on")
            : t("home.toolbar.group_off")
        }
      >
        <Button
          size="sm"
          variant={groupByType() ? "solid" : "outline"}
          colorScheme="accent"
          leftIcon={<FiLayers />}
          onClick={toggleGroupByType}
        >
          {groupByType()
            ? t("home.toolbar.group_on")
            : t("home.toolbar.group_off")}
        </Button>
      </Tooltip>

      <Button
        size="sm"
        variant="outline"
        colorScheme="neutral"
        leftIcon={
          <Box
            display="flex"
            alignItems="center"
            style={{ transition: "transform 0.18s ease" }}
          >
            {reverse() ? <FiArrowDown /> : <FiArrowUp />}
          </Box>
        }
        onClick={toggleSort}
      >
        {t("home.toolbar.sort_name")}
      </Button>

      {/* One-click collapse/expand all groups (only when grouping is on). */}
      <Show when={groupByType() && groupKeys().length > 0}>
        <Box flex="1" />
        <Tooltip
          label={
            allCollapsed()
              ? t("home.toolbar.expand_all")
              : t("home.toolbar.collapse_all")
          }
        >
          <Button
            size="sm"
            variant="ghost"
            colorScheme="neutral"
            leftIcon={allCollapsed() ? <FiChevronsDown /> : <FiChevronsUp />}
            onClick={toggleAll}
          >
            {allCollapsed()
              ? t("home.toolbar.expand_all")
              : t("home.toolbar.collapse_all")}
          </Button>
        </Tooltip>
      </Show>
    </HStack>
  )
}

export default GroupSortBar
