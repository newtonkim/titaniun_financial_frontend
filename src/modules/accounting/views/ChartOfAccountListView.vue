<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-vue-next'
import DataPanel from '@/core/components/DataPanel.vue'
import PageHeader from '@/core/components/PageHeader.vue'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Skeleton } from '@/core/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { formatEnum } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { chartOfAccountsApi } from '../api'
import ChartOfAccountFormDrawer from '../components/ChartOfAccountFormDrawer.vue'
import { ACCOUNT_TYPES, INCOME_STATEMENT_LINES, type AccountType, type ChartOfAccount } from '../types'

const { can } = useAuth()
const manage = computed(() => can('accounting.manage'))

/** Every account, for parents, codes and subtypes in the form; the table shows the filtered list. */
const all = ref<ChartOfAccount[]>([])
const accounts = ref<ChartOfAccount[]>([])
const loading = ref(false)
const error = ref('')
const notice = ref('')
const search = ref('')
const typeFilter = ref<AccountType | ''>('')
const TYPE_OPTIONS: { label: string; value: AccountType | '' }[] = [{ label: 'All', value: '' }, ...ACCOUNT_TYPES.map((value) => ({ label: formatEnum(value), value }))]
const collapsed = ref(new Set<AccountType>())
const editing = ref(false)
const selected = ref<ChartOfAccount | null>(null)
const busy = ref(new Set<number>())
let debounce: ReturnType<typeof setTimeout> | undefined
let sequence = 0

/**
 * Accounts in tree order: each parent followed by its sub-accounts, siblings by sort order then code,
 * so a new account shows under the parent it was created in whatever its code. Search results stay in
 * code order because their parents may not match the search.
 */
function treeOrder(rows: ChartOfAccount[]): ChartOfAccount[] {
  if (search.value.trim()) return rows
  const ids = new Set(rows.map((account) => account.id))
  const children = new Map<number | null, ChartOfAccount[]>()
  for (const account of rows) {
    const parent = account.parent_id !== null && ids.has(account.parent_id) ? account.parent_id : null
    children.set(parent, [...(children.get(parent) ?? []), account])
  }
  const bySortThenCode = (a: ChartOfAccount, b: ChartOfAccount) =>
    (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER) || a.code.localeCompare(b.code)
  const ordered: ChartOfAccount[] = []
  const visit = (parent: number | null) => {
    for (const account of (children.get(parent) ?? []).sort(bySortThenCode)) {
      ordered.push(account)
      visit(account.id)
    }
  }
  visit(null)
  return ordered
}

const hasStatementLines = computed(() => groups.value.some((group) => group.type === 'income' || group.type === 'expense'))
const columnCount = computed(() => 6 + (hasStatementLines.value ? 1 : 0) + (manage.value ? 1 : 0))

const groups = computed(() =>
  ACCOUNT_TYPES.map((type) => ({ type, rows: treeOrder(accounts.value.filter((account) => account.type === type)) })).filter((group) => group.rows.length > 0),
)

async function load() {
  const current = ++sequence
  loading.value = true
  error.value = ''
  try {
    const [filtered, everything] = await Promise.all([
      chartOfAccountsApi.list({ search: search.value.trim() || undefined, type: typeFilter.value || undefined }),
      chartOfAccountsApi.list(),
    ])
    if (current !== sequence) return
    accounts.value = filtered.data
    all.value = everything.data
  } catch (failure) {
    if (current === sequence) error.value = failure instanceof Error ? failure.message : 'Could not load the chart of accounts.'
  } finally {
    if (current === sequence) loading.value = false
  }
}

async function withRow(account: ChartOfAccount, action: () => Promise<void>) {
  busy.value.add(account.id)
  error.value = ''
  notice.value = ''
  try {
    await action()
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The change was not saved.'
  } finally {
    busy.value.delete(account.id)
  }
}

const saveLine = (account: ChartOfAccount, event: Event) =>
  withRow(account, async () => {
    const select = event.target as HTMLSelectElement
    try {
      const updated = await chartOfAccountsApi.update(account.id, { income_statement_line: select.value || null })
      account.income_statement_line = updated.income_statement_line
    } catch (failure) {
      select.value = account.income_statement_line ?? ''
      throw failure
    }
  })

function edit(account: ChartOfAccount | null) {
  selected.value = account
  editing.value = true
}

function saved(account: ChartOfAccount) {
  notice.value = `${account.code} · ${account.name} saved.`
  void load()
}

function toggle(type: AccountType) {
  if (collapsed.value.has(type)) collapsed.value.delete(type)
  else collapsed.value.add(type)
}

watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(load, 350)
})
watch(typeFilter, load)
onMounted(load)
</script>

<template>
  <div class="tw-scope flex flex-col gap-4">
    <PageHeader title="Chart of accounts" description="General ledger account structure for the SACCO.">
      <Button v-if="manage" size="sm" @click="edit(null)"><Plus /> Add account</Button>
    </PageHeader>

    <p v-if="error" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
    <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>

    <DataPanel label="Chart of accounts">
      <template #toolbar>
        <div class="relative min-w-52 flex-1 lg:max-w-72">
          <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="search" type="search" placeholder="Code or name" aria-label="Search accounts" class="h-8 pl-8 text-sm" />
        </div>
        <SegmentedControl v-model="typeFilter" :options="TYPE_OPTIONS" label="Account type" />
      </template>

      <Table class="tabular-nums" :aria-busy="loading || undefined">
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead>GL code</TableHead>
            <TableHead>Account name</TableHead>
            <TableHead>Subtype</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Postable</TableHead>
            <TableHead>Status</TableHead>
            <TableHead v-if="hasStatementLines">Income statement line</TableHead>
            <TableHead v-if="manage"><span class="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody v-if="loading && !accounts.length">
          <TableRow v-for="row in 10" :key="row" class="hover:bg-transparent">
            <TableCell v-for="column in columnCount" :key="column" class="py-2.5"><Skeleton class="h-4 w-full max-w-32 bg-muted" /></TableCell>
          </TableRow>
        </TableBody>

        <TableBody v-else-if="!accounts.length">
          <TableRow class="hover:bg-transparent">
            <TableCell :colspan="columnCount" class="py-14 text-center">
              <p class="font-medium">No accounts match</p>
              <p class="mt-1 text-muted-foreground">Clear the search or choose another type.</p>
            </TableCell>
          </TableRow>
        </TableBody>

        <template v-else>
          <TableBody v-for="group in groups" :key="group.type">
            <TableRow class="bg-muted/50 hover:bg-muted">
              <TableCell :colspan="columnCount" class="p-0">
                <button type="button" class="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left font-semibold text-navy dark:text-white" :aria-expanded="!collapsed.has(group.type)" @click="toggle(group.type)">
                  <component :is="collapsed.has(group.type) ? ChevronRight : ChevronDown" class="size-4 text-muted-foreground" aria-hidden="true" />
                  {{ formatEnum(group.type) }}
                  <span class="font-normal text-muted-foreground">{{ group.rows.length }} accounts</span>
                </button>
              </TableCell>
            </TableRow>
            <template v-if="!collapsed.has(group.type)">
              <TableRow v-for="account in group.rows" :key="account.id">
                <TableCell class="font-medium text-muted-foreground">{{ account.code }}</TableCell>
                <TableCell>
                  <span class="inline-flex items-center gap-1.5" :style="{ paddingLeft: `${(account.level - 1) * 1.1}rem` }" :class="{ 'font-semibold text-navy dark:text-white': account.is_control }">
                    {{ account.name }}
                    <span v-if="account.is_control" class="badge">Header</span>
                  </span>
                </TableCell>
                <TableCell class="text-muted-foreground">{{ account.subtype ?? '—' }}</TableCell>
                <TableCell class="text-muted-foreground">{{ account.normal_balance === 'debit' ? 'DR' : 'CR' }}</TableCell>
                <TableCell class="text-muted-foreground">{{ account.is_postable ? 'Yes' : 'No' }}</TableCell>
                <TableCell><span class="badge" :class="{ 'badge--active': account.is_active }">{{ account.is_active ? 'Active' : 'Inactive' }}</span></TableCell>
                <TableCell v-if="hasStatementLines" class="py-2">
                  <select
                    v-if="group.type === 'income' || group.type === 'expense'"
                    :id="`coa-line-${account.id}`"
                    :value="account.income_statement_line ?? ''"
                    :aria-label="`Income statement line for ${account.name}`"
                    :disabled="!manage || busy.has(account.id)"
                    class="h-7 max-w-60 rounded-md py-0 text-[0.8125rem]"
                    @change="saveLine(account, $event)"
                  >
                    <option value="">Inherit from parent / unclassified</option>
                    <option v-for="line in INCOME_STATEMENT_LINES.filter((item) => item.type === account.type)" :key="line.key" :value="line.key">{{ line.label }}</option>
                  </select>
                </TableCell>
                <TableCell v-if="manage" class="py-2.5 text-right">
                  <Button v-if="account.is_postable" variant="outline" size="xs" @click="edit(account)">Edit</Button>
                  <span v-else class="text-muted-foreground" title="Headers are the chart's fixed structure and cannot be edited.">—</span>
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </template>
      </Table>
    </DataPanel>

    <ChartOfAccountFormDrawer v-model:open="editing" :account="selected" :accounts="all" @saved="saved" />
  </div>
</template>
