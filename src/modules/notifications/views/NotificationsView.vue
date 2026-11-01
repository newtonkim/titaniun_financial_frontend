<script setup lang="ts">
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { Skeleton } from '@/core/components/ui/skeleton'
import { CircleCheck } from 'lucide-vue-next'
import NotificationRow from '../components/NotificationRow.vue'
import { useNotifications } from '../composables/useNotifications'

/** Everything waiting on the signed-in user. The bell in the top bar keeps this list current. */
const { items, unreadCount, loaded, failed, refresh, markAllRead } = useNotifications()
</script>

<template>
  <div class="tw-scope flex flex-col gap-6">
    <PageHeader title="Notifications" description="Work waiting on you, newest first. Each item clears once the work is done.">
      <Button v-if="unreadCount" variant="outline" size="sm" @click="markAllRead">Mark all as read</Button>
    </PageHeader>

    <div class="overflow-hidden rounded-lg border border-border bg-background">
      <div v-if="!loaded && !failed" class="divide-y divide-border" role="status" aria-label="Loading notifications">
        <div v-for="row in 5" :key="row" class="flex items-center gap-3 px-4 py-3">
          <Skeleton class="size-10 shrink-0 rounded-lg" />
          <div class="flex-1 space-y-2"><Skeleton class="h-3.5 w-1/3" /><Skeleton class="h-3.5 w-1/4" /></div>
        </div>
      </div>

      <div v-else-if="failed && !items.length" class="px-6 py-16 text-center" role="alert">
        <p class="text-sm font-medium text-foreground">Notifications could not be loaded.</p>
        <Button class="mt-3" variant="outline" size="sm" @click="refresh">Try again</Button>
      </div>

      <div v-else-if="!items.length" class="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
        <CircleCheck :size="22" class="text-success" aria-hidden="true" />
        <p class="text-sm font-medium text-foreground">You're all caught up</p>
        <p class="text-sm text-muted-foreground">Approvals and overdue loans will appear here.</p>
      </div>

      <ul v-else class="divide-y divide-border">
        <li v-for="item in items" :key="item.id"><NotificationRow :item="item" /></li>
      </ul>
    </div>
  </div>
</template>
