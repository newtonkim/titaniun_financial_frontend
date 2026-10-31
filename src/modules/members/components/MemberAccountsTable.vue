<script setup lang="ts">
import { ref } from 'vue'
import { Check, CircleDollarSign, CircleMinus, Copy, Landmark, Plus, Star, Wallet } from 'lucide-vue-next'
import { formatMoney } from '@/core/utils/format'
import type { SavingsAccount } from '@/modules/savings/types'

/** The member's savings accounts with their balances, and a deposit and withdrawal action on each. */
defineProps<{ accounts: SavingsAccount[]; canTransact: boolean; canOpen: boolean; canConfigureFees: boolean }>()
const emit = defineEmits<{ deposit: [account: SavingsAccount]; withdraw: [account: SavingsAccount]; newAccount: []; customFee: [account: SavingsAccount] }>()

const CURRENCY = 'UGX'
const copied = ref<string | null>(null)

function copy(code: string) {
  void navigator.clipboard?.writeText(code).then(() => {
    copied.value = code
    setTimeout(() => (copied.value = null), 1500)
  })
}

function statusPill(status: string): string {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (['dormant', 'closed'].includes(status)) return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-neutral-100 text-muted-foreground ring-neutral-500/20'
}

function statusDot(status: string): string {
  if (status === 'active') return 'bg-emerald-500'
  if (['dormant', 'closed'].includes(status)) return 'bg-amber-500'
  return 'bg-neutral-400'
}

const th = 'px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground'
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-background">
    <div class="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
      <div>
        <h2 class="text-[15px] font-bold normal-case tracking-normal text-foreground">Savings accounts</h2>
        <p class="text-xs text-muted-foreground">{{ accounts.length }} {{ accounts.length === 1 ? 'account' : 'accounts' }}</p>
      </div>
      <button
        v-if="canOpen"
        type="button"
        class="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-brand-dark"
        @click="emit('newAccount')"
      >
        <Plus :size="14" /> New Account
      </button>
    </div>

    <p v-if="!accounts.length" class="px-6 py-10 text-center text-sm text-muted-foreground">No savings accounts yet.</p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-neutral-50/70 dark:bg-neutral-800/40">
            <th :class="th">Account number</th>
            <th :class="th">Account Type</th>
            <th :class="th">Balance</th>
            <th :class="th">Status</th>
            <th :class="[th, 'text-right']">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
          <tr v-for="account in accounts" :key="account.id" class="transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
            <td class="whitespace-nowrap px-5 py-3">
              <div class="flex items-center gap-3 py-1">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10"><Landmark :size="16" class="text-brand" /></span>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="truncate font-mono text-[13px] font-bold text-foreground">{{ account.account_number }}</span>
                    <button type="button" class="shrink-0 text-neutral-300 transition-colors hover:text-brand" title="Copy account number" @click="copy(account.account_number)">
                      <component :is="copied === account.account_number ? Check : Copy" :size="13" :class="copied === account.account_number ? 'text-emerald-500' : ''" />
                    </button>
                  </div>
                  <span class="text-[11px] font-medium text-muted-foreground">Savings Account</span>
                </div>
              </div>
            </td>
            <td class="whitespace-nowrap px-5 py-3">
              <span class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-neutral-50 px-2.5 py-1 text-[12px] font-semibold capitalize text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <Wallet :size="13" class="shrink-0 text-muted-foreground" />
                {{ account.product?.name ?? '—' }}
              </span>
            </td>
            <td class="whitespace-nowrap px-5 py-3">
              <div class="flex flex-col">
                <span class="text-[15px] font-black leading-tight tabular-nums text-foreground">{{ CURRENCY }} {{ formatMoney(account.balance ?? 0) }}</span>
                <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-300">Available balance</span>
              </div>
            </td>
            <td class="whitespace-nowrap px-5 py-3">
              <span :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold capitalize ring-1 ring-inset', statusPill(account.status)]">
                <span class="size-1.5 rounded-full" :class="statusDot(account.status)" />
                {{ account.status }}
              </span>
            </td>
            <td class="whitespace-nowrap px-5 py-3">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="canConfigureFees"
                  type="button"
                  :title="account.custom_monthly_fee_enabled ? 'Custom monthly fee set' : 'Set a custom monthly fee'"
                  class="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-bold transition-colors"
                  :class="account.custom_monthly_fee_enabled ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-border bg-background text-muted-foreground hover:bg-neutral-50'"
                  @click="emit('customFee', account)"
                >
                  <Star :size="14" /> Custom fee
                </button>
                <button
                  type="button"
                  :disabled="!canTransact || account.status !== 'active'"
                  class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-[12px] font-bold text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-300"
                  @click="emit('withdraw', account)"
                >
                  <CircleMinus :size="14" /> Withdraw
                </button>
                <button
                  type="button"
                  :disabled="!canTransact || account.status !== 'active'"
                  class="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                  @click="emit('deposit', account)"
                >
                  <CircleDollarSign :size="14" /> Deposit
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
