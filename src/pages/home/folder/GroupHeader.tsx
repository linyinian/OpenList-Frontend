import { HStack, Text, Badge, Box } from "@hope-ui/solid"
import {
  FiChevronDown,
  FiFolder,
  FiImage,
  FiFilm,
  FiMusic,
  FiFileText,
  FiFile,
} from "solid-icons/fi"
import { JSXElement } from "solid-js"
import { useT } from "~/hooks"
import { isGroupCollapsed, toggleGroupCollapsed } from "~/store"

// Per-type icon + accent color, so each group is instantly recognizable.
const GROUP_STYLE: Record<string, { icon: () => JSXElement; color: string }> = {
  folder: { icon: () => <FiFolder />, color: "#3b82f6" },
  image: { icon: () => <FiImage />, color: "#10b981" },
  video: { icon: () => <FiFilm />, color: "#8b5cf6" },
  audio: { icon: () => <FiMusic />, color: "#f59e0b" },
  text: { icon: () => <FiFileText />, color: "#0ea5e9" },
  other: { icon: () => <FiFile />, color: "#6b7280" },
}

export const GroupHeader = (props: {
  label: string
  count: number
  groupKey: string
}) => {
  const t = useT()
  const collapsed = () => isGroupCollapsed(props.groupKey)
  const style = () => GROUP_STYLE[props.groupKey] ?? GROUP_STYLE.other
  return (
    <HStack
      class="group-header"
      role="button"
      aria-expanded={!collapsed()}
      aria-label={
        collapsed() ? t("home.toolbar.expand") : t("home.toolbar.collapse")
      }
      w="$full"
      px="$2"
      py="$1_5"
      spacing="$2"
      borderBottom="1px solid $neutral5"
      cursor="pointer"
      userSelect="none"
      transition="background-color 0.15s ease"
      _hover={{ bgColor: "$neutral3" }}
      onClick={() => toggleGroupCollapsed(props.groupKey)}
    >
      {/* Rotating chevron: down when expanded, right (-90deg) when collapsed. */}
      <Box
        display="flex"
        alignItems="center"
        color="$neutral10"
        fontSize="16px"
        style={{
          transform: collapsed() ? "rotate(-90deg)" : "rotate(0deg)",
          transition: "transform 0.18s ease",
        }}
      >
        <FiChevronDown />
      </Box>
      {/* Colored type icon */}
      <Box
        display="flex"
        alignItems="center"
        color={style().color}
        fontSize="16px"
      >
        {style().icon()}
      </Box>
      <Text fontWeight="$semibold" fontSize="$sm" color="$neutral12">
        {props.label}
      </Text>
      <Badge
        colorScheme="neutral"
        variant="subtle"
        borderRadius="$full"
        fontSize="$xs"
        px="$2"
      >
        {props.count}
      </Badge>
    </HStack>
  )
}
