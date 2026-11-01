<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { List, Plus, Trash2 } from 'lucide-vue-next'
import AppDrawer from '@/core/components/AppDrawer.vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { ApiError } from '@/core/api/http'
import { formatMoney } from '@/core/utils/format'
import { chartOfAccountsApi, journalEntriesApi } from '../api'
import { COST_CENTRES, JOURNAL_ENTRY_TYPES, type CostCentre, type JournalEntry, type JournalEntryStatus, type StoreJournalEntryPayload } from '../types'

/** A manual journal voucher: post it straight to the ledger, or save it as a draft to post later. */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [entry: JournalEntry] }>()

interface Line {
  key: number
  chart_of_account_id: number | null
  memo: string
  cost_centre: CostCentre
  debit: number | null
  credit: number | null
}

const today = () => new Date().toISOString().slice(0, 10)

const form = ref({ entry_date: today(), period: today().slice(0, 7), entry_type: 'adjusting' as StoreJournalEntryPayload['entry_type'], reference: '', description: '' })
const lines = ref<Line[]>([])
const accounts = ref<{ id: number; name: string }[]>([])
const saving = ref<JournalEntryStatus | null>(null)
const error = ref('')
const errors = ref<Record<string, string[]>>({})
let nextKey = 0

const cents = (value: number | null) => Math.round((Number(value) || 0) * 100)
const totalDebit = computed(() => lines.value.reduce((sum, line) => sum + cents(line.debit), 0) / 100)
const totalCredit = computed(() => lines.value.reduce((sum, line) => sum + cents(line.credit), 0) / 100)
const inBalance = computed(() => totalDebit.value > 0 && cents(totalDebit.value) === cents(totalCredit.value))
const voucherPreview = computed(() => `JE-${(form.value.entry_date || today()).slice(0, 4)}-...`)

const periodOptions = computed(() => {
  const [year, month] = (form.value.entry_date || today()).split('-').map(Number)
  return [-1, 0, 1].map((offset) => {
    const date = new Date(year ?? 2026, (month ?? 1) - 1 + offset, 1)
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    }
  })
})

const typeLabel = (type: string) => type.charAt(0).toUpperCase() + type.slice(1)

function emptyLine(): Line {
  return { key: nextKey++, chart_of_account_id: null, memo: '', cost_centre: 'Finance', debit: null, credit: null }
}

function reset() {
  form.value = { entry_date: today(), period: today().slice(0, 7), entry_type: 'adjusting', reference: '', description: '' }
  lines.value = [emptyLine(), emptyLine()]
  error.value = ''
  errors.value = {}
}

async function loadAccounts() {
  if (accounts.value.length) return
  const chart = await chartOfAccountsApi.list({ is_active: true })
  accounts.value = chart.data
    .filter((account) => account.is_postable && account.allow_manual)
    .map((account) => ({ id: account.id, name: `${account.code} · ${account.name}` }))
}

/** A line carries a debit or a credit, never both: typing one clears the other. */
function onAmount(line: Line, side: 'debit' | 'credit') {
  if (side === 'debit' && Number(line.debit) > 0) line.credit = null
  if (side === 'credit' && Number(line.credit) > 0) line.debit = null
}

function removeLine(index: number) {
  if (lines.value.length <= 2) {
    error.value = 'A journal entry must have at least 2 lines.'
    return
  }
  lines.value.splice(index, 1)
}

const populated = () =>
  lines.value.filter((line) => line.chart_of_account_id !== null || Number(line.debit) > 0 || Number(line.credit) > 0 || line.memo.trim() !== '')

function validate(status: JournalEntryStatus): string | null {
  const filled = populated()
  if (!form.value.description.trim()) return 'Enter a description or memo.'
  if (filled.length < 2) return 'A journal entry must have at least two populated lines.'
  const invalid = filled.some((line) =>
    !line.chart_of_account_id || (Number(line.debit) > 0) === (Number(line.credit) > 0))
  if (invalid) return 'Each line needs an account and either a debit or a credit.'
  if (status === 'posted' && !inBalance.value) return 'Journal entry is out of balance.'
  return null
}

async function submit(status: JournalEntryStatus) {
  const problem = validate(status)
  error.value = problem ?? ''
  if (problem) return

  saving.value = status
  errors.value = {}
  try {
    const entry = await journalEntriesApi.create({
      ...form.value,
      reference: form.value.reference.trim() || null,
      status,
      lines: populated().map((line) => ({
        chart_of_account_id: line.chart_of_account_id as number,
        memo: line.memo.trim() || null,
        cost_centre: line.cost_centre,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      })),
    })
    emit('saved', entry)
    open.value = false
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Failed to save journal entry.'
    errors.value = failure instanceof ApiError ? failure.errors : {}
  } finally {
    saving.value = null
  }
}

watch(() => form.value.entry_date, (value) => {
  if (value) form.value.period = value.slice(0, 7)
})

watch(open, (isOpen) => {
  if (!isOpen) return
  reset()
  loadAccounts().catch(() => {
    error.value = 'The chart of accounts could not be loaded.'
  })
})

const input = 'h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand dark:text-white'
const cellInput = 'h-8 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand dark:text-white'
</script>

<template>
  <AppDrawer v-model:open="open" title="New journal entry" width="w-full md:max-w-[calc(100vw-16rem)] xl:max-w-6xl" :loading="saving !== null">
    <div class="flex w-full min-w-0 flex-col gap-5">
      <div class="flex items-center justify-between gap-3">
        <span class="badge badge--draft">Draft</span>
        <span class="truncate text-sm font-semibold tabular-nums text-muted-foreground">{{ voucherPreview }}</span>
      </div>

      <p v-if="error" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{{ error }}</p>

      <div class="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Entry date</span>
          <input v-model="form.entry_date" type="date" required :class="input" />
          <span v-if="errors.entry_date" class="text-xs text-red-500">{{ errors.entry_date[0] }}</span>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Period</span>
          <select v-model="form.period" :class="input">
            <option v-for="period in periodOptions" :key="period.value" :value="period.value">{{ period.label }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Entry type</span>
          <select v-model="form.entry_type" :class="input">
            <option v-for="type in JOURNAL_ENTRY_TYPES" :key="type" :value="type">{{ typeLabel(type) }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Currency</span>
          <select :class="input" disabled title="The ledger is kept in Ugandan shillings">
            <option>UGX - Ugandan Shilling</option>
          </select>
        </label>
      </div>

      <div class="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-4">
        <label class="flex flex-col gap-1.5 md:col-span-3">
          <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Description / memo</span>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Describe the purpose of this entry..."
            class="rounded-lg border border-border bg-background px-4 py-3 font-[inherit] text-sm outline-none focus:border-brand dark:text-white"
          />
          <span v-if="errors.description" class="text-xs text-red-500">{{ errors.description[0] }}</span>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Reference <span class="font-normal text-muted-foreground">(optional)</span></span>
          <input v-model="form.reference" maxlength="50" placeholder="Defaults to the voucher no." :class="input" />
          <span v-if="errors.reference" class="text-xs text-red-500">{{ errors.reference[0] }}</span>
        </label>
      </div>

      <div class="flex w-full min-w-0 flex-col gap-3">
        <div class="flex items-center gap-2">
          <List class="h-4 w-4 text-muted-foreground" />
          <h3 class="text-subsection text-heading">Entry Lines</h3>
        </div>

        <!-- Scrolls sideways only on narrow screens; at drawer width the account dropdown may overflow the table. -->
        <div class="w-full overflow-x-auto rounded-lg border border-border bg-background lg:overflow-visible">
          <table class="w-full min-w-[980px] text-sm">
            <thead class="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th class="w-[30%] min-w-[250px] rounded-tl-lg px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Account</th>
                <th class="w-[25%] min-w-[200px] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Description</th>
                <th class="w-[15%] min-w-[150px] px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Cost Centre</th>
                <th class="w-[12%] min-w-[120px] px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Debit</th>
                <th class="w-[12%] min-w-[120px] px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">Credit</th>
                <th class="w-[6%] min-w-[60px] rounded-tr-lg px-4 py-3"><span class="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
              <tr v-for="(line, index) in lines" :key="line.key" class="align-top">
                <td class="px-4 py-3">
                  <SearchableSelect
                    v-model="line.chart_of_account_id"
                    :options="accounts"
                    placeholder="Select account"
                    :error="errors[`lines.${index}.chart_of_account_id`]?.[0] ?? errors[`lines.${index}`]?.[0]"
                  />
                </td>
                <td class="px-4 py-3">
                  <input v-model="line.memo" type="text" placeholder="Line memo" maxlength="255" :aria-label="`Line ${index + 1} memo`" :class="cellInput" />
                </td>
                <td class="px-4 py-3">
                  <select v-model="line.cost_centre" :aria-label="`Line ${index + 1} cost centre`" :class="cellInput">
                    <option v-for="centre in COST_CENTRES" :key="centre" :value="centre">{{ centre }}</option>
                  </select>
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="line.debit" type="number" min="0" step="0.01" placeholder="0.00" :aria-label="`Line ${index + 1} debit`" :class="[cellInput, 'text-right tabular-nums']" @input="onAmount(line, 'debit')" />
                </td>
                <td class="px-4 py-3">
                  <input v-model.number="line.credit" type="number" min="0" step="0.01" placeholder="0.00" :aria-label="`Line ${index + 1} credit`" :class="[cellInput, 'text-right tabular-nums']" @input="onAmount(line, 'credit')" />
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    type="button"
                    :aria-label="`Remove line ${index + 1}`"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    @click="removeLine(index)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <button type="button" class="flex w-full cursor-pointer items-center gap-2 rounded-b-lg border-t border-border bg-muted/50 px-4 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" @click="lines.push(emptyLine())">
            <Plus class="h-4 w-4" />
            Add line
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-4 rounded-lg border border-border bg-neutral-50 px-5 py-4 md:flex-row md:items-center md:justify-between dark:bg-neutral-900">
        <div class="flex items-center gap-3">
          <span class="text-sm font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">Balance Check</span>
          <span
            class="rounded-full px-3 py-1 text-xs font-bold"
            :class="inBalance ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'"
            aria-live="polite"
          >
            {{ inBalance ? 'Balanced' : 'Out of balance' }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-6 text-right">
          <div>
            <p class="text-xs font-semibold text-muted-foreground">Total debits</p>
            <p class="text-lg font-semibold tabular-nums text-neutral-950 dark:text-white">{{ formatMoney(totalDebit) }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold text-muted-foreground">Total credits</p>
            <p class="text-lg font-semibold tabular-nums text-neutral-950 dark:text-white">{{ formatMoney(totalCredit) }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #actions>
      <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" :disabled="saving !== null" class="rounded-lg border border-border bg-background px-4 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 dark:text-neutral-200" @click="open = false">
          Discard
        </button>
        <button type="button" :disabled="saving !== null" class="rounded-lg border border-border bg-background px-4 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200" @click="submit('draft')">
          {{ saving === 'draft' ? 'Saving...' : 'Save draft' }}
        </button>
        <button type="button" :disabled="saving !== null || !inBalance" class="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40" @click="submit('posted')">
          {{ saving === 'posted' ? 'Posting...' : 'Post entry' }}
        </button>
      </div>
    </template>
  </AppDrawer>
</template>
