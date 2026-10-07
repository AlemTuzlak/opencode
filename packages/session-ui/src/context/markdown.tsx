import { createContext, useContext, type ParentProps } from "solid-js"

export type ReadMarkdownImage = (path: string, signal: AbortSignal) => Promise<Blob | undefined>

/** Open a local file path linked from markdown. The path is decoded and may be relative or absolute. */
export type OpenMarkdownLocalFile = (path: string) => void

/** Check whether a candidate inline-code path exists in the workspace or on disk before styling it as a link. */
export type ResolveMarkdownLocalFile = (path: string) => boolean | Promise<boolean>

const context = createContext<{
  readonly readImage?: ReadMarkdownImage
  readonly openLocalFile?: OpenMarkdownLocalFile
  readonly resolveLocalFile?: ResolveMarkdownLocalFile
  readonly openSession?: (sessionID: string) => void
}>()

export function MarkdownProvider(
  props: ParentProps<{
    readImage?: ReadMarkdownImage
    openLocalFile?: OpenMarkdownLocalFile
    resolveLocalFile?: ResolveMarkdownLocalFile
    openSession?: (id: string) => void
  }>,
) {
  const parent = useMarkdown()

  return (
    <context.Provider
      value={{
        get readImage() {
          return props.readImage
        },
        get openLocalFile() {
          return props.openLocalFile
        },
        get resolveLocalFile() {
          return props.resolveLocalFile ?? parent?.resolveLocalFile
        },
        get openSession() {
          return props.openSession ?? parent?.openSession
        },
      }}
    >
      {props.children}
    </context.Provider>
  )
}

export const useMarkdown = () => useContext(context)
