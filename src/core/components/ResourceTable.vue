<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3, X } from 'lucide-vue-next'
import type { Collection } from '@/core/api/types'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import { Button } from '@/core/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/components/ui/dropdown-menu'
import { Skeleton } from '@/core/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { useCollection } from '@/core/composables/useCollection'
import { useTablePreferences, type TableDensity } from '@/core/composables/useTablePreferences'

export interface Column<Row> {
  key: string
  label: string
  value?: (row: Row) => string | number | null | undefined
  align?: 'left' | 'right'
  /** `strong` for a row's identifier, `muted` for secondary detail. */
  tone?: 'strong' | 'muted'
  /** Keep long text to one line; the full text shows on hover. */
  truncate?: boolean
}

const props = defineProps<{
  title: string
  description?: string
  columns: Column<T>[]
  fetch: (page: number, perPage: number) => Promise<Collection<T>>
  /** Reloads from page 1 whenever these change. Clear resets every value to ''. */
  filters?: Record<string, unknown>
  rowKey?: string
}>()

const PAGE_SIZES = [15, 25, 50]
const FILTER_DELAY = 250
const DENSITIES: { label: string; value: TableDensity }[] = [
  { label: 'Compact', value: 'compact' },
  { label: 'Comfortable', value: 'comfortable' },
]

const preferences = useTablePreferences(props.title)
const { rows, meta, page, loading, error, load, reload } = useCollection<T>((target) => props.fetch(target, preferences.perPage))

const visibleColumns = computed(() => props.columns.filter((column) => !preferences.hidden.includes(column.key)))
const filtered = computed(() => Object.values(props.filters ?? {}).some(Boolean))
const compact = computed(() => preferences.density === 'compact')

function cell(row: T, column: Column<T>): string | number {
  const value = column.value ? column.value(row) : (row as Record<string, unknown>)[column.key]
  return value === null || value === undefined || value === '' ? '—' : (value as string | number)
}

function key(row: T, index: number): string | number {
  return ((row as Record<string, unknown>)[props.rowKey ?? 'id'] as string | number | undefined) ?? index
}

function toneClass(column: Column<T>) {
  return {
    'text-right font-medium': column.align === 'right',
    'font-semibold text-navy dark:text-white': column.tone === 'strong',
    'text-muted-foreground': column.tone === 'muted',
  }
}

function setColumn(columnKey: string, visible: boolean) {
  preferences.hidden = visible ? preferences.hidden.filter((hidden) => hidden !== columnKey) : [...preferences.hidden, columnKey]
}

function clearFilters() {
  const filters = props.filters ?? {}
  for (const name of Object.keys(filters)) filters[name] = ''
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(() => props.filters, () => {
  clearTimeout(timer)
  timer = setTimeout(() => load(1), FILTER_DELAY)
}, { deep: true })

watch(() => preferences.perPage, () => load(1))
onMounted(() => load(1))
onBeforeUnmount(() => clearTimeout(timer))

defineExpose({ reload, load })
</script>

<template>
  <div class="tw-scope flex flex-col gap-4">
    <header class="page-head !mb-0">
      <div>
        <h1 class="page-head__title">{{ title }}</h1>
        <p v-if="description" class="page-head__lede">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="page-head__actions"><slot name="actions" :rows="rows" /></div>
    </header>

    <slot name="messages" />
    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>

    <section class="overflow-hidden rounded-lg border border-border bg-background" :aria-label="title">
      <div class="flex flex-wrap items-center gap-2 border-b border-border p-2 [&_select]:h-8 [&_select]:rounded-md [&_select]:py-0 [&_select]:text-sm">
        <slot name="filters" />

        <Button v-if="filtered" variant="ghost" size="sm" @click="clearFilters">
          <X />
          Clear
        </Button>

        <div class="ml-auto flex items-center gap-2">
          <SegmentedControl v-model="preferences.density" :options="DENSITIES" label="Row density" />

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm">
                <Columns3 />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-48">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                v-for="column in columns"
                :key="column.key"
                :model-value="!preferences.hidden.includes(column.key)"
                :disabled="visibleColumns.length === 1 && !preferences.hidden.includes(column.key)"
                @update:model-value="setColumn(column.key, $event === true)"
                @select.prevent
              >
                {{ column.label }}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table class="tabular-nums" :class="compact ? 'text-[0.8125rem]' : 'text-sm'" :aria-busy="loading || undefined">
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead
              v-for="column in visibleColumns"
              :key="column.key"
              class="h-8 bg-muted px-3 text-xs text-muted-foreground"
              :class="{ 'text-right': column.align === 'right' }"
            >
              {{ column.label }}
            </TableHead>
            <TableHead v-if="$slots['row-actions']" class="h-8 bg-muted px-3"><span class="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody v-if="loading && !rows.length">
          <TableRow v-for="row in 8" :key="row" class="hover:bg-transparent">
            <TableCell v-for="column in visibleColumns" :key="column.key" class="px-3 py-2.5"><Skeleton class="h-4 w-full max-w-32 bg-muted" /></TableCell>
            <TableCell v-if="$slots['row-actions']" class="px-3 py-2.5" />
          </TableRow>
        </TableBody>

        <TableBody v-else-if="rows.length" :class="{ 'opacity-60': loading }">
          <TableRow v-for="(row, index) in rows" :key="key(row, index)">
            <TableCell
              v-for="column in visibleColumns"
              :key="column.key"
              class="px-3"
              :class="[compact ? 'py-1.5' : 'py-3', toneClass(column)]"
            >
              <slot :name="`cell-${column.key}`" :row="row">
                <span v-if="column.truncate" class="block max-w-[26rem] truncate" :title="String(cell(row, column))">{{ cell(row, column) }}</span>
                <template v-else>{{ cell(row, column) }}</template>
              </slot>
            </TableCell>
            <TableCell v-if="$slots['row-actions']" class="px-3" :class="compact ? 'py-1' : 'py-2.5'">
              <div class="flex justify-end gap-1.5"><slot name="row-actions" :row="row" :reload="reload" /></div>
            </TableCell>
          </TableRow>
        </TableBody>

        <TableBody v-else>
          <TableRow class="hover:bg-transparent">
            <TableCell :colspan="visibleColumns.length + ($slots['row-actions'] ? 1 : 0)" class="px-3 py-14 text-center">
              <template v-if="filtered">
                <p class="font-medium">No records match these filters</p>
                <p class="mt-1 text-muted-foreground">Change or clear the filters to see more.</p>
                <Button variant="outline" size="sm" class="mt-3" @click="clearFilters">Clear filters</Button>
              </template>
              <slot v-else name="empty"><p class="font-medium">No records yet</p></slot>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <footer v-if="meta && meta.total > 0" class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 text-[0.8125rem] text-muted-foreground">
        <span class="tabular-nums">Showing {{ meta.from }}–{{ meta.to }} of {{ meta.total.toLocaleString() }}</span>
        <div class="flex flex-wrap items-center gap-4">
          <label class="flex items-center gap-2">
            Rows per page
            <select v-model.number="preferences.perPage" class="h-8 rounded-md py-0 text-[0.8125rem]">
              <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
            </select>
          </label>
          <span class="tabular-nums">Page {{ meta.current_page }} of {{ meta.last_page }}</span>
          <div class="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="First page" :disabled="loading || page <= 1" @click="load(1)"><ChevronsLeft /></Button>
            <Button variant="outline" size="icon-sm" aria-label="Previous page" :disabled="loading || page <= 1" @click="load(page - 1)"><ChevronLeft /></Button>
            <Button variant="outline" size="icon-sm" aria-label="Next page" :disabled="loading || page >= meta.last_page" @click="load(page + 1)"><ChevronRight /></Button>
            <Button variant="outline" size="icon-sm" aria-label="Last page" :disabled="loading || page >= meta.last_page" @click="load(meta?.last_page ?? 1)"><ChevronsRight /></Button>
          </div>
        </div>
      </footer>
    </section>
  </div>
</template>
