<script setup lang="ts" generic="T">
import { onMounted, watch } from 'vue'
import type { Collection } from '@/core/api/types'
import { useCollection } from '@/core/composables/useCollection'

export interface Column<Row> {
  key: string
  label: string
  value?: (row: Row) => string | number | null | undefined
  align?: 'left' | 'right'
}

const props = defineProps<{
  title: string
  columns: Column<T>[]
  fetch: (page: number) => Promise<Collection<T>>
  /** Reloads from page 1 whenever these change. */
  filters?: object
  rowKey?: string
}>()

const { rows, meta, loading, error, load, reload } = useCollection<T>((page) => props.fetch(page))

function cell(row: T, column: Column<T>): string | number {
  const value = column.value ? column.value(row) : (row as Record<string, unknown>)[column.key]
  return value === null || value === undefined || value === '' ? '—' : (value as string | number)
}

function key(row: T, index: number): string | number {
  return ((row as Record<string, unknown>)[props.rowKey ?? 'id'] as string | number | undefined) ?? index
}

watch(() => props.filters, () => load(1), { deep: true })
onMounted(() => load(1))

defineExpose({ reload })
</script>

<template>
  <section class="panel">
    <header class="panel__header">
      <h1>{{ title }}</h1>
      <div class="panel__actions"><slot name="actions" /></div>
    </header>

    <div v-if="$slots.filters" class="filters"><slot name="filters" /></div>

    <p v-if="error" class="alert alert--error">{{ error }}</p>

    <div class="table-wrap" :aria-busy="loading">
      <table>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :class="{ num: column.align === 'right' }">{{ column.label }}</th>
            <th v-if="$slots['row-actions']" class="num">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="key(row, index)">
            <td v-for="column in columns" :key="column.key" :class="{ num: column.align === 'right' }">
              <slot :name="`cell-${column.key}`" :row="row">{{ cell(row, column) }}</slot>
            </td>
            <td v-if="$slots['row-actions']" class="num row-actions"><slot name="row-actions" :row="row" :reload="reload" /></td>
          </tr>
          <tr v-if="!loading && rows.length === 0">
            <td :colspan="columns.length + ($slots['row-actions'] ? 1 : 0)" class="empty">No records found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer v-if="meta && meta.last_page > 1" class="pagination">
      <button class="btn" :disabled="loading || meta.current_page <= 1" @click="load(meta.current_page - 1)">Previous</button>
      <span>Page {{ meta.current_page }} of {{ meta.last_page }} · {{ meta.total }} records</span>
      <button class="btn" :disabled="loading || meta.current_page >= meta.last_page" @click="load(meta.current_page + 1)">Next</button>
    </footer>
  </section>
</template>
