import { createSignal } from "solid-js"

/**
 * 侧边栏收藏（类似 Windows 资源管理器的「快速访问」固定项）
 * 只存最小信息：显示名 + 完整路径。持久化到 localStorage。
 */
export interface FavoriteItem {
  /** 显示名（默认取路径最后一段） */
  name: string
  /** 完整路径，以 / 开头，如 /139云盘/照片 */
  path: string
}

const STORAGE_KEY = "sidebar_favorites"

const fallbackName = (path: string) => {
  const seg = path.split("/").filter(Boolean).pop()
  return seg || path
}

const parse = (raw: string | null): FavoriteItem[] => {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const seen = new Set<string>()
    const list: FavoriteItem[] = []
    for (const it of data) {
      if (!it || typeof it.path !== "string" || !it.path) continue
      const path = it.path.startsWith("/") ? it.path : `/${it.path}`
      if (seen.has(path)) continue
      seen.add(path)
      list.push({
        name:
          typeof it.name === "string" && it.name ? it.name : fallbackName(path),
        path,
      })
    }
    return list
  } catch (e) {
    console.error("parse sidebar favorites failed", e)
    return []
  }
}

const [favorites, setFavorites] = createSignal<FavoriteItem[]>(
  parse(localStorage.getItem(STORAGE_KEY)),
)

const persist = (next: FavoriteItem[]) => {
  setFavorites(next)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (e) {
    console.error("persist sidebar favorites failed", e)
  }
}

export const isFavorite = (path: string) =>
  favorites().some((it) => it.path === path)

/** 加入收藏；已存在则返回 false（不重复添加） */
export const addFavorite = (item: FavoriteItem) => {
  if (!item?.path) return false
  const path = item.path.startsWith("/") ? item.path : `/${item.path}`
  if (isFavorite(path)) return false
  persist([
    ...favorites(),
    { name: item.name || fallbackName(path), path },
  ])
  return true
}

/** 移出收藏；不存在则返回 false */
export const removeFavorite = (path: string) => {
  const next = favorites().filter((it) => it.path !== path)
  if (next.length === favorites().length) return false
  persist(next)
  return true
}

export const clearFavorites = () => persist([])

export { favorites }
