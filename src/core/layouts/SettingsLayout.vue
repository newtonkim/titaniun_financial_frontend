<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/core/components/AppIcon.vue'
import { SETTINGS_SEARCH } from '@/core/settings'
import { settingsPages } from '@/modules'

const route = useRoute()
const search = ref('')
const isProfile = computed(() => route.name === 'settings.profile')

provide(SETTINGS_SEARCH, search)

const visiblePages = computed(() => {
  const term = search.value.trim().toLowerCase()
  return settingsPages.filter(
    (page) => !term || page.label.toLowerCase().includes(term) || page.description.toLowerCase().includes(term),
  )
})

/** The settings entry the current page belongs to, including any page under it. */
const currentPage = computed(() => settingsPages.find(isCurrent))

function isCurrent(page: (typeof settingsPages)[number]): boolean {
  const base = `/settings/${page.route.path}`
  return route.path === base || route.path.startsWith(`${base}/`)
}
</script>

<template>
  <div class="settings">
    <RouterView v-if="isProfile" />
    <header v-if="!isProfile" class="settings__header">
      <div class="settings__heading">
        <h1 class="settings__title">Settings</h1>
        <span class="settings__divider" aria-hidden="true" />
        <nav class="settings__crumbs" aria-label="Settings breadcrumb">
          <RouterLink :to="{ name: 'settings.index' }" aria-label="Settings home"><AppIcon name="home" :size="16" /></RouterLink>
          <AppIcon name="chevron-right" :size="16" />
          <RouterLink
            :to="{ name: 'settings.index' }"
            :class="{ 'settings__crumb--current': !currentPage }"
            :aria-current="currentPage ? undefined : 'page'"
          >Settings</RouterLink>
          <template v-if="currentPage">
            <AppIcon name="chevron-right" :size="16" />
            <span class="settings__crumb--current" aria-current="page">{{ currentPage.label }}</span>
          </template>
        </nav>
      </div>
      <label class="settings__search">
        <AppIcon name="search" :size="16" />
        <input v-model="search" type="search" placeholder="Search settings..." aria-label="Search settings" />
      </label>
    </header>

    <div v-if="!isProfile" class="settings__body">
      <aside class="settings__modules" aria-label="Settings modules">
        <h2 class="settings__modules-title">Settings modules</h2>
        <nav class="settings__modules-list">
          <RouterLink
            v-for="page in visiblePages"
            :key="page.route.name"
            :to="{ name: page.route.name }"
            class="settings__module"
            :class="{ 'settings__module--active': isCurrent(page) }"
            :aria-current="isCurrent(page) ? 'page' : undefined"
          >
            <AppIcon :name="page.icon" :size="16" />
            <span>{{ page.label }}</span>
            <AppIcon v-if="isCurrent(page)" class="settings__module-chevron" name="chevron-right" :size="12" />
          </RouterLink>
          <p v-if="visiblePages.length === 0" class="settings__empty">No settings match “{{ search }}”.</p>
        </nav>
      </aside>

      <div class="settings__content"><RouterView /></div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: var(--surface);
}

.settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-height: 4rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.settings__heading {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  min-width: 0;
}

.settings__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--heading);
}

.settings__divider {
  width: 1px;
  height: 1.5rem;
  background: var(--border);
}

.settings__crumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  font-size: 0.875rem;
  color: var(--muted);
}

.settings__crumbs a {
  display: inline-flex;
  color: var(--muted);
}

.settings__crumbs a:hover {
  color: var(--text);
}

.settings__crumbs .settings__crumb--current {
  overflow: hidden;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.settings__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 28rem;
  padding-left: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--surface-sunken);
  color: var(--muted);
  transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.settings__search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.settings__search input {
  flex: 1;
  height: 2.375rem;
  padding: 0 0.75rem 0 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  font-size: 0.875rem;
}

.settings__search input:focus {
  box-shadow: none;
}

.settings__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.settings__modules {
  display: flex;
  flex: none;
  flex-direction: column;
  width: 16rem;
  border-right: 1px solid var(--border);
  background: var(--surface);
}

.settings__modules-title {
  margin: 0;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.settings__modules-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
}

.settings__module {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

.settings__module span {
  flex: 1;
}

.settings__module:hover {
  background: var(--surface-sunken);
  color: var(--text);
}

.settings__module--active,
.settings__module--active:hover {
  background: var(--crimson-soft);
  color: var(--crimson-dark);
}

.settings__empty {
  margin: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.settings__content {
  flex: 1;
  min-width: 0;
  padding: 1.5rem;
  background: var(--bg);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .settings__module--active {
    color: #fff;
  }
}

:root[data-theme='dark'] .settings__module--active {
  color: #fff;
}

@media (max-width: 860px) {
  .settings__header {
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
  }

  .settings__heading {
    gap: 1rem;
  }

  .settings__search {
    max-width: none;
  }

  .settings__body {
    flex-direction: column;
  }

  .settings__modules {
    width: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .settings__modules-title {
    display: none;
  }

  .settings__modules-list {
    flex-direction: row;
    overflow-x: auto;
  }

  .settings__module {
    flex: none;
  }

  .settings__module-chevron {
    display: none;
  }

  .settings__content {
    padding: 1.25rem 1rem;
  }
}
</style>
