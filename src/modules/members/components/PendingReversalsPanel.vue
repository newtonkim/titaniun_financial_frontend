<script setup lang="ts">
import { ref } from 'vue'
import { Check, RotateCcw, X } from 'lucide-vue-next'
import { formatDate, formatMoney } from '@/core/utils/format'
import { savingsReversalsApi } from '@/modules/savings/api'
import type { SavingsReversal } from '@/modules/savings/types'

/** Reversals waiting for approval on the member's accounts, with approve and reject for approvers. */
const props = defineProps<{ reversals: SavingsReversal[]; canApprove: boolean; currentUserId: number | null }>()
const emit = defineEmits<{ decided: [message: string]; failed: [message: string] }>()

const busy = ref<number | null>(null)
const rejecting = ref<number | null>(null)
const reason = ref('')

async function decide(reversal: SavingsReversal, approve: boolean) {
  busy.value = reversal.id
  try {
    if (approve) {
      await savingsReversalsApi.approve(reversal.id)
      emit('decided', `Reversal of transaction #${reversal.savings_transaction_id} approved and posted.`)
    } else {
      await savingsReversalsApi.reject(reversal.id, reason.value.trim())
      rejecting.value = null
      reason.value = ''
      emit('decided', `Reversal of transaction #${reversal.savings_transaction_id} rejected.`)
    }
  } catch (failure) {
    emit('failed', failure instanceof Error ? failure.message : 'The reversal could not be decided.')
  } finally {
    busy.value = null
  }
}

const ownRequest = (reversal: SavingsReversal) => props.currentUserId !== null && reversal.requested_by_id === props.currentUserId
</script>

<template>
  <div v-if="reversals.length" class="rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
    <p class="mb-3 flex items-center gap-2 text-[13px] font-bold text-amber-800 dark:text-amber-300">
      <RotateCcw :size="15" /> {{ reversals.length }} {{ reversals.length === 1 ? 'reversal is' : 'reversals are' }} waiting for approval
    </p>
    <ul class="flex flex-col gap-2">
      <li v-for="reversal in reversals" :key="reversal.id" class="rounded-lg border border-amber-100 bg-background p-3 dark:border-amber-500/20">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 text-[13px]">
            <p class="font-bold capitalize text-foreground">
              {{ reversal.transaction?.type }} of UGX {{ formatMoney(reversal.transaction?.amount) }}
              <span class="font-mono text-xs font-semibold text-muted-foreground">· {{ reversal.account_number }} · #{{ reversal.savings_transaction_id }}</span>
            </p>
            <p class="mt-0.5 text-neutral-600 dark:text-neutral-300">“{{ reversal.reason }}”</p>
            <p class="mt-0.5 text-xs text-muted-foreground">Requested by {{ reversal.requested_by ?? 'staff' }} on {{ formatDate(reversal.created_at) }}</p>
          </div>
          <div v-if="canApprove" class="flex shrink-0 items-center gap-2">
            <button type="button" :disabled="busy === reversal.id" class="flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50" @click="rejecting = rejecting === reversal.id ? null : reversal.id">
              <X :size="13" /> Reject
            </button>
            <button
              type="button"
              :disabled="busy === reversal.id || ownRequest(reversal)"
              :title="ownRequest(reversal) ? 'Someone else must approve your own request' : undefined"
              class="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              @click="decide(reversal, true)"
            >
              <Check :size="13" /> Approve
            </button>
          </div>
        </div>
        <form v-if="rejecting === reversal.id" class="mt-3 flex flex-col gap-2 sm:flex-row" @submit.prevent="decide(reversal, false)">
          <input v-model="reason" required minlength="3" maxlength="1000" placeholder="Why is it rejected?" aria-label="Rejection reason" class="flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:bg-neutral-800" />
          <button type="submit" :disabled="busy === reversal.id" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Confirm reject</button>
        </form>
      </li>
    </ul>
  </div>
</template>
