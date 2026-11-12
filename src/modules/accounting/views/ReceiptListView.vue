<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import DateRangeFilter from '@/core/components/DateRangeFilter.vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { Button } from '@/core/components/ui/button'
import { formatDate, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import ExpenseReasonDialog from '@/modules/expenses/components/ExpenseReasonDialog.vue'
import ReceiptDrawer from '../components/ReceiptDrawer.vue'
import { paymentMethodLabel, printReceipt, receiptNumber, receiptsApi, type Receipt } from '../receipts'

const { can } = useAuth()
const table = ref<{ reload: () => Promise<void> } | null>(null)
const filters = reactive({ search: '', from: '', to: '' })
const creating = ref(false)
const voiding = ref<Receipt | null>(null)
const busy = ref(false)
const failure = ref<string | null>(null)
const canIssue = computed(() => can('receipts.manage'))

const columns: Column<Receipt>[] = [
  { key: 'number', label: 'No.', sortable: true, tone: 'strong', value: (receipt) => receiptNumber(receipt.number) },
  { key: 'received_on', label: 'Date', sortable: true, value: (receipt) => formatDate(receipt.received_on) },
  { key: 'received_from', label: 'Received from', sortable: true },
  { key: 'purpose', label: 'For', truncate: true },
  { key: 'payment_method', label: 'Paid by', tone: 'muted', value: (receipt) => paymentMethodLabel(receipt.payment_method) },
  { key: 'amount', label: 'Amount', sortable: true, align: 'right', value: (receipt) => formatMoney(receipt.amount) },
]

const fetchPage = (params: PageParams) => receiptsApi.list({ ...filters, ...params })

async function print(id: number) {
  failure.value = null
  try {
    await printReceipt(id)
  } catch (error) {
    failure.value = error instanceof Error ? error.message : 'The receipt could not be printed.'
  }
}

async function issued(id: number) {
  await table.value?.reload()
  await print(id)
}

async function confirmVoid(reason: string) {
  const receipt = voiding.value
  if (!receipt) return
  busy.value = true
  failure.value = null
  try {
    await receiptsApi.void(receipt.id, reason)
    voiding.value = null
    await table.value?.reload()
  } catch (error) {
    failure.value = error instanceof Error ? error.message : 'The receipt could not be voided.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="tw-scope">
    <ResourceTable ref="table" title="Receipts" description="Every payment received, in one numbered series. A receipt is issued automatically whenever a payment is recorded." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #actions>
        <Button v-if="canIssue" size="sm" @click="creating = true"><Plus /> New receipt</Button>
      </template>
      <template #messages>
        <p v-if="failure" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ failure }}</p>
      </template>
      <template #filters>
        <input v-model="filters.search" type="search" placeholder="Name, number or reference" aria-label="Search receipts" class="h-9 rounded-md border border-border bg-background px-3 text-sm" />
        <DateRangeFilter v-model:from="filters.from" v-model:to="filters.to" />
      </template>
      <template #cell-number="{ row }">
        <span class="font-semibold text-navy dark:text-white">{{ receiptNumber(row.number) }}</span>
        <span v-if="row.voided_at" class="badge badge--rejected ml-2">Void</span>
      </template>
      <template #row-actions="{ row }">
        <Button variant="outline" size="sm" @click="print(row.id)">Print</Button>
        <Button v-if="canIssue && row.is_manual && !row.voided_at" variant="ghost" size="sm" @click="voiding = row">Void</Button>
      </template>
      <template #empty>
        <p class="font-medium">No receipts yet</p>
        <p class="mt-1 text-sm text-muted-foreground">Receipts appear here as payments are recorded.</p>
      </template>
    </ResourceTable>

    <ReceiptDrawer v-model:open="creating" @issued="issued" />
    <ExpenseReasonDialog v-if="voiding" :title="`Void receipt ${receiptNumber(voiding.number)}`" label="Why is it being voided? The number stays in the series, marked void." confirm-label="Void receipt" destructive :busy="busy" :error="failure" @confirm="confirmVoid" @cancel="voiding = null" />
  </div>
</template>
