<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { Button } from '@/core/components/ui/button'
import { formatDate, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { recurringExpensesApi } from '../api'
import ExpensePayDialog from '../components/ExpensePayDialog.vue'
import ExpenseReasonDialog from '../components/ExpenseReasonDialog.vue'
import RecurringExpenseDrawer from '../components/RecurringExpenseDrawer.vue'
import { useRecurringActions } from '../composables/useRecurringActions'
import { frequencyLabel, RECURRING_STATUS } from '../labels'
import type { RecurringExpense } from '../types'

const { can } = useAuth()
const table = ref<{ reload: () => Promise<void> } | null>(null)
const formOpen = ref(false)
const editing = ref<RecurringExpense | null>(null)
const removing = ref<RecurringExpense | null>(null)
const removeError = ref<string | null>(null)
const canRecord = computed(() => can('expenses.create'))

const columns: Column<RecurringExpense>[] = [
  { key: 'name', label: 'Expense', tone: 'strong' },
  { key: 'category', label: 'Category', tone: 'muted' },
  { key: 'frequency', label: 'How often', value: (item) => frequencyLabel(item.frequency) },
  { key: 'next_due_on', label: 'Next due', value: (item) => (item.next_due_on ? formatDate(item.next_due_on) : null) },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount', align: 'right', value: (item) => formatMoney(item.amount) },
]

const fetchPage = (params: PageParams) => recurringExpensesApi.list({ ...params })
const reload = () => table.value?.reload()
const recurring = useRecurringActions(reload as () => Promise<void>)

function open(item: RecurringExpense | null) {
  editing.value = item
  formOpen.value = true
}

async function remove(reason: string) {
  const item = removing.value
  if (!item || !reason) return
  removeError.value = null
  try {
    await recurringExpensesApi.remove(item.id)
    removing.value = null
    await reload()
  } catch (exception) {
    removeError.value = exception instanceof Error ? exception.message : 'It could not be removed.'
  }
}
</script>

<template>
  <div class="tw-scope">
    <ResourceTable ref="table" title="Recurring expenses" description="Costs that come round again, such as rent, salaries and electricity. Pay each one when it falls due." :columns="columns" :fetch="fetchPage">
      <template #actions>
        <Button v-if="canRecord" size="sm" @click="open(null)"><Plus /> Add recurring expense</Button>
      </template>
      <template #cell-status="{ row }"><span class="badge" :class="`badge--${RECURRING_STATUS[row.status].badge}`">{{ RECURRING_STATUS[row.status].label }}</span></template>
      <template v-if="canRecord" #row-actions="{ row }">
        <Button v-if="row.is_active" variant="outline" size="sm" @click="recurring.skipping.value = row">Skip</Button>
        <Button v-if="row.is_active" size="sm" @click="recurring.paying.value = row">Pay</Button>
        <Button variant="ghost" size="icon-sm" :aria-label="`Change ${row.name}`" title="Change" @click="open(row)"><Pencil /></Button>
        <Button variant="ghost" size="icon-sm" :aria-label="`Remove ${row.name}`" title="Remove" @click="removing = row"><Trash2 /></Button>
      </template>
      <template #empty>
        <p class="font-medium">No recurring expenses yet</p>
        <p class="mt-1 text-sm text-muted-foreground">Add rent, salaries or anything else you pay regularly, and it will remind you when it is due.</p>
      </template>
    </ResourceTable>

    <RecurringExpenseDrawer v-model:open="formOpen" :recurring="editing" @saved="reload" />
    <ExpensePayDialog v-if="recurring.paying.value" :title="`Pay ${recurring.paying.value.name}`" editable-amount :amount="recurring.paying.value.amount" :account-id="recurring.paying.value.paid_from_account_id" confirm-label="Mark as paid" :busy="recurring.busy.value" :error="recurring.error.value" @confirm="recurring.pay" @cancel="recurring.close" />
    <ExpenseReasonDialog v-if="recurring.skipping.value" :title="`Skip ${recurring.skipping.value.name}`" label="Why is it being skipped this time?" confirm-label="Skip" :busy="recurring.busy.value" :error="recurring.error.value" @confirm="recurring.skip" @cancel="recurring.close" />
    <ExpenseReasonDialog v-if="removing" :title="`Remove ${removing.name}`" label="Why is it being removed? Past payments stay in the accounts." confirm-label="Remove" destructive :busy="false" :error="removeError" @confirm="remove" @cancel="removing = null" />
  </div>
</template>
