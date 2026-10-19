<script setup lang="ts">
import AppIcon from '@/core/components/AppIcon.vue'
import type { IconName } from '@/core/components/AppIcon.vue'

defineProps<{ title: string; description: string; icon: IconName }>()
</script>

<template>
  <div class="settings">
    <header class="settings__header">
      <span class="settings__icon"><AppIcon :name="icon" /></span>
      <div>
        <h2 class="settings__title">{{ title }}</h2>
        <p class="settings__lede">{{ description }}</p>
      </div>
    </header>
    <section class="panel settings__panel"><slot /></section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 48rem;
}

.settings__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.settings__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: var(--surface-sunken);
  color: var(--primary);
}

.settings__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-transform: none;
  color: var(--heading);
}

.settings__lede {
  margin: 0.15rem 0 0;
  font-size: 0.875rem;
  color: var(--muted);
}

.settings__panel {
  padding: 1.5rem;
  border-radius: 1rem;
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
