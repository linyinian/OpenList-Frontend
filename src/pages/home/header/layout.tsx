import { Button, HStack } from "@hope-ui/solid"
import { BsGridFill, BsCardImage } from "solid-icons/bs"
import { FaSolidListUl } from "solid-icons/fa"
import { For } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useT } from "~/hooks"
import { LayoutType, layout, setLayout } from "~/store"

const layouts = {
  list: FaSolidListUl,
  grid: BsGridFill,
  image: BsCardImage,
} as const

export const Layout = () => {
  const t = useT()
  return (
    <HStack class="layout-switch" spacing="$1">
      {/* Keep all layout options visible instead of hiding them in a dropdown. */}
      <style>{`
        @media (max-width: 720px) {
          .layout-switch .layout-label { display: none; }
        }
      `}</style>
      <For each={Object.entries(layouts)}>
        {(item) => {
          const key = item[0] as LayoutType
          const active = () => layout() === key
          return (
            <Button
              size="sm"
              variant={active() ? "subtle" : "ghost"}
              colorScheme={active() ? "accent" : "neutral"}
              leftIcon={<Dynamic component={item[1]} />}
              aria-label={t(`home.layouts.${key}`)}
              aria-pressed={active()}
              data-layout-option={key}
              data-active={active() ? "true" : "false"}
              onClick={() => setLayout(key)}
            >
              <span class="layout-label">{t(`home.layouts.${key}`)}</span>
            </Button>
          )
        }}
      </For>
    </HStack>
  )
}
