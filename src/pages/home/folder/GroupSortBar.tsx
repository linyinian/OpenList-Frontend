import { Button, HStack } from "@hope-ui/solid"
import { createSignal } from "solid-js"
import { useT } from "~/hooks"
import { groupByType, sortObjs, toggleGroupByType } from "~/store"

const GroupSortBar = () => {
  const t = useT()
  const [reverse, setReverse] = createSignal(false)

  const toggleSort = () => {
    const next = !reverse()
    setReverse(next)
    sortObjs("name", next)
  }

  return (
    <HStack
      class="group-sort-bar"
      w="$full"
      p="$1"
      spacing="$2"
      alignItems="center"
    >
      <Button
        size="sm"
        variant={groupByType() ? "solid" : "outline"}
        onClick={toggleGroupByType}
      >
        {groupByType()
          ? t("home.toolbar.group_on")
          : t("home.toolbar.group_off")}
      </Button>
      <Button size="sm" variant="outline" onClick={toggleSort}>
        {t("home.toolbar.sort_name")} {reverse() ? "↓" : "↑"}
      </Button>
    </HStack>
  )
}

export default GroupSortBar
