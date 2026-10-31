<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown, Columns3, X } from 'lucide-vue-next'
import type { PageParams } from '@/core/api/resource'
import type { Collection } from '@/core/api/types'
import DataPanel from '@/core/components/DataPanel.vue'
import PageHeader from '@/core/components/PageHeader.vue'
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
  /** The API can order by this column, under the column's key. */
  sortable?: boolean
}

const props = defineProps<{
  title: string
  description?: string
  columns: Column<T>[]
  fetch: (params: PageParams) => Promise<Collection<T>>
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
const sort = ref<{ key: string; direction: 'asc' | 'desc' } | null>(null)
const { rows, meta, page, loading, error, load, reload } = useCollection<T>((target) =>
  props.fetch({ page: target, per_page: preferences.perPage, sort: sort.value?.key, direction: sort.value?.direction }),
)

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

/** Each click moves on: ascending, descending, then back to the list's own order. */
function toggleSort(column: Column<T>) {
  const current = sort.value?.key === column.key ? sort.value.direction : null
  sort.value = current === 'desc' ? null : { key: column.key, direction: current === 'asc' ? 'desc' : 'asc' }
  void load(1)
}

function ariaSort(column: Column<T>): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.sortable) return undefined
  if (sort.value?.key !== column.key) return 'none'
  return sort.value.direction === 'asc' ? 'ascending' : 'descending'
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
    <PageHeader :title="title" :description="description">
      <template v-if="$slots.actions"><slot name="actions" :rows="rows" /></template>
    </PageHeader>

    <slot name="messages" />
    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>

    <DataPanel :label="title">
      <template #toolbar>
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
      </template>

      <Table class="tabular-nums" :class="compact ? 'text-[0.8125rem]' : 'text-sm'" :aria-busy="loading || undefined">
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead
              v-for="column in visibleColumns"
              :key="column.key"
              :class="{ 'text-right': column.align === 'right' }"
              :aria-sort="ariaSort(column)"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="group inline-flex cursor-pointer items-center gap-1 font-medium hover:text-foreground"
                :class="{ 'text-foreground': sort?.key === column.key }"
                @click="toggleSort(column)"
              >
                {{ column.label }}
                <ArrowUp v-if="sort?.key === column.key && sort.direction === 'asc'" class="size-3" aria-hidden="true" />
                <ArrowDown v-else-if="sort?.key === column.key" class="size-3" aria-hidden="true" />
                <ChevronsUpDown v-else class="size-3 opacity-40 group-hover:opacity-100" aria-hidden="true" />
              </button>
              <template v-else>{{ column.label }}</template>
            </TableHead>
            <TableHead v-if="$slots['row-actions']"><span class="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody v-if="loading && !rows.length">
          <TableRow v-for="row in 8" :key="row" class="hover:bg-transparent">
            <TableCell v-for="column in visibleColumns" :key="column.key" class="py-2.5"><Skeleton class="h-4 w-full max-w-32 bg-muted" /></TableCell>
            <TableCell v-if="$slots['row-actions']" class="py-2.5" />
          </TableRow>
        </TableBody>

        <TableBody v-else-if="rows.length" :class="{ 'opacity-60': loading }">
          <TableRow v-for="(row, index) in rows" :key="key(row, index)">
            <TableCell
              v-for="column in visibleColumns"
              :key="column.key"
              :class="[compact ? 'py-1.5' : 'py-3', toneClass(column)]"
            >
              <slot :name="`cell-${column.key}`" :row="row">
                <span v-if="column.truncate" class="block max-w-[26rem] truncate" :title="String(cell(row, column))">{{ cell(row, column) }}</span>
                <template v-else>{{ cell(row, column) }}</template>
              </slot>
            </TableCell>
            <TableCell v-if="$slots['row-actions']" :class="compact ? 'py-1' : 'py-2.5'">
              <div class="flex justify-end gap-1.5"><slot name="row-actions" :row="row" :reload="reload" /></div>
            </TableCell>
          </TableRow>
        </TableBody>

        <TableBody v-else>
          <TableRow class="hover:bg-transparent">
            <TableCell :colspan="visibleColumns.length + ($slots['row-actions'] ? 1 : 0)" class="py-14 text-center">
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
    </DataPanel>
  </div>
</template>
