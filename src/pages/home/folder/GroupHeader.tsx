import { HStack, Text, IconButton } from "@hope-ui/solid"
import { FiChevronDown, FiChevronRight } from "solid-icons/fi"
import { useT } from "~/hooks"
import { isGroupCollapsed, toggleGroupCollapsed } from "~/store"

export const GroupHeader = (props: {
  label: string
  count: number
  groupKey: string
}) => {
  const t = useT()
  const collapsed = () => isGroupCollapsed(props.groupKey)
  return (
    <HStack
      class="group-header"
      w="$full"
      px="$2"
      py="$1"
      spacing="$2"
      borderBottom="1px solid $neutral6"
      cursor="pointer"
      userSelect="none"
      _hover={{ bgColor: "$neutral3" }}
      onClick={() => toggleGroupCollapsed(props.groupKey)}
    >
      <IconButton
        aria-label={
          collapsed() ? t("home.toolbar.expand") : t("home.toolbar.collapse")
        }
        size="xs"
        variant="ghost"
        colorScheme="neutral"
        icon={collapsed() ? <FiChevronRight /> : <FiChevronDown />}
        onClick={(e: MouseEvent) => {
          e.stopPropagation()
          toggleGroupCollapsed(props.groupKey)
        }}
      />
      <Text fontWeight="bold" fontSize="$sm" color="$neutral12">
        {props.label}
      </Text>
      <Text fontSize="$xs" color="$neutral10">
        {props.count}
      </Text>
    </HStack>
  )
}
