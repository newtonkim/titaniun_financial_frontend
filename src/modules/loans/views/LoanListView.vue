<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { loansApi } from '../api'
import { LOAN_STATUSES, type Loan, type LoanFilters } from '../types'

const filters = reactive<LoanFilters>({ status: '' })
const actionError = ref<string | null>(null)
const busyLoanId = ref<number | null>(null)

const columns: Column<Loan>[] = [
  { key: 'loan_number', label: 'Loan #' },
  { key: 'borrower', label: 'Borrower', value: (loan) => (loan.borrower ? loan.borrower.name : null) },
  { key: 'product', label: 'Product', value: (loan) => loan.product?.name },
  { key: 'principal', label: 'Principal', align: 'right', value: (loan) => formatMoney(loan.principal) },
  {
    key: 'outstanding_principal',
    label: 'Outstanding',
    align: 'right',
    value: (loan) => formatMoney(loan.outstanding_principal),
  },
  { key: 'term', label: 'Term' },
  { key: 'status', label: 'Status' },
  { key: 'maturity_date', label: 'Matures', value: (loan) => formatDate(loan.maturity_date) },
]

async function run(loan: Loan, action: (id: number) => Promise<Loan>, reload: () => Promise<void>): Promise<void> {
  actionError.value = null
  busyLoanId.value = loan.id
  try {
    await action(loan.id)
    await reload()
  } catch (exception) {
    actionError.value = exception instanceof Error ? exception.message : 'Action failed.'
  } finally {
    busyLoanId.value = null
  }
}

const disburse = (id: number) => loansApi.disburse(id)
const fetchPage = (page: number, perPage: number) => loansApi.list({ ...filters, page, per_page: perPage })
</script>

<template>
  <ResourceTable title="Loans" description="Applications, approvals and the active loan book." :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #actions>
      <Button as-child size="sm"><RouterLink :to="{ name: 'loans.create' }"><Plus /> New loan</RouterLink></Button>
    </template>
    <template #messages>
      <p v-if="actionError" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ actionError }}</p>
    </template>
    <template #filters>
      <select v-model="filters.status">
        <option value="">All statuses</option>
        <option v-for="status in LOAN_STATUSES" :key="status" :value="status">{{ formatEnum(status) }}</option>
      </select>
    </template>
    <template #cell-loan_number="{ row }">
      <RouterLink class="font-semibold text-navy underline-offset-2 hover:underline dark:text-white" :to="{ name: 'loans.show', params: { id: row.id } }">{{ row.loan_number }}</RouterLink>
    </template>
    <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
    <template #row-actions="{ row, reload }">
      <Button as-child variant="outline" size="xs"><RouterLink :to="{ name: 'loans.show', params: { id: row.id } }">Open</RouterLink></Button>
      <template v-if="!row.uses_workflow && row.status === 'pending'">
        <Button variant="outline" size="xs" :disabled="busyLoanId === row.id" @click="run(row, loansApi.approve, reload)">Approve</Button>
        <Button variant="outline" size="xs" class="text-destructive hover:text-destructive" :disabled="busyLoanId === row.id" @click="run(row, loansApi.reject, reload)">Reject</Button>
      </template>
      <Button v-else-if="!row.uses_workflow && row.status === 'approved'" variant="outline" size="xs" :disabled="busyLoanId === row.id" @click="run(row, disburse, reload)">Disburse</Button>
    </template>
  </ResourceTable>
</template>
