<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <div class="settings">
    <header class="settings__header">
      <h1 class="settings__title">{{ title }}</h1>
      <p class="settings__lede">{{ description }}</p>
    </header>
    <section class="panel settings__panel"><slot /></section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 44rem;
}

.settings__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 2.25rem;
  font-weight: 400;
  line-height: 1.1;
}

.settings__lede {
  margin: 0.35rem 0 0;
  color: var(--muted);
}

.settings__panel {
  padding: 1.75rem;
}

.settings__panel :deep(form) {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings__panel :deep(input) {
  height: 2.9rem;
  padding-inline: 0.9rem;
  border-radius: 10px;
}

.settings__panel :deep(.form-actions) {
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  padding-top: 0.5rem;
}

.settings__panel :deep(.form-actions .btn--primary) {
  height: 2.75rem;
  padding-inline: 1.25rem;
  border-radius: 10px;
  font-weight: 600;
}

.settings__panel :deep(.saved) {
  color: var(--success);
  font-weight: 500;
}
</style>
