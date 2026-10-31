<script setup lang="ts">
/** The surface a table or report sits on, with an optional toolbar along its top edge. */
defineProps<{ label?: string }>()
</script>

<template>
  <section class="overflow-hidden rounded-lg border border-border bg-background" :aria-label="label">
    <div v-if="$slots.toolbar" class="flex flex-wrap items-center gap-2 border-b border-border p-2 [&_select]:h-8 [&_select]:rounded-md [&_select]:py-0 [&_select]:text-sm">
      <slot name="toolbar" />
    </div>
    <slot />
  </section>
</template>
