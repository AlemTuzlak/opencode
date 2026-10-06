export * as AgentGroups from "./agent-groups"

// Agent tab groups stay out of the way: collapsed from the moment they exist, expanded only when the user needs
// them. Chrome expands a group by itself when one of its tabs becomes active (the agent focuses a tab, or the
// user picks it), and collapsing a group that holds the active tab would switch the user to another tab, so a
// group collapses as soon as its window's active tab is elsewhere. `expand` opens one when an agent hands a step
// to the user.

const STORAGE_KEY = "agentGroups"
const groups = new Set<number>()
let restored: Promise<void> | undefined
/** Tabs that keep their group open, for example while a handoff waits for the user. */
const keepers: ((tabId: number) => boolean)[] = []

export function keepOpenWhile(check: (tabId: number) => boolean) {
  keepers.push(check)
}

async function needed(groupId: number) {
  if (!keepers.length) return false
  const tabs = await chrome.tabs.query({ groupId }).catch(() => [])
  return tabs.some((tab) => tab.id !== undefined && keepers.some((check) => check(tab.id!)))
}

/** Registers a group an agent owns and collapses it unless the user is on one of its tabs. */
export async function adopt(groupId: number) {
  await restore()
  if (!groups.has(groupId)) {
    groups.add(groupId)
    save()
  }
  await collapseUnlessActive(groupId)
}

/** Opens a group so the user sees its tabs, for example when an agent waits for them on one. */
export async function expand(groupId: number) {
  await chrome.tabGroups.update(groupId, { collapsed: false }).catch(() => undefined)
}

/** Expands the agent group holding a tab, if any. */
export async function expandTab(tabId: number) {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined)
  if (tab && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && groups.has(tab.groupId)) await expand(tab.groupId)
}

/** Folds the agent group holding a tab back up once it's no longer needed (unless the user is on it). */
export async function settleTab(tabId: number) {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined)
  if (tab && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && groups.has(tab.groupId)) await collapseUnlessActive(tab.groupId)
}

async function collapseUnlessActive(groupId: number) {
  const group = await chrome.tabGroups.get(groupId).catch(() => undefined)
  if (!group) {
    forget(groupId)
    return
  }
  if (group.collapsed) return
  const [active] = await chrome.tabs.query({ active: true, windowId: group.windowId })
  if (active?.groupId === groupId || (await needed(groupId))) return
  await chrome.tabGroups.update(groupId, { collapsed: true }).catch(() => undefined)
}

function forget(groupId: number) {
  if (groups.delete(groupId)) save()
}

function restore() {
  restored ??= chrome.storage.session.get(STORAGE_KEY).then((stored) => {
    for (const id of (stored[STORAGE_KEY] ?? []) as number[]) groups.add(id)
  })
  return restored
}

function save() {
  void chrome.storage.session.set({ [STORAGE_KEY]: Array.from(groups) }).catch(() => undefined)
}

// The user moved to another tab: fold away every agent group in that window that doesn't hold it.
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void restore().then(async () => {
    const tab = await chrome.tabs.get(tabId).catch(() => undefined)
    for (const groupId of groups) {
      if (tab?.groupId === groupId) continue
      const group = await chrome.tabGroups.get(groupId).catch(() => undefined)
      if (!group) forget(groupId)
      else if (group.windowId === windowId && !group.collapsed && !(await needed(groupId)))
        await chrome.tabGroups.update(groupId, { collapsed: true }).catch(() => undefined)
    }
  })
})
chrome.tabGroups.onRemoved.addListener((group) => forget(group.id))
void restore()
