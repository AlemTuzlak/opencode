// connect.html: pairs this browser with an opencode server. `npx opencode-browser-cli install` (or `connect`)
// opens it as connect.html#server=<url>&code=<one-time code>; the code is redeemed for a session token that the
// background keeps (see background/servers.ts). Opened without a code (the panel's "Add a server…"), it is a form.
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { Logo } from "@opencode/ui/logo"
import { Spinner } from "@opencode/ui/spinner"
import { ThemeProvider } from "@opencode/ui/theme/context"
import { Match, Switch, createSignal, onMount, type JSX } from "solid-js"
import { CONNECT_REQUEST, type ConnectRequest, type ConnectResponse } from "../shared/protocol"
import { CONNECT_COMMAND, CommandBlock, ConnectForm, sentence } from "../sidepanel/onboarding"

type Link = { server: string; code: string }
type State =
  | { status: "form" }
  | { status: "confirm"; link: Link }
  | { status: "connecting"; link: Link }
  | { status: "connected"; name: string }
  | { status: "failed"; message: string }

export function Connect() {
  return (
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  )
}

function Page() {
  const link = readLink()
  // The code is single use; keep it out of the address bar (and this tab's history entry) once read.
  if (link) history.replaceState(null, "", location.pathname)
  const [state, setState] = createSignal<State>(
    !link ? { status: "form" } : loopback(link.server) ? { status: "connecting", link } : { status: "confirm", link },
  )
  // sidePanel.open must run inside the click, so the window is known before then.
  const [windowID, setWindowID] = createSignal<number>()
  onMount(() => void chrome.tabs.getCurrent().then((tab) => setWindowID(tab?.windowId)))

  const pair = async (value: Link) => {
    setState({ status: "connecting", link: value })
    const response: ConnectResponse | undefined = await chrome.runtime
      .sendMessage({ action: CONNECT_REQUEST, url: value.server, secret: value.code } satisfies ConnectRequest)
      .catch((error: unknown) => ({ ok: false as const, message: String(error) }))
    setState(
      response?.ok
        ? { status: "connected", name: response.name }
        : { status: "failed", message: response?.message ?? "The extension did not answer." },
    )
  }
  // A link to this computer's opencode pairs right away; another server asks first, so a link someone else
  // crafted can't quietly point the side panel at their server.
  onMount(() => {
    const current = state()
    if (current.status === "connecting") void pair(current.link)
  })

  const openPanel = () => {
    void chrome.sidePanel.open({ windowId: windowID() ?? chrome.windows.WINDOW_ID_CURRENT }).catch(() => undefined)
  }

  return (
    <main class="flex min-h-dvh justify-center px-5 pt-14 pb-12 sm:px-8 sm:pt-20">
      <div class="flex w-full max-w-[480px] flex-col">
        <Logo class="block aspect-[234/42] w-[124px] self-start" />
        <Switch>
          <Match when={state().status === "connecting"}>
            <Title>Connecting to opencode…</Title>
            <div class="mt-4 flex items-center gap-2 text-[14px] text-v2-text-text-muted">
              <Spinner class="size-4" />
              <span>Pairing this browser.</span>
            </div>
          </Match>
          <Match when={stateOf(state(), "confirm")}>
            {(current) => (
              <>
                <Title>Connect to this opencode server?</Title>
                <Body>
                  The side panel will chat with opencode at{" "}
                  <span class="text-v2-text-text-base">{host(current().link.server)}</span>. Only continue if you ran
                  the connect command for this server.
                </Body>
                <div class="mt-5 flex gap-2">
                  <Button variant="neutral" size="normal" onClick={() => void pair(current().link)}>
                    Connect
                  </Button>
                  <Button variant="ghost-muted" size="normal" onClick={() => window.close()}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </Match>
          <Match when={stateOf(state(), "connected")}>
            {(current) => (
              <>
                <Title>
                  <span class="inline-flex items-center gap-2">
                    <Icon name="check" class="text-v2-state-fg-success" />
                    Connected
                  </span>
                </Title>
                <Body>
                  OpenCode Browser now uses opencode on <span class="text-v2-text-text-base">{current().name}</span>.
                  Open the side panel to start chatting; you can close this tab.
                </Body>
                <div class="mt-5 flex gap-2">
                  <Button variant="neutral" size="normal" onClick={openPanel}>
                    Open side panel
                  </Button>
                  <Button variant="ghost-muted" size="normal" onClick={() => window.close()}>
                    Close tab
                  </Button>
                </div>
              </>
            )}
          </Match>
          <Match when={stateOf(state(), "failed")}>
            {(current) => (
              <>
                <Title>Couldn't connect</Title>
                <Body>
                  <span class="break-words">{sentence(current().message)}</span> Run this in a terminal for a new link:
                </Body>
                <CommandBlock command={CONNECT_COMMAND} class="mt-4" />
                <Body class="mt-6">Or connect a server by hand:</Body>
                <ConnectForm class="mt-2" onConnected={(name) => setState({ status: "connected", name })} />
              </>
            )}
          </Match>
          <Match when={state().status === "form"}>
            <Title>Connect a server</Title>
            <Body>
              The easiest way is to run this on the computer running opencode. It opens this page with a one-time code:
            </Body>
            <CommandBlock command={CONNECT_COMMAND} class="mt-4" />
            <Body class="mt-6">Or enter the server and a pairing code or its password:</Body>
            <ConnectForm class="mt-2" onConnected={(name) => setState({ status: "connected", name })} />
          </Match>
        </Switch>
      </div>
    </main>
  )
}

function Title(props: { children: JSX.Element }) {
  return (
    <h1 class="mt-6 text-[22px] font-[530] leading-7 tracking-[-0.3px] text-v2-text-text-base">{props.children}</h1>
  )
}

function Body(props: { children: JSX.Element; class?: string }) {
  return <p class={`mt-1.5 text-[14px] leading-[22px] text-v2-text-text-muted ${props.class ?? ""}`}>{props.children}</p>
}

function stateOf<T extends State["status"]>(state: State, status: T) {
  return state.status === status ? (state as Extract<State, { status: T }>) : undefined
}

function readLink(): Link | undefined {
  const params = new URLSearchParams(location.hash.slice(1))
  const server = params.get("server")
  const code = params.get("code")
  if (!server || !code) return undefined
  try {
    const url = new URL(server)
    return url.protocol === "http:" || url.protocol === "https:" ? { server: url.origin, code } : undefined
  } catch {
    return undefined
  }
}

function loopback(server: string) {
  return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(server).hostname)
}

function host(url: string) {
  return new URL(url).host
}
