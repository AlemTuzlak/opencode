import { createContext, useContext, type Accessor } from "solid-js"
import type { Browser } from "../browser/contract"
import type { Changes } from "../review/contract"
import type { LineRange, Live, MountedSession, OpenOptions } from "../sdk"
import type { OpenApp } from "./apps"

export type TreeTab = "changes" | "all"

/** An open-in-app request in flight: the app it opens, or undefined while none is. */
export interface OpenRequest {
  app(): OpenApp | undefined
  set(app: OpenApp | undefined): void
}

/** Per-window file state that setup owns and its lazily loaded views share. */
export interface FileShared {
  readonly changes: Accessor<Live<Changes>>
  readonly browser: Accessor<Live<Browser>>
  readonly tree: {
    tab(): TreeTab
    setTab(tab: TreeTab): void
    /** The directory whose root listing the tree last refreshed. */
    directory?: string
  }
  /** The file browser's filter state and input element, shared by desktop and mobile views. */
  readonly filter: {
    element?: HTMLInputElement
    pending?: boolean
    value(): string
    set(value: string): void
    selection(): LineRange | undefined
    setSelection(selection: LineRange | undefined): void
  }
  /** Open-in-app availability checks, one per app for the window's lifetime. */
  readonly installed: Map<string, Promise<boolean>>
  /** The open-in-app choice. Desktop only. */
  readonly app?: { current(): OpenApp; set(app: OpenApp): void }
  /** The "Open in" buttons' request in flight, shared so the tab strip's and a panel header's agree across tab switches. */
  readonly request: OpenRequest
  /** The last selection of each file tab, readable before a session's file view state loads. */
  readonly handoff: {
    get(session: string, path: string): LineRange | null | undefined
    set(session: string, files: Record<string, LineRange | null>): void
  }
  /** Increments each time a link opens a file at a line range, so a shown tab scrolls back to it. */
  reveal(): { readonly session: string; readonly path: string; readonly seq: number } | undefined
  /** The tab is the session's selected side tab. */
  active(session: MountedSession, id: string): boolean
  open(session: MountedSession, path: string, options?: OpenOptions): void
}

export const FileContext = createContext<FileShared>()

export function useShared() {
  const value = useContext(FileContext)

  if (!value) throw new Error("File views render inside the file extension")

  return value
}

/** A provider's value while it is active; views that only show its data render nothing from it otherwise. */
export function current<T>(live: Live<T>) {
  return live.status === "active" ? live.value : undefined
}
