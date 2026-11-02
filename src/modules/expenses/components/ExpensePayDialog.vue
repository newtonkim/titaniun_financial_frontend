<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { formatMoney, today } from '@/core/utils/format'
import { expensesApi } from '../api'

/** Record that the money has left. This is the step that posts the voucher to the accounts. */
defineProps<{ amount: string; busy: boolean; error: string | null }>()
const emit = defineEmits<{ confirm: [paidOn: string, accountId: number]; cancel: [] }>()

const paidOn = ref(today())
const accountId = ref<number | null>(null)
const accounts = ref<{ id: number; name: string }[]>([])

onMounted(async () => {
  accounts.value = await expensesApi.paymentAccounts()
})
</script>

<template>
  <div class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="expense-pay-title" @click.self="emit('cancel')" @keydown.escape="emit('cancel')">
    <form class="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl" @submit.prevent="accountId && emit('confirm', paidOn, accountId)">
      <h2 id="expense-pay-title" class="text-section text-heading">Record payment</h2>
      <p class="mb-4 text-sm text-muted-foreground">UGX {{ formatMoney(amount) }} leaves the account. This posts the voucher to the accounts and cannot be edited afterwards.</p>
      <div class="flex flex-col gap-4">
        <label class="flex flex-col gap-1 text-sm font-medium">
          Paid on
          <Input v-model="paidOn" type="date" :max="today()" required />
        </label>
        <div class="flex flex-col gap-1 text-sm font-medium">
          <span>Paid from</span>
          <SearchableSelect v-model="accountId" :options="accounts" placeholder="Choose an account" />
        </div>
      </div>
      <p v-if="error" role="alert" class="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" :disabled="busy" @click="emit('cancel')">Back</Button>
        <Button type="submit" size="sm" :disabled="busy || !accountId">{{ busy ? 'Posting…' : 'Record payment' }}</Button>
      </div>
    </form>
  </div>
</template>
