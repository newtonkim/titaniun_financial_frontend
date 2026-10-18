<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/core/components/AppIcon.vue'
import { formatDate, formatMoney, formatTime } from '@/core/utils/format'
import type { ActivityDirection, DashboardActivity } from '@/modules/reports/types'

const props = defineProps<{ activities: DashboardActivity[] }>()

const search = ref('')
const direction = ref<ActivityDirection | ''>('')

const rows = computed(() => {
  const term = search.value.trim().toLowerCase()
  return props.activities.filter(
    (activity) =>
      (!direction.value || activity.direction === direction.value) &&
      (!term || [activity.label, activity.party, activity.reference].some((value) => value?.toLowerCase().includes(term))),
  )
})
</script>

<template>
  <section class="activity panel">
    <header class="activity__header">
      <h2 class="activity__title">Recent activity</h2>
      <div class="activity__tools">
        <label class="activity__search">
          <AppIcon name="search" :size="18" />
          <input v-model="search" type="search" placeholder="Search activity" aria-label="Search activity" />
        </label>
        <select v-model="direction" aria-label="Filter by direction">
          <option value="">All activity</option>
          <option value="in">Money in</option>
          <option value="out">Money out</option>
        </select>
      </div>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Activity</th>
            <th>Reference</th>
            <th>Date</th>
            <th>Time</th>
            <th class="num">Amount</th>
            <th>Direction</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="activity in rows" :key="`${activity.type}-${activity.occurred_at}-${activity.reference}`">
            <td>
              <span class="activity__item">
                <span class="activity__icon" :class="`activity__icon--${activity.direction}`">
                  <AppIcon :name="activity.direction === 'in' ? 'arrow-in' : 'arrow-out'" :size="18" />
                </span>
                <span>
                  <span class="activity__label">{{ activity.label }}</span>
                  <span v-if="activity.party" class="activity__party">{{ activity.party }}</span>
                </span>
              </span>
            </td>
            <td>{{ activity.reference ?? '—' }}</td>
            <td>{{ formatDate(activity.occurred_at) }}</td>
            <td>{{ activity.type === 'expense' ? '—' : formatTime(activity.occurred_at) }}</td>
            <td class="num activity__amount">{{ formatMoney(activity.amount) }}</td>
            <td>
              <span class="activity__direction" :class="`activity__direction--${activity.direction}`">
                {{ activity.direction === 'in' ? 'Money in' : 'Money out' }}
              </span>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6" class="empty">
              {{ activities.length === 0 ? 'No activity yet. Deposits, repayments, share trades and expenses will show up here.' : 'No activity matches your search.' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.activity__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.activity__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--heading);
}

.activity__tools {
  display: flex;
  flex: 0 1 30rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

.activity__search {
  display: flex;
  flex: 1 1 16rem;
  align-items: center;
  gap: 0.5rem;
  padding-left: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--muted);
}

.activity__search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.activity__search input {
  flex: 1;
  height: 2.6rem;
  border: 0;
  background: transparent;
}

.activity__search input:focus {
  box-shadow: none;
}

.activity__tools select {
  height: 2.75rem;
  padding-inline: 0.8rem;
  border-radius: 10px;
}

.table-wrap {
  border: 1px solid var(--border);
  border-radius: 12px;
}

th {
  padding: 0.85rem 1rem;
  background: var(--surface-sunken);
  font-size: 0.85rem;
  font-weight: 500;
}

td {
  padding: 0.85rem 1rem;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.activity__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.activity__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 10px;
}

.activity__icon--in {
  background: rgb(29 122 70 / 0.1);
  color: var(--success);
}

.activity__icon--out {
  background: var(--crimson-soft);
  color: var(--crimson-dark);
}

.activity__label {
  display: block;
  max-width: 22rem;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
}

.activity__party {
  display: block;
  font-size: 0.85rem;
  color: var(--muted);
}

.activity__amount {
  font-weight: 600;
}

.activity__direction {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.activity__direction::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.activity__direction--in::before {
  background: var(--success);
}

.activity__direction--out::before {
  background: var(--crimson);
}
</style>
