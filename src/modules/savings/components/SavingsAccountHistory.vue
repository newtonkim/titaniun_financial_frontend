<script setup lang="ts">
import { formatDate, formatEnum, formatTime } from '@/core/utils/format'
import type { SavingsAccountEvent, SavingsAccountEventType } from '../types'

/** Who did what to the account, when and why. Entries are permanent. */
defineProps<{ events: SavingsAccountEvent[] }>()

const LABELS: Record<Exclude<SavingsAccountEventType, 'request_submitted' | 'request_rejected'>, string> = {
  marked_dormant: 'Marked dormant',
  frozen: 'Frozen',
  closed: 'Closed',
  reactivated: 'Reactivated',
  freeze_released: 'Freeze released',
}

function title(event: SavingsAccountEvent): string {
  if (event.event === 'request_submitted') return `Requested: ${formatEnum(event.request_type)}`
  if (event.event === 'request_rejected') return `Rejected: ${formatEnum(event.request_type)}`
  return LABELS[event.event]
}
</script>

<template>
  <ol v-if="events.length" class="divide-y divide-border">
    <li v-for="event in events" :key="event.id" class="flex flex-col gap-0.5 px-4 py-3 text-sm">
      <p class="font-semibold text-foreground">{{ title(event) }}</p>
      <p class="text-muted-foreground">{{ event.reason }}</p>
      <p class="text-xs text-muted-foreground">{{ event.actor }}, {{ formatDate(event.created_at) }} at {{ formatTime(event.created_at) }}</p>
    </li>
  </ol>
  <p v-else class="px-4 py-10 text-center text-sm text-muted-foreground">No status changes yet.</p>
</template>
