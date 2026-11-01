import { computed, ref } from 'vue'
import { notificationsApi } from '../api'
import type { StaffNotification } from '../types'

const REFRESH_EVERY_MS = 120_000

const items = ref<StaffNotification[]>([])
const unreadCount = ref(0)
const loaded = ref(false)
const failed = ref(false)
let timer: number | undefined

async function refresh(): Promise<void> {
  try {
    const feed = await notificationsApi.list()
    items.value = feed.data
    unreadCount.value = feed.unread_count
    loaded.value = true
    failed.value = false
  } catch {
    failed.value = true
  }
}

async function markAllRead(): Promise<void> {
  items.value = items.value.map((item) => ({ ...item, is_unread: false }))
  unreadCount.value = 0
  try {
    await notificationsApi.markAllRead()
  } catch {
    await refresh()
  }
}

/** Keeps the list current while the app is open; a hidden tab does not ask the server for anything. */
function start(): void {
  void refresh()
  timer = window.setInterval(() => {
    if (!document.hidden) void refresh()
  }, REFRESH_EVERY_MS)
}

/** Stops refreshing and forgets the list, so the next person to sign in never sees it. */
function stop(): void {
  window.clearInterval(timer)
  items.value = []
  unreadCount.value = 0
  loaded.value = false
  failed.value = false
}

export function useNotifications() {
  return {
    items: computed(() => items.value),
    unreadCount: computed(() => unreadCount.value),
    loaded: computed(() => loaded.value),
    failed: computed(() => failed.value),
    refresh,
    markAllRead,
    start,
    stop,
  }
}
