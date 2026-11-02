<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { today } from '@/core/utils/format'
import { expensesApi } from '../api'

/**
 * Say how money moved: paying an expense, paying a recurring one, or topping up petty cash.
 * With `editableAmount`, the amount can change, because a bill such as electricity differs each time.
 */
const props = withDefaults(defineProps<{
  title: string
  note?: string
  amount?: string
  editableAmount?: boolean
  accountLabel?: string
  accountId?: number | null
  excludeAccountId?: number | null
  confirmLabel?: string
  busy: boolean
  error: string | null
}>(), { note: undefined, amount: '', accountLabel: 'How was it paid?', accountId: null, excludeAccountId: null, confirmLabel: 'Save' })
const emit = defineEmits<{ confirm: [amount: string, date: string, accountId: number]; cancel: [] }>()

const value = ref(props.amount)
const date = ref(today())
const selected = ref<number | null>(props.accountId)
const accounts = ref<{ id: number; name: string }[]>([])

onMounted(async () => {
  const loaded = await expensesApi.paymentAccounts()
  accounts.value = loaded.filter((account) => account.id !== props.excludeAccountId)
  selected.value ??= accounts.value[0]?.id ?? null
})
</script>

<template>
  <div class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="money-dialog-title" @click.self="emit('cancel')" @keydown.escape="emit('cancel')">
    <form class="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl" @submit.prevent="selected && emit('confirm', String(value), date, selected)">
      <h2 id="money-dialog-title" class="text-section text-heading">{{ title }}</h2>
      <p v-if="note" class="mt-1 text-sm text-muted-foreground">{{ note }}</p>
      <div class="mt-4 flex flex-col gap-4">
        <label v-if="editableAmount" class="flex flex-col gap-1 text-sm font-medium">
          Amount (UGX)
          <Input v-model="value" type="number" min="1" step="0.01" required class="tabular-nums" />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium">
          Date
          <Input v-model="date" type="date" :max="today()" required />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium">
          {{ accountLabel }}
          <select v-model="selected" required class="h-9 rounded-md border border-border bg-background px-3 text-sm font-normal">
            <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </label>
      </div>
      <p v-if="error" role="alert" class="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" :disabled="busy" @click="emit('cancel')">Back</Button>
        <Button type="submit" size="sm" :disabled="busy || !selected">{{ busy ? 'Saving…' : confirmLabel }}</Button>
      </div>
    </form>
  </div>
</template>
