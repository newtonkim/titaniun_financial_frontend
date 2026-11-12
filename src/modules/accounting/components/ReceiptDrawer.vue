<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { formatMoney, today } from '@/core/utils/format'
import { loansApi } from '@/modules/loans/api'
import type { Loan } from '@/modules/loans/types'
import { PAYMENT_METHODS, receiptsApi, type PaymentMethod } from '../receipts'

/**
 * Take a payment. A loan repayment is recorded against the loan, which updates the accounts and issues
 * the receipt. Anything else gets a receipt only, as a written record.
 */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ issued: [receiptId: number] }>()

const kind = ref<'loan' | 'other'>('loan')
const loans = ref<Loan[]>([])
const loanId = ref<number | null>(null)
const loanOptions = computed(() => loans.value.map((loan) => ({ id: loan.id, name: `${loan.borrower?.name ?? 'Borrower'} · ${loan.loan_number}` })))
const selectedLoan = computed(() => loans.value.find((loan) => loan.id === loanId.value) ?? null)
const owed = computed(() => {
  const installments = selectedLoan.value?.installments ?? []
  return installments.reduce((sum, row) => sum + Number(row.principal) + Number(row.interest) + Number(row.fees ?? 0) - Number(row.principal_paid) - Number(row.interest_paid) - Number(row.fees_paid ?? 0), 0)
})

const form = useForm(
  { received_from: '', amount: '', purpose: '', received_on: today(), payment_method: 'cash' as PaymentMethod, payment_reference: '' },
  async (data) => {
    if (kind.value === 'loan') {
      const loan = selectedLoan.value
      if (!loan) throw new Error('Choose the loan being repaid.')
      const repayment = await loansApi.recordRepayment(loan.id, { amount: String(data.amount), paid_at: data.received_on, reference: data.payment_reference.trim(), payment_method: data.payment_method })
      if (!repayment.receipt) throw new Error('The payment was recorded but no receipt came back.')
      return repayment.receipt.id
    }
    const receipt = await receiptsApi.create({ ...data, amount: String(data.amount), payment_reference: data.payment_reference || null })
    return receipt.id
  },
)

async function save() {
  const receiptId = await form.submit()
  if (receiptId) {
    emit('issued', receiptId)
    open.value = false
  }
}

watch(loanId, async (id) => {
  if (!id) return
  const index = loans.value.findIndex((loan) => loan.id === id)
  const full = await loansApi.show(id)
  if (index >= 0) loans.value.splice(index, 1, full)
})

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(form.data, { received_from: '', amount: '', purpose: '', received_on: today(), payment_method: 'cash', payment_reference: '' })
  loanId.value = null
  form.errors.value = {}
  form.message.value = null
  void loansApi.list({ status: 'disbursed', per_page: 100 })
    .then((result) => {
      loans.value = result.data.filter((loan) => loan.uses_workflow)
    })
    .catch(() => {
      form.message.value = 'The loans could not be loaded.'
    })
})

const field = 'flex flex-col gap-1 text-sm font-medium'
const select = 'h-9 rounded-md border border-border bg-background px-3 text-sm font-normal'
const fieldError = 'text-xs font-normal text-destructive'
</script>

<template>
  <AppDrawer v-model:open="open" title="New receipt" save-button-text="Save and print receipt" :loading="form.processing.value" @save="save">
    <div class="flex flex-col gap-4">
      <p v-if="form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ form.message.value }}</p>
      <fieldset class="flex flex-col gap-2 text-sm">
        <legend class="mb-1 font-medium">What is the money for?</legend>
        <label class="flex items-start gap-2"><input v-model="kind" type="radio" value="loan" class="mt-1" /> <span>Loan repayment <span class="block text-xs text-muted-foreground">Updates the loan and the accounts, then issues the receipt.</span></span></label>
        <label class="flex items-start gap-2"><input v-model="kind" type="radio" value="other" class="mt-1" /> <span>Something else <span class="block text-xs text-muted-foreground">A receipt only. It does not change any account, so record savings and shares on their own screens.</span></span></label>
      </fieldset>

      <template v-if="kind === 'loan'">
        <div :class="field">
          <span>Loan</span>
          <SearchableSelect v-model="loanId" :options="loanOptions" placeholder="Choose the borrower's loan" />
          <span v-if="selectedLoan" class="text-xs font-normal text-muted-foreground">Still owed: UGX {{ formatMoney(owed) }}</span>
        </div>
      </template>
      <template v-else>
        <label :class="field">
          Received from
          <Input v-model="form.data.received_from" required maxlength="255" />
          <span v-if="form.error('received_from')" :class="fieldError">{{ form.error('received_from') }}</span>
        </label>
        <label :class="field">
          Being payment for
          <Input v-model="form.data.purpose" required maxlength="255" placeholder="Loan application fee" />
          <span v-if="form.error('purpose')" :class="fieldError">{{ form.error('purpose') }}</span>
        </label>
      </template>

      <div class="grid grid-cols-2 gap-3">
        <label :class="field">
          Amount (UGX)
          <Input v-model="form.data.amount" type="number" min="1" step="0.01" required class="tabular-nums" />
          <span v-if="form.error('amount')" :class="fieldError">{{ form.error('amount') }}</span>
        </label>
        <label :class="field">
          Date
          <Input v-model="form.data.received_on" type="date" :max="today()" required />
        </label>
      </div>
      <label :class="field">
        Paid by
        <select v-model="form.data.payment_method" :class="select">
          <option v-for="method in PAYMENT_METHODS" :key="method.value" :value="method.value">{{ method.label }}</option>
        </select>
      </label>
      <label :class="field">
        Transaction reference
        <Input v-model="form.data.payment_reference" :required="kind === 'loan'" maxlength="100" placeholder="Mobile money ID, cheque or deposit slip number" />
        <span v-if="form.error('reference') || form.error('payment_reference')" :class="fieldError">{{ form.error('reference') ?? form.error('payment_reference') }}</span>
      </label>
    </div>
  </AppDrawer>
</template>
