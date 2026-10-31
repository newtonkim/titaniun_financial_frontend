<script setup lang="ts">
import { Input } from '@/core/components/ui/input'

const from = defineModel<string | undefined>('from', { required: true })
const to = defineModel<string | undefined>('to', { required: true })
</script>

<template>
  <Input v-model="from" type="date" aria-label="From date" class="h-8 w-[9.5rem] text-sm" />
  <span class="hidden text-sm text-muted-foreground sm:inline">to</span>
  <Input v-model="to" type="date" aria-label="To date" class="h-8 w-[9.5rem] text-sm" />
</template>
