<script setup lang="ts">
/** One titled block on the dashboard. */
defineProps<{ title: string; lede?: string }>()
</script>

<template>
  <section class="flex min-w-0 flex-col rounded-lg border border-border bg-background">
    <header class="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-3 py-2">
      <div class="min-w-0">
        <h2 class="text-section text-heading">{{ title }}</h2>
        <p v-if="lede" class="text-xs text-muted-foreground">{{ lede }}</p>
      </div>
      <slot name="tools" />
    </header>
    <div class="min-w-0 flex-1"><slot /></div>
  </section>
</template>
