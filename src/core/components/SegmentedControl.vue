<script setup lang="ts" generic="V extends string">
/** A small set of mutually exclusive options, shown side by side. */
defineProps<{ options: { label: string; value: V }[]; label: string }>()
const model = defineModel<V>({ required: true })
</script>

<template>
  <div class="flex rounded-md bg-muted p-0.5" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      class="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
