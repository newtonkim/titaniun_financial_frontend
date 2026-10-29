<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/core/components/AppIcon.vue'
import type { IconName } from '@/core/components/AppIcon.vue'
import BrandLogo from '@/core/components/BrandLogo.vue'
import { useTheme } from '@/core/composables/useTheme'
import { NAV_GROUPS, type NavItem } from '@/core/module'
import { modules } from '@/modules'
import { useAuth } from '@/modules/auth/store'

/** A sidebar row: a plain link, or a flyout menu gathering links under headings. */
type SidebarEntry =
  | { kind: 'link'; item: NavItem }
  | { kind: 'menu'; label: string; icon: IconName; sections: Array<{ heading: string; items: NavItem[] }> }

const COLLAPSED_KEY = 'titaniun.sidebar-collapsed'
const FLYOUT_GAP = 12
const VIEWPORT_MARGIN = 12

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()

const dashboardItem: NavItem = { label: 'Dashboard', to: { name: 'dashboard' }, icon: 'dashboard', group: 'overview' }
const navItems = [dashboardItem, ...modules.flatMap((module) => module.nav)]

const groups = computed(() => NAV_GROUPS.map((group) => ({
  ...group,
  entries: toEntries(navItems.filter((item) => item.group === group.id && auth.canRoute(router.resolve(item.to).name))),
})).filter((group) => group.entries.length > 0))

const compactQuery = window.matchMedia('(max-width: 1080px)')
const isCompact = ref(compactQuery.matches)
const collapsed = ref(readCollapsed())
const sidebarOpen = ref(false)
const userMenuOpen = ref(false)
const openMenu = ref<string | null>(null)
const flyoutTop = ref(0)
const flyoutLeft = ref(0)
const notchTop = ref(22)
const flyout = ref<HTMLElement[]>([])

/** Icons only: the desktop sidebar has been collapsed. On small screens the sidebar is a full-width drawer. */
const iconOnly = computed(() => collapsed.value && !isCompact.value)
const fullBleed = computed(() => route.matched.some((record) => record.meta.fullBleed))

const pageTitle = computed(() => route.meta.title ?? '')
const initials = computed(() =>
  (auth.user.value?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
)

function toEntries(items: NavItem[]): SidebarEntry[] {
  const entries: SidebarEntry[] = []

  for (const item of items) {
    if (!item.menu) {
      entries.push({ kind: 'link', item })
      continue
    }

    const { label, icon, heading } = item.menu
    let menu = entries.find((entry) => entry.kind === 'menu' && entry.label === label)

    if (!menu || menu.kind !== 'menu') {
      menu = { kind: 'menu', label, icon, sections: [] }
      entries.push(menu)
    }

    let section = menu.sections.find((candidate) => candidate.heading === heading)
    if (!section) {
      section = { heading, items: [] }
      menu.sections.push(section)
    }
    section.items.push(item)
  }

  return entries
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function toggleCollapsed(): void {
  collapsed.value = !collapsed.value
  closeMenu()
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed.value ? '1' : '0')
  } catch {
    // Storage can be unavailable (private windows); the sidebar still toggles for this visit.
  }
}

function isActive(item: NavItem): boolean {
  const target = router.resolve(item.to)
  return target.name === 'dashboard' ? route.name === 'dashboard' : route.path.startsWith(target.path)
}

function menuIsActive(entry: SidebarEntry): boolean {
  return entry.kind === 'menu' && entry.sections.some((section) => section.items.some(isActive))
}

function menuId(label: string): string {
  return `flyout-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

/**
 * Open a flyout beside its trigger, kept inside the viewport. On small screens the menu opens
 * in place under its trigger instead.
 */
async function toggleMenu(label: string, event: MouseEvent): Promise<void> {
  if (openMenu.value === label) {
    closeMenu()
    return
  }

  const trigger = (event.currentTarget as HTMLElement).getBoundingClientRect()
  openMenu.value = label

  if (isCompact.value) return

  flyoutTop.value = trigger.top
  flyoutLeft.value = trigger.right + FLYOUT_GAP
  await nextTick()

  const height = flyout.value[0]?.offsetHeight ?? 0
  const maxTop = window.innerHeight - height - VIEWPORT_MARGIN
  flyoutTop.value = Math.max(VIEWPORT_MARGIN, Math.min(trigger.top, maxTop))
  notchTop.value = trigger.top - flyoutTop.value + trigger.height / 2 - 5
}

function closeMenu(): void {
  openMenu.value = null
}

async function signOut(): Promise<void> {
  userMenuOpen.value = false
  await auth.logout()
  await router.replace({ name: 'login' })
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeMenu()
    userMenuOpen.value = false
    sidebarOpen.value = false
  }
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as Element | null
  if (!target?.closest('.user-menu')) userMenuOpen.value = false
  if (!target?.closest('.nav-menu')) closeMenu()
}

function onCompactChange(event: MediaQueryListEvent): void {
  isCompact.value = event.matches
  closeMenu()
}

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
    userMenuOpen.value = false
    closeMenu()
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('click', onDocumentClick)
  window.addEventListener('resize', closeMenu)
  compactQuery.addEventListener('change', onCompactChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('click', onDocumentClick)
  window.removeEventListener('resize', closeMenu)
  compactQuery.removeEventListener('change', onCompactChange)
})
</script>

<template>
  <div class="shell" :class="{ 'shell--collapsed': iconOnly, 'shell--nav-open': sidebarOpen }">
    <aside class="sidebar" aria-label="Main navigation">
      <div class="sidebar__head">
        <RouterLink class="sidebar__brand" :to="{ name: 'dashboard' }" aria-label="Titaniun Financial home">
          <span class="sidebar__logo"><BrandLogo :size="iconOnly ? 30 : 50" /></span>
          <span v-if="!iconOnly" class="sidebar__name">Titaniun Financial</span>
        </RouterLink>
        <button
          v-if="!isCompact"
          class="sidebar__toggle"
          type="button"
          :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-expanded="!collapsed"
          @click="toggleCollapsed"
        >
          <AppIcon name="sidebar" :size="18" />
        </button>
        <button v-else class="sidebar__toggle" type="button" aria-label="Close menu" @click="sidebarOpen = false">
          <AppIcon name="close" :size="18" />
        </button>
      </div>

      <nav class="sidebar__nav" @scroll.passive="closeMenu">
        <section v-for="group in groups" :key="group.id" class="nav-group" :aria-label="group.label">
          <h2 v-if="!iconOnly" class="nav-group__label">{{ group.label }}</h2>
          <hr v-else class="nav-group__rule" />

          <template v-for="entry in group.entries" :key="entry.kind === 'link' ? entry.item.label : entry.label">
            <RouterLink
              v-if="entry.kind === 'link'"
              :to="entry.item.to"
              class="nav-item"
              :class="{ 'nav-item--active': isActive(entry.item) }"
              :aria-current="isActive(entry.item) ? 'page' : undefined"
              :title="iconOnly ? entry.item.label : undefined"
            >
              <AppIcon :name="entry.item.icon" :size="18" />
              <span v-if="!iconOnly" class="nav-item__label">{{ entry.item.label }}</span>
            </RouterLink>

            <div v-else class="nav-menu">
              <button
                type="button"
                class="nav-item"
                :class="{ 'nav-item--open': openMenu === entry.label, 'nav-item--active': menuIsActive(entry) }"
                :aria-expanded="openMenu === entry.label"
                :aria-controls="menuId(entry.label)"
                :title="iconOnly ? entry.label : undefined"
                @click="toggleMenu(entry.label, $event)"
              >
                <AppIcon :name="entry.icon" :size="18" />
                <template v-if="!iconOnly">
                  <span class="nav-item__label">{{ entry.label }}</span>
                  <AppIcon class="nav-item__chevron" :name="openMenu === entry.label ? 'chevron-down' : 'chevron-right'" :size="14" />
                </template>
              </button>

              <Transition name="flyout">
                <div
                  v-if="openMenu === entry.label"
                  :id="menuId(entry.label)"
                  ref="flyout"
                  class="flyout"
                  :class="{ 'flyout--inline': isCompact }"
                  :style="isCompact ? undefined : { top: `${flyoutTop}px`, left: `${flyoutLeft}px` }"
                >
                  <span v-if="!isCompact" class="flyout__notch" :style="{ top: `${notchTop}px` }" aria-hidden="true" />
                  <div class="flyout__panel">
                    <div class="flyout__accent" aria-hidden="true" />
                    <div v-for="section in entry.sections" :key="section.heading" class="flyout__section">
                      <p class="flyout__heading"><span class="flyout__dot" aria-hidden="true" />{{ section.heading }}</p>
                      <RouterLink
                        v-for="item in section.items"
                        :key="item.label"
                        :to="item.to"
                        class="flyout__link"
                        :class="{ 'flyout__link--active': isActive(item) }"
                        :aria-current="isActive(item) ? 'page' : undefined"
                      >
                        <span class="flyout__icon"><AppIcon :name="item.icon" :size="14" /></span>
                        <span class="flyout__label">{{ item.label }}</span>
                        <span v-if="isActive(item)" class="flyout__active-dot" aria-hidden="true" />
                      </RouterLink>
                    </div>
                    <p v-if="!isCompact" class="flyout__footer"><kbd>Esc</kbd> to close</p>
                  </div>
                </div>
              </Transition>
            </div>
          </template>
        </section>
      </nav>

      <div class="sidebar__footer">
        <div class="theme-toggle">
          <AppIcon class="theme-toggle__icon" :name="isDark ? 'moon' : 'sun'" :size="16" />
          <span v-if="!iconOnly" class="theme-toggle__label">Dark mode</span>
          <button
            type="button"
            role="switch"
            class="switch"
            :class="{ 'switch--on': isDark }"
            :aria-checked="isDark"
            aria-label="Dark mode"
            @click="toggleTheme"
          >
            <span class="switch__thumb" />
          </button>
        </div>
      </div>
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
              <RouterLink role="menuitem" class="user-menu__item" :to="{ name: 'settings.profile' }">
                <AppIcon name="settings" :size="18" /> Account settings
              </RouterLink>
              <button type="button" role="menuitem" class="user-menu__item" @click="signOut">
                <AppIcon name="logout" :size="18" /> Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="content" :class="{ 'content--full-bleed': fullBleed }"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  /* The sidebar is always dark, in the brand ink, whatever the theme. */
  --nav-bg: var(--ink-panel);
  --nav-text: rgb(255 255 255 / 0.6);
  --nav-label: rgb(255 255 255 / 0.35);
  --nav-hover: rgb(255 255 255 / 0.08);
  --nav-active: rgb(255 255 255 / 0.1);
  --nav-accent: #e0565b;
  --sidebar-width: 16rem;

  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--nav-bg);
  transition: grid-template-columns 200ms var(--ease-out);
}

.shell--collapsed {
  --sidebar-width: 4.5rem;
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  padding: 1rem 0.75rem;
  color: var(--nav-text);
}

.sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.25rem 0.5rem;
}

.shell--collapsed .sidebar__head {
  flex-direction: column;
  padding-inline: 0;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.sidebar__logo {
  display: grid;
  flex: none;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.3);
  transition: width 200ms var(--ease-out), height 200ms var(--ease-out), border-radius 200ms var(--ease-out);
}

.shell--collapsed .sidebar__logo {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
}

.sidebar__name {
  overflow: hidden;
  font-size: 1.125rem;
  font-weight: 700;
  font-style: italic;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: #fff;
}

.sidebar__toggle {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--nav-text);
  cursor: pointer;
  transition: background-color 160ms var(--ease-out), color 160ms var(--ease-out);
}

.sidebar__toggle:hover {
  background: rgb(255 255 255 / 0.1);
  color: #fff;
}

.sidebar__nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgb(255 255 255 / 0.15) transparent;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.nav-group__label {
  margin: 1rem 0 0.25rem;
  padding: 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--nav-label);
}

.nav-group__rule {
  width: calc(100% - 1rem);
  margin: 0.5rem auto;
  border: 0;
  border-top: 1px solid rgb(255 255 255 / 0.06);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  border: 0;
  border-radius: 0.75rem;
  background: transparent;
  color: var(--nav-text);
  font-size: 0.8125rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 200ms var(--ease-out), color 200ms var(--ease-out);
}

.shell--collapsed .nav-item {
  justify-content: center;
}

.nav-item:hover {
  background: var(--nav-hover);
  color: #fff;
}

.nav-item :deep(svg) {
  flex: none;
}

.nav-item__label {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nav-item__chevron {
  color: rgb(255 255 255 / 0.3);
}

.nav-item--open {
  background: var(--nav-active);
  color: #fff;
}

/* The current page: a solid brand-crimson pill. */
.nav-item--active,
.nav-item--active:hover {
  background: var(--crimson);
  color: #fff;
  box-shadow: 0 6px 16px rgb(184 50 54 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.12);
}

.nav-item--active .nav-item__chevron {
  color: rgb(255 255 255 / 0.7);
}

/* Flyout menu */
.nav-menu {
  position: relative;
}

.flyout {
  position: fixed;
  z-index: 60;
  width: 18rem;
}

.flyout__panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgb(0 0 0 / 0.07);
  border-radius: 20px;
  background: var(--surface);
  color: var(--text);
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.03),
    0 4px 6px rgb(0 0 0 / 0.04),
    0 12px 30px rgb(0 0 0 / 0.1),
    0 32px 64px rgb(0 0 0 / 0.08);
}

.flyout__notch {
  position: absolute;
  left: -5px;
  z-index: 1;
  width: 10px;
  height: 10px;
  border-bottom: 1px solid rgb(0 0 0 / 0.07);
  border-left: 1px solid rgb(0 0 0 / 0.07);
  border-radius: 2px 0 0;
  background: var(--surface);
  transform: rotate(45deg);
}

.flyout__accent {
  height: 3px;
  background: linear-gradient(90deg, var(--crimson), #2f8ad8, var(--crimson));
  background-size: 200% 100%;
  animation: accent-shimmer 3s ease infinite;
}

@keyframes accent-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

.flyout__section {
  display: flex;
  flex-direction: column;
  padding: 0.625rem 0.5rem;
}

.flyout__section + .flyout__section {
  border-top: 1px solid var(--border);
}

.flyout__heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.25rem 0.25rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.flyout__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary);
}

.flyout__link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  color: var(--muted);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

.flyout__link:hover {
  background: color-mix(in srgb, var(--primary) 6%, transparent);
  color: var(--primary);
}

.flyout__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: var(--surface-sunken);
  color: var(--muted);
  transition: background-color 150ms var(--ease-out), color 150ms var(--ease-out);
}

.flyout__link:hover .flyout__icon {
  background: color-mix(in srgb, var(--primary) 9%, transparent);
  color: var(--primary);
}

.flyout__label {
  flex: 1;
}

.flyout__link--active,
.flyout__link--active:hover {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  font-weight: 600;
}

.flyout__link--active .flyout__icon {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--primary);
}

.flyout__active-dot {
  width: 6px;
  height: 6px;
  margin-right: 0.25rem;
  border-radius: 50%;
  background: var(--primary);
}

.flyout__footer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  padding: 0.45rem 0.875rem 0.55rem;
  border-top: 1px solid var(--border);
  font-size: 0.6875rem;
  color: var(--muted);
}

.flyout__footer kbd {
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface-sunken);
  font: 700 0.625rem var(--font-sans);
  color: var(--muted);
}

.flyout--inline {
  position: static;
  width: auto;
  margin: 0.25rem 0 0.5rem;
}

.flyout--inline .flyout__panel {
  border-radius: 14px;
  box-shadow: none;
}

.flyout-enter-active {
  animation: flyout-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.flyout-leave-active {
  animation: flyout-in 120ms ease reverse both;
}

@keyframes flyout-in {
  from { opacity: 0; transform: translateX(-8px) scale(0.97); }
  to { opacity: 1; transform: none; }
}

/* Footer: dark mode switch */
.sidebar__footer {
  padding-top: 0.75rem;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem;
  border: 1px solid rgb(255 255 255 / 0.05);
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 0.05);
}

.shell--collapsed .theme-toggle {
  flex-direction: column;
  padding: 0.75rem 0.25rem;
}

.theme-toggle__icon {
  flex: none;
  color: var(--nav-accent);
}

.theme-toggle__label {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.switch {
  position: relative;
  flex: none;
  width: 2.5rem;
  height: 1.25rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.1);
  cursor: pointer;
  transition: background-color 300ms var(--ease-out);
}

.switch--on {
  background: var(--crimson);
}

.switch__thumb {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
  transition: transform 300ms var(--ease-out);
}

.switch--on .switch__thumb {
  transform: translateX(1.25rem);
}

/* Main column: an inset card on the dark frame */
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0.5rem 0.5rem 0.5rem 0;
  overflow-y: auto;
  border-radius: 0.75rem;
  background: var(--bg);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
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
  flex: 1;
  padding: 2rem;
}

.content--full-bleed {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.shell__scrim {
  display: none;
}

@media (max-width: 1080px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
    background: var(--bg);
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    width: min(18rem, 85vw);
    background: var(--nav-bg);
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

  .main {
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .icon-button.topbar__menu {
    display: inline-grid;
  }

  .topbar {
    padding: 0.75rem 1rem;
  }

  .content {
    padding: 1.25rem 1rem;
  }

  .content--full-bleed {
    padding: 0;
  }
}

@media (max-width: 720px) {
  .breadcrumb > a,
  .breadcrumb > :deep(svg),
  .topbar__history,
  .user-menu__name {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flyout__accent {
    animation: none;
  }
}
</style>
