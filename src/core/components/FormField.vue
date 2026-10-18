<script setup lang="ts">
defineProps<{ label: string; error?: string }>()
</script>

<template>
  <label class="field" :class="{ 'field--invalid': error }">
    <span class="field__label">{{ label }}</span>
    <slot />
    <span v-if="error" class="field__error">{{ error }}</span>
  </label>
</template>
