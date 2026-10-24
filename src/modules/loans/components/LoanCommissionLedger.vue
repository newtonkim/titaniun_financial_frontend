<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ApiError } from '@/core/api/http'
import { formatDate, formatMoney } from '@/core/utils/format'
import { chartOfAccountsApi, journalEntriesApi } from '@/modules/accounting/api'
import type { ChartOfAccount, JournalEntry } from '@/modules/accounting/types'
import { loanCommissionsApi } from '../api'
import type { LoanCommission } from '../types'

const props = defineProps<{ loanId?: number }>()
const items = ref<LoanCommission[]>([])
const summary = ref({ earned: '0.00', payable: '0.00', paid: '0.00' })
const status = ref('')
const periodBasis = ref<'collection' | 'distribution'>('distribution')
const quarter = ref(0)
const year = ref(new Date().getFullYear())
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const errors = ref<Record<string, string[]>>({})
const selected = ref<LoanCommission | null>(null)
const accounts = ref<ChartOfAccount[]>([])
const journal = ref<JournalEntry | null>(null)
const form = reactive({
  paid_at: new Date().toLocaleDateString('en-CA'),
  payment_reference: '',
  payment_method: 'bank_transfer',
  payment_account_id: 0,
})
let sequence = 0

async function load(target = 1) {
  const current = ++sequence
  loading.value = true
  error.value = ''
  try {
    const result = await loanCommissionsApi.list({
      loan_id: props.loanId,
      status: status.value || undefined,
      year: year.value,
      quarter: quarter.value || undefined,
      period_basis: periodBasis.value,
      page: target,
    })
    if (current !== sequence) return
    items.value = result.data
    summary.value = result.summary
    page.value = result.meta.current_page
    lastPage.value = result.meta.last_page
  } catch (failure) {
    if (current === sequence) error.value = failure instanceof Error ? failure.message : 'Could not load commissions.'
  } finally {
    if (current === sequence) loading.value = false
  }
}
async function startPayment(item: LoanCommission) {
  busy.value = true
  error.value = ''
  errors.value = {}
  notice.value = ''
  try {
    const result = await chartOfAccountsApi.list({ is_active: true })
    accounts.value = result.data.filter(
      (account) =>
        account.is_active &&
        account.is_postable &&
        account.type === 'asset' &&
        ['Cash', 'Bank'].includes(account.subtype ?? ''),
    )
    selected.value = item
    form.paid_at = latestPayoutDate()
    form.payment_reference = ''
    form.payment_account_id = accounts.value[0]?.id ?? 0
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Could not load payout accounts.'
  } finally {
    busy.value = false
  }
}
async function pay() {
  if (!selected.value || busy.value) return
  busy.value = true
  error.value = ''
  errors.value = {}
  try {
    await loanCommissionsApi.pay(selected.value.id, {
      ...form,
      payment_reference: form.payment_reference.trim(),
    })
    selected.value = null
    notice.value = 'Commission payout recorded and posted to accounting.'
    await load(page.value)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Could not record the payout.'
    errors.value = failure instanceof ApiError ? failure.errors : {}
  } finally {
    busy.value = false
  }
}
async function showJournal(id: number) {
  busy.value = true
  error.value = ''
  try {
    journal.value = await journalEntriesApi.show(id)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'Could not load journal.'
  } finally {
    busy.value = false
  }
}
function latestPayoutDate() {
  const now = new Date()
  const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0)
  const date =
    now.getDate() === quarterEnd.getDate() && now.getMonth() === quarterEnd.getMonth()
      ? quarterEnd
      : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0)
  return date.toLocaleDateString('en-CA')
}
function canPay(item: LoanCommission) {
  return (
    item.status === 'payable' &&
    !item.held_for_clearance &&
    item.eligible_on !== null &&
    item.eligible_on <= latestPayoutDate()
  )
}
watch([() => props.loanId, status, quarter, year, periodBasis], () => {
  selected.value = null
  void load()
})
onMounted(() => load())
</script>

<template>
  <section class="loan-card" aria-label="Commission ledger" :aria-busy="loading">
    <div class="loan-card-heading"><h2>Interest commissions</h2></div>
    <p class="loan-hint">
      Commission is earned on collected interest and held until the client clears the loan principal and interest.
      Unpaid commission carries forward to the quarter-end distribution after clearance. Distribution views include
      unpaid commissions from earlier quarters.
    </p>
    <dl class="loan-summary-list" style="margin: 20px 0">
      <div>
        <dt>{{ periodBasis === 'distribution' ? 'Tracked commission (including carried forward)' : 'Earned' }}</dt>
        <dd>{{ formatMoney(summary.earned) }}</dd>
      </div>
      <div>
        <dt>Unpaid liability</dt>
        <dd>{{ formatMoney(summary.payable) }}</dd>
      </div>
      <div>
        <dt>Paid</dt>
        <dd>{{ formatMoney(summary.paid) }}</dd>
      </div>
    </dl>
    <div class="loan-fields" style="margin-bottom: 18px">
      <label class="loan-field-label"
        >Period view<select v-model="periodBasis" :disabled="busy">
          <option value="distribution">Quarterly distribution, including carried forward</option>
          <option value="collection">Interest collection period</option>
        </select></label
      >
      <label class="loan-field-label"
        >{{ periodBasis === 'distribution' ? 'Distribution year' : 'Collection year'
        }}<input v-model.number="year" type="number" min="1900" max="9999" :disabled="busy"
      /></label>
      <label class="loan-field-label"
        >{{ periodBasis === 'distribution' ? 'Distribution quarter' : 'Collection quarter'
        }}<select v-model.number="quarter" :disabled="busy">
          <option :value="0">Full year</option>
          <option :value="1">Q1 · January–March</option>
          <option :value="2">Q2 · April–June</option>
          <option :value="3">Q3 · July–September</option>
          <option :value="4">Q4 · October–December</option>
        </select></label
      >
      <label class="loan-field-label"
        >Payment status<select v-model="status" :disabled="busy">
          <option value="">All commissions</option>
          <option value="payable">Unpaid</option>
          <option value="paid">Paid</option>
        </select></label
      >
    </div>
    <p v-if="error" class="loan-notice" role="alert">{{ error }}</p>
    <p v-if="notice" class="loan-hint" role="status">{{ notice }}</p>
    <p v-if="loading" class="loan-empty" role="status">Loading commissions…</p>
    <div v-else-if="items.length" class="loan-table-wrap">
      <table class="loan-table">
        <thead>
          <tr>
            <th>Loan / repayment</th>
            <th>Recipient</th>
            <th>Interest collected</th>
            <th>Commission</th>
            <th>Eligible payout</th>
            <th>Status / payment</th>
            <th>Accounting</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <RouterLink class="loan-link" :to="{ name: 'loans.show', params: { id: item.loan_id } }">{{
                item.loan_number ?? item.loan_id
              }}</RouterLink
              ><br />Repayment #{{ item.loan_repayment_id }}<br />{{ formatDate(item.earned_at) }}
            </td>
            <td>
              {{ item.beneficiary_member?.name ?? item.beneficiary?.name ?? 'Recipient unavailable' }}
            </td>
            <td>{{ formatMoney(item.interest_amount) }}</td>
            <td>
              {{ formatMoney(item.amount) }}<br /><small>{{ item.commission_rate }}% of interest</small>
            </td>
            <td>
              <template v-if="item.eligible_on"
                >{{ formatDate(item.eligible_on) }}<br /><small
                  >Loan cleared {{ formatDate(item.loan_cleared_at) }}</small
                ></template
              >
              <template v-else>Awaiting full loan clearance</template>
            </td>
            <td>
              <template v-if="item.status === 'paid'"
                >Paid {{ formatDate(item.paid_at) }}<br />{{ item.payment_reference }}<br /><small
                  >Recorded by staff #{{ item.paid_by }}</small
                ></template
              ><template v-else
                ><span>Unpaid</span><br /><button
                  v-if="canPay(item)"
                  type="button"
                  class="loan-link"
                  :disabled="busy"
                  @click="startPayment(item)"
                >
                  Record payout</button
                ><small v-else>{{
                  item.held_for_clearance
                    ? 'Held until the client clears the loan; carries forward'
                    : 'Held for quarterly payout'
                }}</small></template
              >
            </td>
            <td>
              <button type="button" class="loan-link" :disabled="busy" @click="showJournal(item.journal_entry_id)">
                Accrual #{{ item.journal_entry_id }}</button
              ><br /><button
                v-if="item.payment_journal_entry_id"
                type="button"
                class="loan-link"
                :disabled="busy"
                @click="showJournal(item.payment_journal_entry_id)"
              >
                Payout #{{ item.payment_journal_entry_id }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="loan-empty">No commissions match this view. Commission appears when interest is collected.</p>
    <div v-if="lastPage > 1" class="loan-navigation" style="margin-top: 18px">
      <button class="loan-button loan-button--outline" :disabled="busy || loading || page <= 1" @click="load(page - 1)">
        Previous</button
      ><span>Page {{ page }} of {{ lastPage }}</span
      ><button
        class="loan-button loan-button--outline"
        :disabled="busy || loading || page >= lastPage"
        @click="load(page + 1)"
      >
        Next
      </button>
    </div>
    <form v-if="selected" class="loan-action-form loan-subform" @submit.prevent="pay">
      <h3>Record payout to {{ selected.beneficiary_member?.name ?? selected.beneficiary?.name }}</h3>
      <p>{{ formatMoney(selected.amount) }} · Eligible from {{ formatDate(selected.eligible_on) }}</p>
      <p class="loan-hint">
        Record this after the money has been sent. This records the payout and accounting; it does not initiate a bank
        or mobile-money transfer.
      </p>
      <fieldset :disabled="busy" style="border: 0; padding: 0">
        <div class="loan-fields">
          <label class="loan-field-label"
            >Paid on<input v-model="form.paid_at" type="date" :min="selected.eligible_on ?? undefined" required
          /></label>
          <label class="loan-field-label"
            >Payment reference<input v-model="form.payment_reference" maxlength="100" required
          /></label>
          <label class="loan-field-label"
            >Payment method<select v-model="form.payment_method">
              <option value="bank_transfer">Bank transfer</option>
              <option value="mobile_money">Mobile money</option>
              <option value="cash">Cash</option>
            </select></label
          >
          <label class="loan-field-label"
            >Cash / bank account<select v-model.number="form.payment_account_id" required>
              <option :value="0" disabled>Select account</option>
              <option v-for="account in accounts" :key="account.id" :value="account.id">
                {{ account.code }} · {{ account.name }}
              </option>
            </select></label
          >
        </div>
        <p v-for="(messages, field) in errors" :key="field" class="loan-field-error">
          {{ messages[0] }}
        </p>
        <div class="loan-navigation" style="margin-top: 16px">
          <button type="button" class="loan-button loan-button--outline" @click="selected = null">Cancel</button
          ><button type="submit" class="loan-button loan-button--primary">
            {{ busy ? 'Recording…' : 'Record full payout' }}
          </button>
        </div>
      </fieldset>
    </form>
    <section v-if="journal" class="loan-subform" aria-label="Commission accounting entry">
      <div class="loan-card-heading">
        <h3>{{ journal.reference }} · {{ formatDate(journal.entry_date) }}</h3>
        <button type="button" class="loan-link" @click="journal = null">Close</button>
      </div>
      <p class="loan-hint">{{ journal.description }}</p>
      <div class="loan-table-wrap">
        <table class="loan-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in journal.lines" :key="line.id">
              <td>{{ line.account?.code }} · {{ line.account?.name }}</td>
              <td>{{ formatMoney(line.debit) }}</td>
              <td>{{ formatMoney(line.credit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
