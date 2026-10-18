<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/core/components/AppIcon.vue'
import BrandLogo from '@/core/components/BrandLogo.vue'
import type { NavItem, NavSection } from '@/core/module'
import { modules } from '@/modules'
import { useAuth } from '@/modules/auth/store'

const auth = useAuth()
const route = useRoute()
const router = useRouter()

const SECTIONS: Array<{ id: NavSection; label: string }> = [
  { id: 'main', label: 'Main menu' },
  { id: 'setup', label: 'Products & ledger' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
]

const dashboardItem: NavItem = { label: 'Dashboard', to: { name: 'dashboard' }, icon: 'dashboard', section: 'main' }
const navItems = [dashboardItem, ...modules.flatMap((module) => module.nav)]

const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const sidebarOpen = ref(false)
const userMenuOpen = ref(false)

const sections = computed(() => {
  const term = search.value.trim().toLowerCase()
  return SECTIONS.map((section) => ({
    ...section,
    items: navItems.filter((item) => item.section === section.id && (!term || item.label.toLowerCase().includes(term))),
  })).filter((section) => section.items.length > 0)
})

const pageTitle = computed(() => route.meta.title ?? '')
const initials = computed(() =>
  (auth.user.value?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
)

function isActive(item: NavItem): boolean {
  const target = router.resolve(item.to)
  return target.name === 'dashboard' ? route.name === 'dashboard' : route.path.startsWith(target.path)
}

async function signOut(): Promise<void> {
  userMenuOpen.value = false
  await auth.logout()
  await router.replace({ name: 'login' })
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    sidebarOpen.value = true
    searchInput.value?.focus()
  }
  if (event.key === 'Escape') {
    userMenuOpen.value = false
    sidebarOpen.value = false
  }
}

function closeUserMenu(event: MouseEvent): void {
  if (!(event.target as Element | null)?.closest('.user-menu')) userMenuOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
    userMenuOpen.value = false
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('click', closeUserMenu)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('click', closeUserMenu)
})
</script>

<template>
  <div class="shell" :class="{ 'shell--nav-open': sidebarOpen }">
    <aside class="sidebar" aria-label="Main navigation">
      <div class="sidebar__head">
        <RouterLink class="sidebar__brand" :to="{ name: 'dashboard' }">
          <BrandLogo :size="40" />
          <span>Titaniun Financial</span>
        </RouterLink>
        <button class="icon-button sidebar__close" type="button" aria-label="Close menu" @click="sidebarOpen = false">
          <AppIcon name="close" />
        </button>
      </div>

      <label class="sidebar__search">
        <AppIcon name="search" :size="18" />
        <input ref="searchInput" v-model="search" type="search" placeholder="Search menu" aria-label="Search menu" />
        <kbd>⌘ K</kbd>
      </label>

      <nav class="sidebar__nav">
        <section v-for="section in sections" :key="section.id" class="nav-section">
          <h2 class="nav-section__title">{{ section.label }}</h2>
          <RouterLink
            v-for="item in section.items"
            :key="item.label"
            :to="item.to"
            class="nav-link"
            :class="{ 'nav-link--active': isActive(item) }"
            :aria-current="isActive(item) ? 'page' : undefined"
          >
            <AppIcon :name="item.icon" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </section>
        <p v-if="sections.length === 0" class="sidebar__empty">No menu items match “{{ search }}”.</p>

        <section class="nav-section nav-section--general">
          <h2 class="nav-section__title">General</h2>
          <button type="button" class="nav-link" @click="signOut">
            <AppIcon name="logout" />
            <span>Log out</span>
          </button>
        </section>
      </nav>
    </aside>
    <div class="shell__scrim" aria-hidden="true" @click="sidebarOpen = false" />

    <div class="main">
      <header class="topbar">
        <button class="icon-button topbar__menu" type="button" aria-label="Open menu" @click="sidebarOpen = true">
          <AppIcon name="menu" />
        </button>
        <div class="topbar__history">
          <button class="icon-button" type="button" aria-label="Go back" @click="router.back()"><AppIcon name="arrow-left" :size="18" /></button>
          <button class="icon-button" type="button" aria-label="Go forward" @click="router.forward()"><AppIcon name="arrow-right" :size="18" /></button>
        </div>
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <RouterLink :to="{ name: 'dashboard' }">Titaniun Financial</RouterLink>
          <template v-if="pageTitle">
            <AppIcon name="chevron-right" :size="16" />
            <span aria-current="page">{{ pageTitle }}</span>
          </template>
        </nav>

        <div class="topbar__actions">
          <div class="user-menu">
            <button
              type="button"
              class="user-menu__trigger"
              :aria-expanded="userMenuOpen"
              aria-haspopup="menu"
              @click="userMenuOpen = !userMenuOpen"
            >
              <span class="avatar" aria-hidden="true">{{ initials }}</span>
              <span class="user-menu__name">{{ auth.user.value?.name }}</span>
              <AppIcon name="chevron-down" :size="16" />
            </button>
            <div v-if="userMenuOpen" class="user-menu__panel" role="menu">
              <p class="user-menu__email">{{ auth.user.value?.email }}</p>
              <button type="button" role="menuitem" class="user-menu__item" @click="signOut">
                <AppIcon name="logout" :size="18" /> Log out
              </button>
            </div>
          </div>
          <RouterLink class="btn btn--primary topbar__cta" :to="{ name: 'members.create' }">
            <AppIcon name="plus" :size="18" /> New member
          </RouterLink>
        </div>
      </header>

      <main class="content"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 17.5rem minmax(0, 1fr);
  min-height: 100vh;
  min-height: 100dvh;
}

/* Sidebar */
.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  height: 100vh;
  height: 100dvh;
  padding: 1.5rem 1.25rem;
  overflow-y: auto;
  background: var(--surface);
  border-right: 1px solid var(--border);
}

.sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-serif);
  font-size: 1.3rem;
  line-height: 1.1;
  white-space: nowrap;
  color: var(--heading);
}

.sidebar__brand :deep(svg) {
  flex: none;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.12));
}

.sidebar__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.6rem 0 0.8rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-sunken);
  color: var(--muted);
  transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}

.sidebar__search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.sidebar__search input {
  flex: 1;
  height: 2.6rem;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.sidebar__search input:focus {
  box-shadow: none;
}

.sidebar__search kbd {
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font: 500 0.75rem var(--font-sans);
  color: var(--muted);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.nav-section--general {
  margin-top: auto;
}

.nav-section__title {
  margin: 0 0 0.4rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font-size: 0.98rem;
  text-align: left;
  cursor: pointer;
  transition: background-color 160ms var(--ease-out), color 160ms var(--ease-out);
}

.nav-link:hover {
  background: var(--surface-sunken);
}

.nav-link :deep(svg) {
  flex: none;
  color: var(--muted);
}

.nav-link--active,
.nav-link--active:hover {
  background: var(--ink-panel);
  color: #fff;
  box-shadow: inset 3px 0 0 var(--crimson);
}

.nav-link--active :deep(svg) {
  color: #fff;
}

.sidebar__empty {
  margin: 0 0.75rem;
  font-size: 0.9rem;
  color: var(--muted);
}

/* Main column */
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 2rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.topbar__history {
  display: flex;
  gap: 0.4rem;
}

.icon-button {
  display: inline-grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: background-color 160ms var(--ease-out);
}

.icon-button:hover {
  background: var(--surface-sunken);
}

.icon-button.sidebar__close,
.icon-button.topbar__menu {
  display: none;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  color: var(--muted);
}

.breadcrumb a {
  color: var(--muted);
}

.breadcrumb a:hover {
  color: var(--text);
}

.breadcrumb [aria-current] {
  overflow: hidden;
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.topbar__cta {
  height: 2.6rem;
  padding-inline: 1rem;
  border-radius: 10px;
  font-weight: 600;
}

.user-menu {
  position: relative;
}

.user-menu__trigger {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.user-menu__trigger:hover {
  border-color: var(--border);
}

.avatar {
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  background: var(--crimson-soft);
  color: var(--crimson-dark);
  font-weight: 700;
  font-size: 0.9rem;
}

.user-menu__name {
  max-width: 12rem;
  overflow: hidden;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.user-menu__panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 30;
  min-width: 15rem;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 12px 32px rgb(16 24 40 / 0.12);
}

.user-menu__email {
  margin: 0;
  padding: 0.5rem 0.6rem 0.6rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.85rem;
  color: var(--muted);
}

.user-menu__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.55rem 0.6rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.user-menu__item:hover {
  background: var(--surface-sunken);
}

.content {
  padding: 2rem;
}

.shell__scrim {
  display: none;
}

@media (max-width: 1080px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    width: min(18rem, 85vw);
    transform: translateX(-100%);
    transition: transform 220ms var(--ease-out);
  }

  .shell--nav-open .sidebar {
    transform: none;
    box-shadow: 0 0 40px rgb(0 0 0 / 0.25);
  }

  .shell--nav-open .shell__scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: block;
    background: rgb(15 16 19 / 0.45);
  }

  .icon-button.sidebar__close,
  .icon-button.topbar__menu {
    display: inline-grid;
  }

  .topbar {
    padding: 0.75rem 1rem;
  }

  .content {
    padding: 1.25rem 1rem;
  }
}

@media (max-width: 720px) {
  .breadcrumb > a,
  .breadcrumb > :deep(svg),
  .topbar__history,
  .user-menu__name,
  .topbar__cta {
    display: none;
  }
}
</style>
