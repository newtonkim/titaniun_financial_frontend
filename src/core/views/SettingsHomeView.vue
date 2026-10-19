<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import AppIcon from '@/core/components/AppIcon.vue'
import { SETTINGS_SEARCH } from '@/core/settings'
import { settingsPages } from '@/modules'

/** Brand tints the tiles cycle through. */
const TONES = ['crimson', 'navy', 'blue'] as const

const search = inject(SETTINGS_SEARCH, ref(''))

const tiles = computed(() => {
  const term = search.value.trim().toLowerCase()
  return settingsPages
    .map((page, index) => ({ page, tone: TONES[index % TONES.length] }))
    .filter(({ page }) => !term || page.label.toLowerCase().includes(term) || page.description.toLowerCase().includes(term))
})
</script>

<template>
  <div class="settings-home">
    <header>
      <h2 class="settings-home__title">System settings</h2>
      <p class="settings-home__lede">Clicking a module jumps to its configuration page.</p>
    </header>

    <div class="settings-home__grid">
      <RouterLink
        v-for="{ page, tone } in tiles"
        :key="page.route.name"
        :to="{ name: page.route.name }"
        class="tile"
        :title="page.description"
      >
        <span class="tile__icon" :class="`tile__icon--${tone}`"><AppIcon :name="page.icon" :size="24" /></span>
        <span class="tile__label">{{ page.label }}</span>
      </RouterLink>
    </div>
    <p v-if="tiles.length === 0" class="settings-home__empty">No settings match “{{ search }}”.</p>
  </div>
</template>

<style scoped>
.settings-home {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 64rem;
  margin: 0 auto;
}

.settings-home__title {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: normal;
  text-transform: none;
  color: var(--heading);
}

.settings-home__lede {
  margin: 0.5rem 0 0;
  font-size: 1.125rem;
  color: var(--muted);
}

.settings-home__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  color: var(--text);
  text-align: center;
  transition: box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out);
}

.tile:hover {
  box-shadow: 0 6px 16px rgb(16 24 40 / 0.1);
  transform: translateY(-4px);
}

.tile__icon {
  display: grid;
  place-items: center;
  padding: 0.75rem;
  border-radius: 0.75rem;
}

.tile__icon--crimson {
  background: var(--crimson-soft);
  color: var(--crimson);
}

.tile__icon--navy {
  background: color-mix(in srgb, var(--navy) 10%, transparent);
  color: var(--navy);
}

.tile__icon--blue {
  background: color-mix(in srgb, #2f8ad8 12%, transparent);
  color: #2f8ad8;
}

.tile__label {
  font-size: 0.875rem;
  font-weight: 600;
}

.settings-home__empty {
  margin: 0;
  color: var(--muted);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .tile__icon--crimson {
    color: var(--primary);
  }

  :root:not([data-theme='light']) .tile__icon--navy {
    background: color-mix(in srgb, #8c9bd9 14%, transparent);
    color: #8c9bd9;
  }
}

:root[data-theme='dark'] .tile__icon--crimson {
  color: var(--primary);
}

:root[data-theme='dark'] .tile__icon--navy {
  background: color-mix(in srgb, #8c9bd9 14%, transparent);
  color: #8c9bd9;
}

@media (max-width: 1280px) {
  .settings-home__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .settings-home__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile:hover {
    transform: none;
  }
}
</style>
