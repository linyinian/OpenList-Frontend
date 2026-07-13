import { HStack, Text } from "@hope-ui/solid"

export const GroupHeader = (props: { label: string; count: number }) => (
  <HStack
    class="group-header"
    w="$full"
    px="$2"
    py="$1"
    spacing="$2"
    borderBottom="1px solid $neutral6"
  >
    <Text fontWeight="bold" fontSize="$sm" color="$neutral12">
      {props.label}
    </Text>
    <Text fontSize="$xs" color="$neutral10">
      {props.count}
    </Text>
  </HStack>
)
