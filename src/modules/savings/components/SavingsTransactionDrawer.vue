<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { formatMoney, today } from '@/core/utils/format'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import { savingsAccountsApi } from '../api'
import type { SavingsAccount, SavingsTransaction } from '../types'

/** Record a deposit to, or a withdrawal from, one of a member's active savings accounts. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ type: 'deposit' | 'withdrawal'; accounts: SavingsAccount[] }>()
const emit = defineEmits<{ saved: [transaction: SavingsTransaction] }>()

const cashAccounts = ref<ChartOfAccount[]>([])
const accountId = ref<number | null>(null)
const active = computed(() => props.accounts.filter((account) => account.status === 'active'))
const account = computed(() => active.value.find((item) => item.id === accountId.value) ?? null)
const deposit = computed(() => props.type === 'deposit')

const form = useForm({ amount: '', transacted_at: today(), reference: '', payment_account_id: null as number | null }, (data) => {
  if (!accountId.value) throw new Error('Choose a savings account.')
  return savingsAccountsApi.recordTransaction(accountId.value, { type: props.type, ...data, reference: data.reference || null })
})

watch(open, async (isOpen) => {
  if (!isOpen) return
  accountId.value = active.value[0]?.id ?? null
  Object.assign(form.data, { amount: '', transacted_at: today(), reference: '', payment_account_id: null })
  form.errors.value = {}
  form.message.value = null
  const result = await chartOfAccountsApi.list({ is_active: true, is_postable: true, type: 'asset' })
  cashAccounts.value = result.data.filter((item) => ['Cash', 'Bank'].includes(item.subtype ?? ''))
  form.data.payment_account_id = account.value?.product?.cash_account_id ?? cashAccounts.value[0]?.id ?? null
})

watch(accountId, () => {
  if (account.value?.product?.cash_account_id) form.data.payment_account_id = account.value.product.cash_account_id
})

async function save() {
  const transaction = await form.submit()
  if (!transaction) return
  emit('saved', transaction)
  open.value = false
}
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="deposit ? 'Deposit to savings' : 'Withdraw from savings'"
    :description="deposit ? 'Money the member pays into a savings account.' : 'Money paid out to the member. The balance cannot fall below the product minimum.'"
    :save-button-text="deposit ? 'Record deposit' : 'Record withdrawal'"
    :loading="form.processing.value"
    :save-disabled="!accountId"
    @save="save"
  >
    <p v-if="form.message.value" class="alert alert--error" role="alert">{{ form.message.value }}</p>
    <p v-if="!active.length" class="alert alert--error" role="alert">This member has no active savings account. Add one first.</p>
    <div class="form-grid">
      <FormField label="Savings account" class="span-all">
        <select id="savings-tx-account" v-model="accountId" required>
          <option v-for="item in active" :key="item.id" :value="item.id">
            {{ item.account_number }} · {{ item.product?.name }} · {{ formatMoney(item.balance) }}
          </option>
        </select>
      </FormField>
      <FormField label="Amount (UGX)" :error="form.error('amount')">
        <input id="savings-tx-amount" v-model="form.data.amount" type="number" min="1" step="0.01" required />
      </FormField>
      <FormField label="Date" :error="form.error('transacted_at')">
        <input id="savings-tx-date" v-model="form.data.transacted_at" type="date" :max="today()" required />
      </FormField>
      <FormField :label="deposit ? 'Paid into' : 'Paid from'" :error="form.error('payment_account_id')">
        <select id="savings-tx-payment" v-model="form.data.payment_account_id">
          <option v-for="item in cashAccounts" :key="item.id" :value="item.id">{{ item.code }} · {{ item.name }}</option>
        </select>
      </FormField>
      <FormField label="Reference" :error="form.error('reference')">
        <input id="savings-tx-reference" v-model="form.data.reference" maxlength="100" placeholder="Receipt or slip number" />
      </FormField>
    </div>
    <p v-if="account && !deposit && Number(account.product?.minimum_balance ?? 0) > 0" class="muted">
      The {{ account.product?.name }} keeps a minimum balance of {{ formatMoney(account.product?.minimum_balance) }}.
    </p>
  </AppDrawer>
</template>
