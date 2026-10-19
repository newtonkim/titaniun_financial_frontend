<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRightLeft, CalendarClock, CheckCircle2, RotateCcw, X } from 'lucide-vue-next'
import { formatMoney } from '@/core/utils/format'
import { CURRENCY } from '../composables/useMonthlyFeeSummary'
import type { ChargeTrigger, SavingsProduct, SavingsProductCharge } from '../types'

const props = defineProps<{
  isOpen: boolean
  product: SavingsProduct | null
}>()

const emit = defineEmits<{ close: [] }>()

const hasCharges = computed(() => (props.product?.charges?.length ?? 0) > 0 || props.product?.monthly_fee_enabled)

const monthlyFeeLabel = computed(() => {
  const p = props.product
  if (!p?.monthly_fee_enabled) return ''
  return p.monthly_fee_type === 'percentage' ? `${p.monthly_fee_amount}%` : `${CURRENCY} ${formatMoney(p.monthly_fee_amount)}`
})

const ICONS = { deposit: CheckCircle2, withdraw: RotateCcw, transfer: ArrowRightLeft }

const CARD_CLASSES: Record<ChargeTrigger, string> = {
  deposit: 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10',
  withdraw: 'border-rose-100 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-900/10',
  transfer: 'border-blue-100 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10',
}

const ICON_CLASSES: Record<ChargeTrigger, string> = {
  deposit: 'text-emerald-600 dark:text-emerald-400',
  withdraw: 'text-rose-600 dark:text-rose-400',
  transfer: 'text-blue-600 dark:text-blue-400',
}

const formatValue = (charge: SavingsProductCharge) =>
  charge.charge_type === 'percentage' ? `${charge.amount}%` : `${CURRENCY} ${formatMoney(charge.amount)}`
</script>

<template>
  <div v-if="isOpen" class="tw-scope fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0" role="dialog" aria-modal="true" aria-labelledby="charges-modal-title">
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="emit('close')" />

    <div class="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl sm:my-8 dark:bg-neutral-900">
      <div class="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
        <div>
          <h3 id="charges-modal-title" class="text-lg font-semibold text-neutral-900 dark:text-white">Attached Charges</h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ product?.name }}</p>
        </div>
        <button type="button" aria-label="Close" class="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-500 dark:hover:bg-neutral-800" @click="emit('close')">
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="max-h-[60vh] overflow-y-auto px-6 py-6">
        <div v-if="!hasCharges" class="py-8 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <CheckCircle2 class="h-6 w-6 text-neutral-400" />
          </div>
          <p class="font-medium text-neutral-500 dark:text-neutral-400">No charges are attached to this product.</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-for="(charge, index) in product?.charges" :key="index" :class="['flex items-start gap-3 rounded-xl border p-3', CARD_CLASSES[charge.type]]">
            <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-neutral-900">
              <component :is="ICONS[charge.type]" :class="['h-4 w-4', ICON_CLASSES[charge.type]]" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold capitalize text-neutral-900 dark:text-white">{{ charge.type }} Charge</p>
              <div class="mt-0.5 flex items-baseline gap-1.5 text-sm">
                <span class="font-medium text-neutral-900 dark:text-white">{{ formatValue(charge) }}</span>
                <span class="text-xs text-neutral-500">fee</span>
              </div>
              <div class="mt-0.5 flex gap-3 text-xs text-neutral-500">
                <span>Min: {{ Number(charge.minimum_amount) ? `${CURRENCY} ${formatMoney(charge.minimum_amount)}` : 'None' }}</span>
                <span v-if="charge.maximum_amount">Max: {{ CURRENCY }} {{ formatMoney(charge.maximum_amount) }}</span>
              </div>
            </div>
          </div>

          <div v-if="product?.monthly_fee_enabled" class="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10">
            <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-neutral-900">
              <CalendarClock class="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-neutral-900 dark:text-white">Monthly Fee</p>
              <div class="mt-0.5 flex items-baseline gap-1.5 text-sm">
                <span class="font-medium text-neutral-900 dark:text-white">{{ monthlyFeeLabel }}</span>
                <span class="text-xs text-neutral-500">per month</span>
              </div>
              <div class="mt-0.5 text-xs text-neutral-500">Deducted on day {{ product.monthly_fee_deduction_day }} of the month</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end bg-neutral-50 px-6 py-4 dark:bg-neutral-800/50">
        <button type="button" class="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-white" @click="emit('close')">
          Close
        </button>
      </div>
    </div>
  </div>
</template>
