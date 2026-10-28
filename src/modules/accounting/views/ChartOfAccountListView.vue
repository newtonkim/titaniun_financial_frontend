<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-vue-next'
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
const collapsed = ref(new Set<AccountType>())
const editing = ref(false)
const selected = ref<ChartOfAccount | null>(null)
const confirmingDelete = ref<number | null>(null)
const busy = ref(new Set<number>())
let debounce: ReturnType<typeof setTimeout> | undefined
let sequence = 0

const groups = computed(() =>
  ACCOUNT_TYPES.map((type) => ({ type, rows: accounts.value.filter((account) => account.type === type) })).filter((group) => group.rows.length > 0),
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

const remove = (account: ChartOfAccount) =>
  withRow(account, async () => {
    confirmingDelete.value = null
    await chartOfAccountsApi.remove(account.id)
    notice.value = `${account.code} · ${account.name} deleted.`
    await load()
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
  <section class="coa">
    <header class="coa__header">
      <div>
        <h1>Chart of accounts</h1>
        <p class="muted">General ledger account structure for the SACCO.</p>
      </div>
      <button v-if="manage" type="button" class="btn btn--primary" @click="edit(null)"><Plus :size="16" aria-hidden="true" /> Add account</button>
    </header>

    <div class="coa__tools">
      <label class="coa__search">
        <Search :size="16" aria-hidden="true" />
        <input id="coa-search" v-model="search" type="search" placeholder="Search by code or name…" aria-label="Search accounts" />
      </label>
      <div class="coa__chips" role="group" aria-label="Account type">
        <button type="button" class="chip" :class="{ 'chip--on': typeFilter === '' }" @click="typeFilter = ''">All</button>
        <button v-for="type in ACCOUNT_TYPES" :key="type" type="button" class="chip" :class="{ 'chip--on': typeFilter === type }" @click="typeFilter = type">
          {{ formatEnum(type) }}
        </button>
      </div>
    </div>

    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>
    <p v-if="notice" class="muted" role="status">{{ notice }}</p>
    <p v-if="loading && !accounts.length" class="muted" role="status">Loading the chart of accounts…</p>
    <p v-else-if="!loading && !accounts.length" class="panel empty">No accounts match. Clear the search or choose another type.</p>

    <div v-for="group in groups" :key="group.type" class="panel coa__group" :aria-busy="loading">
      <button type="button" class="coa__group-head" :aria-expanded="!collapsed.has(group.type)" @click="toggle(group.type)">
        <span class="type-pill" :class="`type-pill--${group.type}`">{{ formatEnum(group.type) }}</span>
        <span class="muted">{{ group.rows.length }} accounts</span>
        <component :is="collapsed.has(group.type) ? ChevronRight : ChevronDown" :size="16" class="coa__chevron" aria-hidden="true" />
      </button>
      <div v-show="!collapsed.has(group.type)" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>GL code</th>
              <th>Account name</th>
              <th>Subtype</th>
              <th>Balance</th>
              <th>Postable</th>
              <th>Status</th>
              <th v-if="group.type === 'income' || group.type === 'expense'">Income statement line</th>
              <th v-if="manage" class="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in group.rows" :key="account.id">
              <td class="coa__code">{{ account.code }}</td>
              <td>
                <span class="coa__name" :style="{ paddingLeft: `${(account.level - 1) * 1.1}rem` }" :class="{ 'coa__name--header': account.is_control }">
                  {{ account.name }}
                  <span v-if="account.is_control" class="badge">Header</span>
                </span>
              </td>
              <td class="muted">{{ account.subtype ?? '—' }}</td>
              <td><span class="balance" :class="`balance--${account.normal_balance}`">{{ account.normal_balance === 'debit' ? 'DR' : 'CR' }}</span></td>
              <td><span class="dot" :class="{ 'dot--on': account.is_postable }" :aria-label="account.is_postable ? 'Postable' : 'Not postable'" /></td>
              <td><span class="badge" :class="{ 'badge--active': account.is_active }">{{ account.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td v-if="group.type === 'income' || group.type === 'expense'">
                <select
                  :id="`coa-line-${account.id}`"
                  :value="account.income_statement_line ?? ''"
                  :aria-label="`Income statement line for ${account.name}`"
                  :disabled="!manage || busy.has(account.id)"
                  class="coa__line"
                  @change="saveLine(account, $event)"
                >
                  <option value="">Inherit from parent / unclassified</option>
                  <option v-for="line in INCOME_STATEMENT_LINES.filter((item) => item.type === account.type)" :key="line.key" :value="line.key">{{ line.label }}</option>
                </select>
              </td>
              <td v-if="manage" class="num">
                <div class="row-actions">
                  <template v-if="confirmingDelete === account.id">
                    <button type="button" class="btn btn--small btn--danger" :disabled="busy.has(account.id)" @click="remove(account)">Confirm delete</button>
                    <button type="button" class="btn btn--small" @click="confirmingDelete = null">Keep</button>
                  </template>
                  <template v-else>
                    <button type="button" class="btn btn--small" @click="edit(account)">Edit</button>
                    <button type="button" class="btn btn--small btn--danger" :disabled="account.has_postings" :title="account.has_postings ? 'Accounts with postings cannot be deleted; deactivate them instead.' : undefined" @click="confirmingDelete = account.id">Delete</button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ChartOfAccountFormDrawer v-model:open="editing" :account="selected" :accounts="all" @saved="saved" />
  </section>
</template>

<style scoped>
.coa { display: flex; flex-direction: column; gap: 1rem; }
.coa__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.coa__header p { margin: 0.25rem 0 0; }
.coa__tools { display: flex; flex-direction: column; gap: 0.75rem; }
.coa__search { position: relative; display: flex; align-items: center; max-width: 24rem; color: var(--muted); }
.coa__search svg { position: absolute; left: 0.75rem; }
.coa__search input { width: 100%; padding-left: 2.25rem; border-radius: 999px; }
.coa__chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip { border: 1px solid var(--border); background: var(--surface); color: var(--muted); border-radius: 999px; padding: 0.25rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.chip--on { background: var(--primary); border-color: var(--primary); color: var(--primary-text); }
.coa__group { padding: 0; overflow: hidden; }
.coa__group-head { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.75rem 1.25rem; background: none; border: 0; border-bottom: 1px solid var(--border); cursor: pointer; color: inherit; text-align: left; }
.coa__chevron { margin-left: auto; color: var(--muted); }
.coa__group .table-wrap { padding: 0 0.75rem 0.5rem; }
.type-pill { border-radius: 999px; padding: 0.1rem 0.65rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.type-pill--asset { background: oklch(from var(--primary) l c 250 / 0.14); color: oklch(from var(--primary) 0.5 0.15 250); }
.type-pill--liability { background: oklch(0.75 0.15 60 / 0.18); color: oklch(0.55 0.15 55); }
.type-pill--equity { background: oklch(0.7 0.15 300 / 0.16); color: oklch(0.5 0.17 300); }
.type-pill--income { background: oklch(0.75 0.15 150 / 0.16); color: oklch(0.5 0.14 150); }
.type-pill--expense { background: oklch(0.7 0.17 25 / 0.15); color: oklch(0.52 0.17 25); }
.coa__code { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 0.8rem; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.coa__name { display: inline-flex; align-items: center; gap: 0.4rem; }
.coa__name--header { font-weight: 600; color: var(--heading); }
.balance { border-radius: 999px; padding: 0.05rem 0.5rem; font-size: 0.75rem; font-weight: 700; }
.balance--debit { color: oklch(0.5 0.15 250); background: oklch(0.6 0.15 250 / 0.1); }
.balance--credit { color: oklch(0.55 0.15 55); background: oklch(0.7 0.15 60 / 0.12); }
.dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: var(--border); }
.dot--on { background: var(--success); }
.coa__line { max-width: 15rem; font-size: 0.8rem; padding: 0.3rem 0.4rem; }
</style>
