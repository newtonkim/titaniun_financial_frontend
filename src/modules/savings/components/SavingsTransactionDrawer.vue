<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Check, CircleDollarSign, Copy, Info, MinusCircle, TrendingDown, TrendingUp, Wallet } from 'lucide-vue-next'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { useForm } from '@/core/composables/useForm'
import { formatMoney, today } from '@/core/utils/format'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import { savingsAccountsApi } from '../api'
import type { SavingsAccount, SavingsTransaction } from '../types'

/**
 * Deposit to, or withdraw from, one savings account: the account card with its balance, the transaction
 * details, and a live preview of the balance afterwards.
 */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ type: 'deposit' | 'withdrawal'; account: SavingsAccount | null; memberName: string }>()
const emit = defineEmits<{ saved: [transaction: SavingsTransaction] }>()

const CURRENCY = 'UGX'
const deposit = computed(() => props.type === 'deposit')
const cashAccounts = ref<ChartOfAccount[]>([])
const copied = ref(false)

const form = useForm(
  { amount: '', payment_account_id: null as number | null, transacted_at: today(), reference: '', transacted_by: '', narration: '' },
  (data) => {
    if (!props.account) throw new Error('Choose a savings account.')
    return savingsAccountsApi.recordTransaction(props.account.id, {
      type: props.type,
      ...data,
      reference: data.reference || null,
      transacted_by: data.transacted_by || null,
      narration: data.narration || null,
    })
  },
)

const balance = computed(() => Number(props.account?.balance ?? 0))
const entered = computed(() => {
  const amount = Number(form.data.amount)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
})
const balanceAfter = computed(() => (deposit.value ? balance.value + entered.value : balance.value - entered.value))
const minimum = computed(() => Number(props.account?.product?.minimum_balance ?? 0))
const belowMinimum = computed(() => !deposit.value && entered.value > 0 && balanceAfter.value < minimum.value)

function copyCode() {
  const code = props.account?.account_number
  if (!code) return
  void navigator.clipboard?.writeText(code).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  })
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  Object.assign(form.data, { amount: '', payment_account_id: null, transacted_at: today(), reference: '', transacted_by: '', narration: '' })
  form.errors.value = {}
  form.message.value = null
  const result = await chartOfAccountsApi.list({ is_active: true, type: 'asset' })
  cashAccounts.value = result.data.filter((item) => item.is_postable && ['Cash', 'Bank'].includes(item.subtype ?? ''))
  form.data.payment_account_id = props.account?.product?.cash_account_id ?? cashAccounts.value[0]?.id ?? null
})

async function save() {
  const transaction = await form.submit()
  if (!transaction) return
  emit('saved', transaction)
  open.value = false
}

const label = 'mb-1.5 block text-[13px] font-semibold capitalize text-neutral-700 dark:text-neutral-300'
const input =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-1 focus:ring-brand'
const fieldError = 'mt-1 text-xs text-red-500'
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="deposit ? 'Deposit Savings Account' : 'Withdraw Savings Account'"
    :save-button-text="deposit ? 'Deposit' : 'Withdraw'"
    :loading="form.processing.value"
    :save-disabled="!account || entered === 0"
    width="w-full sm:max-w-[640px]"
    @save="save"
  >
    <div v-if="account" class="tw-scope flex h-full flex-col px-1">
      <p v-if="form.message.value" class="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ form.message.value }}</p>

      <!-- Account summary -->
      <div
        class="relative mb-6 overflow-hidden rounded-lg p-5 text-white shadow-sm"
        :class="deposit ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-navy to-[#2c3b7a]'"
      >
        <div class="absolute -right-8 -top-8 size-32 rounded-full bg-white/10 blur-2xl" />
        <div class="relative">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-wider text-white/60">{{ deposit ? 'Depositing to' : 'Withdrawing from' }}</p>
              <h3 class="mt-0.5 truncate text-lg font-black">{{ memberName || '—' }}</h3>
              <button type="button" class="mt-1 flex items-center gap-1.5 font-mono text-[13px] text-white/75 transition-colors hover:text-white" @click="copyCode">
                {{ account.account_number }}
                <component :is="copied ? Check : Copy" :size="12" />
              </button>
            </div>
            <span v-if="account.product" class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 text-[12px] font-semibold capitalize ring-1 ring-white/15">
              <Wallet :size="13" /> {{ account.product.name }}
            </span>
          </div>
          <div class="mt-4 border-t border-white/15 pt-4">
            <p class="text-[10px] font-bold uppercase tracking-wider text-white/60">{{ deposit ? 'Current Balance' : 'Available Balance' }}</p>
            <p class="mt-0.5 text-[28px] font-black leading-none tabular-nums">{{ CURRENCY }} {{ formatMoney(balance) }}</p>
          </div>
        </div>
      </div>

      <!-- Transaction form -->
      <div class="rounded-lg border border-border bg-background p-5">
        <p class="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <component :is="deposit ? CircleDollarSign : MinusCircle" :size="13" /> {{ deposit ? 'Deposit Details' : 'Withdrawal Details' }}
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
          <div>
            <label :class="label" for="savings-tx-amount">{{ deposit ? 'deposit amount' : 'withdrawal amount' }} <span class="text-red-500">*</span></label>
            <input id="savings-tx-amount" v-model="form.data.amount" type="number" min="1" step="0.01" required :class="input" placeholder="0.00" />
            <p v-if="form.error('amount')" :class="fieldError">{{ form.error('amount') }}</p>
          </div>
          <div>
            <label :class="label" for="savings-tx-payment">payment mode ({{ deposit ? 'Debit' : 'Credit' }} Account) <span class="text-red-500">*</span></label>
            <select id="savings-tx-payment" v-model="form.data.payment_account_id" required :class="input">
              <option v-for="item in cashAccounts" :key="item.id" :value="item.id">{{ item.code }} · {{ item.name }}</option>
            </select>
            <p v-if="form.error('payment_account_id')" :class="fieldError">{{ form.error('payment_account_id') }}</p>
          </div>
          <div>
            <label :class="label" for="savings-tx-date">transaction date</label>
            <input id="savings-tx-date" v-model="form.data.transacted_at" type="date" :max="today()" :class="input" />
            <p v-if="form.error('transacted_at')" :class="fieldError">{{ form.error('transacted_at') }}</p>
          </div>
          <div>
            <label :class="label" for="savings-tx-reference">Transaction Reference</label>
            <input id="savings-tx-reference" v-model="form.data.reference" maxlength="100" :class="input" placeholder="Transaction Reference" />
            <p v-if="form.error('reference')" :class="fieldError">{{ form.error('reference') }}</p>
          </div>
          <div class="sm:col-span-2">
            <label :class="label" for="savings-tx-by">{{ deposit ? 'deposited by' : 'withdrawn by' }}</label>
            <input id="savings-tx-by" v-model="form.data.transacted_by" maxlength="255" :class="input" :placeholder="deposit ? 'Who made the deposit' : 'Who collected the money'" />
            <p v-if="form.error('transacted_by')" :class="fieldError">{{ form.error('transacted_by') }}</p>
          </div>
          <div class="sm:col-span-2">
            <label :class="label" for="savings-tx-narration">narration</label>
            <textarea id="savings-tx-narration" v-model="form.data.narration" rows="3" maxlength="1000" :class="input" :placeholder="deposit ? 'Reason for the deposit' : 'Reason for the withdrawal'" />
            <p v-if="form.error('narration')" :class="fieldError">{{ form.error('narration') }}</p>
          </div>
        </div>

        <!-- Live balance-after preview -->
        <div
          v-if="entered > 0"
          class="mt-5 flex items-center justify-between rounded-lg border px-4 py-3"
          :class="deposit ? 'border-emerald-200 bg-emerald-50/60' : belowMinimum ? 'border-rose-200 bg-rose-50/60' : 'border-border bg-neutral-50/70'"
        >
          <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <component :is="deposit ? TrendingUp : TrendingDown" :size="15" :class="deposit ? 'text-emerald-500' : 'text-muted-foreground'" />
            {{ deposit ? 'Balance after deposit' : 'Balance after withdrawal' }}
          </div>
          <span class="text-base font-black tabular-nums" :class="deposit ? 'text-emerald-700' : belowMinimum ? 'text-rose-600' : 'text-neutral-900'">
            {{ CURRENCY }} {{ formatMoney(balanceAfter) }}
          </span>
        </div>
        <p v-if="belowMinimum" class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <AlertTriangle :size="13" />
          {{ balanceAfter < 0 ? 'Amount exceeds the available balance.' : `The ${account.product?.name} keeps a minimum balance of ${CURRENCY} ${formatMoney(minimum)}.` }}
        </p>
      </div>

      <!-- Note -->
      <div
        class="mt-5 flex items-start gap-2.5 rounded-lg border px-4 py-3"
        :class="deposit ? 'border-emerald-100 bg-emerald-50/60' : 'border-amber-100 bg-amber-50/60'"
      >
        <Info :size="15" class="mt-0.5 shrink-0" :class="deposit ? 'text-emerald-500' : 'text-amber-500'" />
        <p class="text-[12px] leading-relaxed" :class="deposit ? 'text-emerald-700' : 'text-amber-700'">
          {{
            deposit
              ? "This deposit is posted immediately to the member's account and the general ledger. Make sure the amount and payment mode are correct before saving."
              : "This withdrawal is recorded immediately in the member's account and the general ledger. Reversing it requires a separate transaction."
          }}
        </p>
      </div>
    </div>
  </AppDrawer>
</template>
