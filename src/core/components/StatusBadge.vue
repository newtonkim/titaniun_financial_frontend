<script setup lang="ts">
import { formatEnum } from '@/core/utils/format'

defineProps<{ status: string | boolean }>()
</script>

<template>
  <span v-if="typeof status === 'boolean'" class="badge" :class="status ? 'badge--active' : 'badge--inactive'">
    {{ status ? 'Active' : 'Inactive' }}
  </span>
  <span v-else class="badge" :class="`badge--${status}`">{{ formatEnum(status) }}</span>
</template>
