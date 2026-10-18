<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import AppIcon, { type IconName } from '@/core/components/AppIcon.vue'

defineProps<{
  title: string
  subtitle: string
  amount: string
  note: string
  icon: IconName
  to: RouteLocationRaw
  linkLabel: string
  featured?: boolean
}>()
</script>

<template>
  <article class="stat" :class="{ 'stat--featured': featured }">
    <div class="stat__body">
      <header class="stat__header">
        <span class="stat__icon"><AppIcon :name="icon" :size="24" /></span>
        <span>
          <h2 class="stat__title">{{ title }}</h2>
          <p class="stat__subtitle">{{ subtitle }}</p>
        </span>
      </header>
      <p class="stat__amount">
        <span>{{ amount }}</span>
        <span class="stat__note">{{ note }}</span>
      </p>
    </div>
    <RouterLink class="stat__link" :to="to">
      {{ linkLabel }}
      <AppIcon name="arrow-right" />
    </RouterLink>
  </article>
</template>

<style scoped>
.stat {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.stat__body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.4rem 1.5rem 1.5rem;
}

.stat__header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 3.25rem;
  height: 3.25rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-sunken);
  color: var(--navy);
}

.stat__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--heading);
}

.stat__subtitle {
  margin: 0.1rem 0 0;
  color: var(--muted);
}

.stat__amount {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.stat__note {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--crimson-soft);
  color: var(--crimson-dark);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0;
}

.stat__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  color: var(--text);
  transition: background-color 160ms var(--ease-out);
}

.stat__link:hover {
  background: var(--surface-sunken);
}

.stat__link :deep(svg) {
  transition: transform 160ms var(--ease-out);
}

.stat__link:hover :deep(svg) {
  transform: translateX(3px);
}

/* Featured: the brand's crimson, with a faint dot grid echoing the sign-in panel. */
.stat--featured .stat__body {
  background:
    radial-gradient(circle, rgb(255 255 255 / 0.12) 1px, transparent 1.6px) 0 0 / 18px 18px,
    linear-gradient(135deg, #c43a3e 0%, var(--crimson) 45%, var(--crimson-dark) 100%);
  color: #fff;
}

.stat--featured .stat__icon {
  border-color: transparent;
  background: #fff;
  color: var(--crimson);
}

.stat--featured .stat__title,
.stat--featured .stat__amount {
  color: #fff;
}

.stat--featured .stat__subtitle {
  color: rgb(255 255 255 / 0.82);
}

.stat--featured .stat__note {
  background: rgb(255 255 255 / 0.95);
  color: var(--crimson-dark);
}
</style>
