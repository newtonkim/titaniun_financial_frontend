<script setup lang="ts">
import { computed } from 'vue'
import { notificationTime, presentNotification } from '../presentation'
import type { StaffNotification } from '../types'

/** One piece of waiting work, linking to where it gets done. */
const props = defineProps<{ item: StaffNotification }>()
defineEmits<{ open: [] }>()

const shown = computed(() => presentNotification(props.item))
</script>

<template>
  <RouterLink :to="shown.to" class="flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:bg-muted" @click="$emit('open')">
    <span class="flex size-10 shrink-0 items-center justify-center rounded-lg" :class="shown.toneClass"><component :is="shown.icon" :size="18" aria-hidden="true" /></span>
    <span class="min-w-0 flex-1">
      <span class="flex items-baseline gap-3">
        <span class="min-w-0 flex-1 truncate text-sm text-foreground" :class="item.is_unread ? 'font-semibold' : 'font-medium'">{{ shown.title }}</span>
        <span class="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">{{ notificationTime(item) }}</span>
      </span>
      <span class="flex items-center gap-3">
        <span class="min-w-0 flex-1 truncate text-sm text-muted-foreground">{{ shown.subject }}</span>
        <span v-if="shown.amount" data-amount class="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-foreground">{{ shown.amount }}</span>
        <span v-if="item.is_unread" class="size-2 shrink-0 rounded-full bg-brand"><span class="sr-only">Unread</span></span>
      </span>
    </span>
  </RouterLink>
</template>
