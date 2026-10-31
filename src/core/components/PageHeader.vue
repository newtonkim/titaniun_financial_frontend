<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <header class="page-head !mb-0">
    <div>
      <h1 class="page-head__title">{{ title }}</h1>
      <p v-if="description" class="page-head__lede">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="page-head__actions"><slot /></div>
  </header>
</template>
