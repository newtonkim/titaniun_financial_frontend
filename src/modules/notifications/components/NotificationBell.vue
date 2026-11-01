<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Bell, CircleCheck, X } from 'lucide-vue-next'
import { Skeleton } from '@/core/components/ui/skeleton'
import { useNotifications } from '../composables/useNotifications'
import NotificationRow from './NotificationRow.vue'

/** The bell in the top bar and its panel of the latest waiting work. */
const PANEL_ROWS = 6

const route = useRoute()
const { items, unreadCount, loaded, failed, refresh, markAllRead, start, stop } = useNotifications()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

const latest = computed(() => items.value.slice(0, PANEL_ROWS))
const badge = computed(() => (unreadCount.value > 99 ? '99+' : String(unreadCount.value)))
const triggerLabel = computed(() => (unreadCount.value ? `Notifications, ${unreadCount.value} unread` : 'Notifications'))

function toggle(): void {
  open.value = !open.value
  if (open.value) void refresh()
}

function close(): void {
  open.value = false
}

function onDocumentClick(event: MouseEvent): void {
  if (!root.value?.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    close()
    trigger.value?.focus()
  }
}

/** Work done on one page should clear from the bell without waiting for the next refresh. */
watch(() => route.fullPath, () => void refresh())

onMounted(() => {
  start()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  stop()
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="tw-scope relative">
    <button
      ref="trigger"
      type="button"
      class="relative inline-grid size-[2.4rem] cursor-pointer place-items-center rounded-[10px] border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :aria-label="triggerLabel"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="toggle"
    >
      <Bell :size="18" aria-hidden="true" />
      <span v-if="unreadCount" class="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold leading-none tabular-nums text-white ring-2 ring-background" aria-hidden="true">{{ badge }}</span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
      enter-from-class="-translate-y-1 opacity-0"
      leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
      leave-to-class="opacity-0"
    >
      <section
        v-if="open"
        role="dialog"
        aria-labelledby="notifications-title"
        class="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[26rem] overflow-hidden rounded-xl border border-border bg-background shadow-[0_12px_32px_rgb(16_24_40/0.12)] max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.5rem] max-sm:w-auto"
      >
        <header class="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 id="notifications-title" class="text-section text-heading">Notifications</h2>
          <button v-if="unreadCount" type="button" class="ml-auto cursor-pointer rounded text-sm font-medium text-primary hover:underline dark:text-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" @click="markAllRead">Mark all as read</button>
          <button type="button" aria-label="Close notifications" class="grid size-7 cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :class="{ 'ml-auto': !unreadCount }" @click="close"><X :size="15" aria-hidden="true" /></button>
        </header>

        <div v-if="!loaded && !failed" class="divide-y divide-border" role="status" aria-label="Loading notifications">
          <div v-for="row in 3" :key="row" class="flex items-center gap-3 px-4 py-3">
            <Skeleton class="size-10 shrink-0 rounded-lg" />
            <div class="flex-1 space-y-2"><Skeleton class="h-3.5 w-2/3" /><Skeleton class="h-3.5 w-1/2" /></div>
          </div>
        </div>

        <div v-else-if="failed && !items.length" class="px-6 py-10 text-center" role="alert">
          <p class="text-sm font-medium text-foreground">Notifications could not be loaded.</p>
          <button type="button" class="mt-2 cursor-pointer rounded text-sm font-medium text-primary hover:underline dark:text-[var(--primary-hover)]" @click="refresh">Try again</button>
        </div>

        <div v-else-if="!items.length" class="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
          <CircleCheck :size="22" class="text-success" aria-hidden="true" />
          <p class="text-sm font-medium text-foreground">You're all caught up</p>
          <p class="text-sm text-muted-foreground">Approvals and overdue loans will appear here.</p>
        </div>

        <template v-else>
          <ul class="divide-y divide-border">
            <li v-for="item in latest" :key="item.id"><NotificationRow :item="item" @open="close" /></li>
          </ul>
          <RouterLink :to="{ name: 'notifications.index' }" class="block border-t border-border px-4 py-3 text-center text-sm font-semibold text-primary outline-none dark:text-[var(--primary-hover)] transition-colors hover:bg-muted focus-visible:bg-muted" @click="close">
            View all notifications<template v-if="items.length > PANEL_ROWS"> ({{ items.length }})</template>
          </RouterLink>
        </template>
      </section>
    </Transition>
  </div>
</template>
