import { ObjType, StoreObj } from "~/types"
import { objStore, groupByType } from "~/store"
import { createMemo } from "solid-js"

export type GroupKey = "folder" | "image" | "video" | "audio" | "text" | "other"

// Display order of groups. Folders always come first.
export const GROUP_ORDER: GroupKey[] = [
  "folder",
  "image",
  "video",
  "audio",
  "text",
  "other",
]

export const GROUP_LABEL_KEY: Record<GroupKey, string> = {
  folder: "home.obj.group.folder",
  image: "home.obj.group.image",
  video: "home.obj.group.video",
  audio: "home.obj.group.audio",
  text: "home.obj.group.text",
  other: "home.obj.group.other",
}

export function categoryOf(obj: StoreObj): GroupKey {
  if (obj.is_dir) return "folder"
  switch (obj.type) {
    case ObjType.IMAGE:
      return "image"
    case ObjType.VIDEO:
      return "video"
    case ObjType.AUDIO:
      return "audio"
    case ObjType.TEXT:
      return "text"
    default:
      return "other"
  }
}

export interface GroupedItem {
  obj: StoreObj
  // Global index inside objStore.objs, required for selection logic.
  index: number
}

export interface Section {
  // undefined for the single flat section (grouping disabled)
  labelKey?: string
  // category key used as the collapse-state identifier
  key?: GroupKey
  items: GroupedItem[]
}

export function groupObjs(objs: StoreObj[]): Section[] {
  const buckets: Record<GroupKey, GroupedItem[]> = {
    folder: [],
    image: [],
    video: [],
    audio: [],
    text: [],
    other: [],
  }
  objs.forEach((obj, index) => {
    buckets[categoryOf(obj)].push({ obj, index })
  })
  return GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => ({
    key: k,
    labelKey: GROUP_LABEL_KEY[k],
    items: buckets[k],
  }))
}

// Reactive view of the current file list, split into renderable sections.
// When grouping is off there is a single section with no header.
export function useSections() {
  return createMemo<Section[]>(() => {
    if (!groupByType()) {
      return [
        {
          items: objStore.objs.map((obj, index) => ({ obj, index })),
        },
      ]
    }
    return groupObjs(objStore.objs)
  })
}
