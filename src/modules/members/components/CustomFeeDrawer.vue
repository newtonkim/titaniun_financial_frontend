<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Star } from 'lucide-vue-next'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { ApiError } from '@/core/api/http'
import { formatMoney } from '@/core/utils/format'
import { savingsAccountsApi } from '@/modules/savings/api'
import type { FeeMeasure, SavingsAccount } from '@/modules/savings/types'

/** Override the product's monthly fee for one savings account. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ account: SavingsAccount | null }>()
const emit = defineEmits<{ saved: [account: SavingsAccount] }>()

const form = reactive({ enabled: false, type: 'amount' as FeeMeasure, amount: '' as string | number, processing: false, message: '', errors: {} as Record<string, string[]> })

watch(open, (isOpen) => {
  if (!isOpen || !props.account) return
  Object.assign(form, {
    enabled: props.account.custom_monthly_fee_enabled ?? false,
    type: props.account.custom_monthly_fee_type ?? 'amount',
    amount: props.account.custom_monthly_fee_amount ?? '',
    message: '',
    errors: {},
  })
})

async function save() {
  if (!props.account) return
  form.processing = true
  form.message = ''
  form.errors = {}
  try {
    const account = await savingsAccountsApi.updateCustomFees(props.account.id, {
      custom_monthly_fee_enabled: form.enabled,
      custom_monthly_fee_type: form.enabled ? form.type : null,
      custom_monthly_fee_amount: form.enabled ? form.amount : null,
    })
    emit('saved', account)
    open.value = false
  } catch (failure) {
    form.message = failure instanceof Error ? failure.message : 'Failed to update the custom fee.'
    form.errors = failure instanceof ApiError ? failure.errors : {}
  } finally {
    form.processing = false
  }
}

const input = 'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
const product = () => props.account?.product
</script>

<template>
  <AppDrawer v-model:open="open" title="Custom Fees" save-button-text="Save fee" :loading="form.processing" @save="save">
    <div v-if="account" class="tw-scope flex flex-col gap-5">
      <p v-if="form.message" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ form.message }}</p>
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
        <h4 class="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-400"><Star :size="14" /> Fee Overrides</h4>
        <p class="text-xs text-amber-700 dark:text-amber-400">
          Settings defined here override the monthly fee on the {{ product()?.name }} product for account {{ account.account_number }}.
          The fee is deducted on the product's deduction day and never takes the balance below zero.
        </p>
        <p class="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Product fee:
          <strong>{{ product()?.monthly_fee_enabled ? (product()?.monthly_fee_type === 'percentage' ? `${product()?.monthly_fee_amount}% of the balance` : `UGX ${formatMoney(product()?.monthly_fee_amount)}`) : 'none' }}</strong>
        </p>
      </div>
      <label class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <span>
          <span class="block text-sm font-semibold text-neutral-800 dark:text-neutral-100">Use a custom monthly fee</span>
          <span class="text-xs text-neutral-500">Charge this account its own fee instead of the product's.</span>
        </span>
        <input id="custom-fee-enabled" v-model="form.enabled" type="checkbox" class="h-5 w-5 accent-[var(--color-brand)]" />
      </label>
      <template v-if="form.enabled">
        <div>
          <label class="mb-1.5 block text-[13px] font-semibold text-neutral-700 dark:text-neutral-300" for="custom-fee-type">Fee type</label>
          <select id="custom-fee-type" v-model="form.type" :class="input">
            <option value="amount">Fixed amount (UGX)</option>
            <option value="percentage">Percentage of the balance</option>
          </select>
          <p v-if="form.errors.custom_monthly_fee_type" class="mt-1 text-xs text-red-500">{{ form.errors.custom_monthly_fee_type[0] }}</p>
        </div>
        <div>
          <label class="mb-1.5 block text-[13px] font-semibold text-neutral-700 dark:text-neutral-300" for="custom-fee-amount">{{ form.type === 'percentage' ? 'Percentage (%)' : 'Amount (UGX)' }}</label>
          <input id="custom-fee-amount" v-model="form.amount" type="number" min="0" :max="form.type === 'percentage' ? 100 : undefined" step="0.01" required :class="input" />
          <p v-if="form.errors.custom_monthly_fee_amount" class="mt-1 text-xs text-red-500">{{ form.errors.custom_monthly_fee_amount[0] }}</p>
        </div>
      </template>
    </div>
  </AppDrawer>
</template>
