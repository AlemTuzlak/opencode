// The header's directory picker: the server's home directory first, then known projects by recent activity.
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { Menu } from "@opencode/ui/menu"
import { ProjectAvatar, getProjectAvatarSource, getProjectAvatarVariant } from "@opencode/ui/project-avatar"
import { For, Show, createMemo } from "solid-js"
import { useServer } from "./connection"
import { basename } from "./format"

// Agents and tests create throwaway projects under the system temporary directories.
const temporary = ["/private/var/folders/", "/var/folders/", "/private/tmp/", "/tmp/"]

export function ProjectPicker(props: { directory?: string; home?: string; onSelect: (directory: string) => void }) {
  const server = useServer()
  const entries = createMemo(() => {
    const home = props.home
    // Already sorted by recent activity; a path can belong to several projects, so keep its most recent one.
    const projects = server.data.project
      .list()
      .filter((item) => item.canonical !== home && !temporary.some((prefix) => item.canonical.startsWith(prefix)))
    const unique = projects
      .filter((item, index) => projects.findIndex((other) => other.canonical === item.canonical) === index)
      .map((item) => ({
        directory: item.canonical,
        name: item.name || basename(item.canonical),
        path: home && item.canonical.startsWith(`${home}/`) ? `~${item.canonical.slice(home.length)}` : item.canonical,
        avatar: getProjectAvatarSource(item.id, item.icon),
        variant: getProjectAvatarVariant(item.icon?.color),
      }))
    if (!home) return unique
    return [
      { directory: home, name: "Home", path: "~", avatar: undefined, variant: getProjectAvatarVariant() },
      ...unique,
    ]
  })
  const selected = createMemo(() => entries().find((item) => item.directory === props.directory))
  const label = () => selected()?.name ?? (props.directory ? basename(props.directory) : "Loading…")

  return (
    <div class="min-w-0 flex-1">
      <Menu gutter={4} placement="bottom-start" modal={false}>
        <Menu.Trigger
          as={Button}
          variant="ghost"
          size="normal"
          class="max-w-full justify-start gap-2 ![font-weight:530]"
          disabled={!props.directory}
        >
          <ProjectAvatar fallback={label()} src={selected()?.avatar} variant={selected()?.variant} />
          <span class="truncate">{label()}</span>
          <Icon name="chevron-down" size="small" class="-ms-0.5 shrink-0 text-v2-icon-icon-muted" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content class="w-[min(320px,calc(100vw-16px))]">
            <Menu.Group>
              <Menu.GroupLabel>Directory</Menu.GroupLabel>
              <div class="-mx-0.5 max-h-[min(392px,calc(100vh-300px))] overflow-y-auto overscroll-contain px-0.5">
                <Menu.RadioGroup value={props.directory} onChange={props.onSelect}>
                  <For each={entries()}>
                    {(item) => (
                      <Menu.RadioItem
                        value={item.directory}
                        closeOnSelect
                        class="!h-11 !gap-2.5 !pe-2.5 !ps-2.5"
                        title={item.directory}
                      >
                        <ProjectAvatar
                          fallback={item.name}
                          src={item.avatar}
                          variant={item.variant}
                          class="!size-5 [&_[data-slot=project-avatar-surface]]:rounded-[5px] [&_[data-slot=project-avatar-surface]]:text-[11px]"
                        />
                        <span class="flex min-w-0 flex-1 flex-col">
                          <span class="truncate text-[13px] font-[530] leading-[18px] tracking-[-0.04px] text-v2-text-text-base">
                            {item.name}
                          </span>
                          <span class="truncate text-[12px] font-[440] leading-4 text-v2-text-text-faint">
                            {item.path}
                          </span>
                        </span>
                      </Menu.RadioItem>
                    )}
                  </For>
                </Menu.RadioGroup>
              </div>
            </Menu.Group>
            <ServerMenu />
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    </div>
  )
}

/**
 * The saved opencode servers, for the end of a header menu: switch, reconnect, add, forget. Switching starts over
 * on the other server, since conversations and directories belong to one server.
 */
export function ServerMenu() {
  const server = useServer()
  return (
    <>
      <Menu.Separator />
      <Menu.Group>
        <Menu.GroupLabel>Server</Menu.GroupLabel>
        <Menu.RadioGroup value={server.info.id} onChange={(id) => server.background.send({ type: "servers.use", id })}>
          <For each={server.background.state.servers}>
            {(item) => (
              <Menu.RadioItem value={item.id} closeOnSelect class="!h-11 !gap-2.5 !pe-2.5 !ps-2.5" title={item.url}>
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="truncate text-[13px] font-[530] leading-[18px] tracking-[-0.04px] text-v2-text-text-base">
                    {item.name}
                  </span>
                  <span class="truncate text-[12px] font-[440] leading-4 text-v2-text-text-faint">{item.url}</span>
                </span>
              </Menu.RadioItem>
            )}
          </For>
        </Menu.RadioGroup>
        <Menu.Item onSelect={() => server.background.send({ type: "service.refresh" })}>Reconnect</Menu.Item>
        <Menu.Item onSelect={() => void chrome.tabs.create({ url: chrome.runtime.getURL("connect.html") })}>
          Add a server…
        </Menu.Item>
        <Show when={server.background.state.servers.length > 1}>
          <Menu.Item onSelect={() => server.background.send({ type: "servers.remove", id: server.info.id })}>
            Forget {server.info.name}
          </Menu.Item>
        </Show>
      </Menu.Group>
    </>
  )
}
