<script setup lang="ts">
import { reactive, ref } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { loansApi } from '../api'
import { LOAN_STATUSES, type Loan, type LoanFilters } from '../types'

const filters = reactive<LoanFilters>({ status: '' })
const actionError = ref<string | null>(null)
const busyLoanId = ref<number | null>(null)

const columns: Column<Loan>[] = [
  { key: 'loan_number', label: 'Loan #' },
  { key: 'borrower', label: 'Borrower', value: (loan) => (loan.borrower ? `${loan.borrower.first_name} ${loan.borrower.last_name}` : null) },
  { key: 'product', label: 'Product', value: (loan) => loan.product?.name },
  { key: 'principal', label: 'Principal', align: 'right', value: (loan) => formatMoney(loan.principal) },
  { key: 'outstanding_principal', label: 'Outstanding', align: 'right', value: (loan) => formatMoney(loan.outstanding_principal) },
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
const fetchPage = (page: number) => loansApi.list({ ...filters, page })
</script>

<template>
  <p v-if="actionError" class="alert alert--error">{{ actionError }}</p>
  <ResourceTable title="Loans" :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #actions>
      <RouterLink class="btn btn--primary" :to="{ name: 'loans.create' }">New loan</RouterLink>
    </template>
    <template #filters>
      <select v-model="filters.status">
        <option value="">All statuses</option>
        <option v-for="status in LOAN_STATUSES" :key="status" :value="status">{{ formatEnum(status) }}</option>
      </select>
    </template>
    <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
    <template #row-actions="{ row, reload }">
      <template v-if="row.status === 'pending'">
        <button class="btn btn--small" :disabled="busyLoanId === row.id" @click="run(row, loansApi.approve, reload)">Approve</button>
        <button class="btn btn--small btn--danger" :disabled="busyLoanId === row.id" @click="run(row, loansApi.reject, reload)">Reject</button>
      </template>
      <button v-else-if="row.status === 'approved'" class="btn btn--small" :disabled="busyLoanId === row.id" @click="run(row, disburse, reload)">
        Disburse
      </button>
    </template>
  </ResourceTable>
</template>
