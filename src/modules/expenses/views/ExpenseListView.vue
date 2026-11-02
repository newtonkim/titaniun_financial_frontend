<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { reactive } from 'vue'
import { Plus } from 'lucide-vue-next'
import DateRangeFilter from '@/core/components/DateRangeFilter.vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
import { formatDate, formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { expensesApi } from '../api'
import type { Expense, ExpenseFilters, ExpenseStatus } from '../types'

const { can } = useAuth()
const filters = reactive<ExpenseFilters>({ search: '', status: '', from: '', to: '' })

const STATUSES: { value: ExpenseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Waiting for approval' },
  { value: 'approved', label: 'Approved, not paid' },
  { value: 'posted', label: 'Posted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reversed', label: 'Reversed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const columns: Column<Expense>[] = [
  { key: 'number', label: 'Voucher', sortable: true, tone: 'strong', value: (expense) => expense.number ?? `Draft #${expense.id}` },
  { key: 'expense_date', label: 'Date', sortable: true, value: (expense) => formatDate(expense.expense_date) },
  { key: 'payee', label: 'Paid to', sortable: true, value: (expense) => expense.payee },
  { key: 'description', label: 'Description', sortable: true, truncate: true },
  { key: 'categories', label: 'Category', tone: 'muted', value: (expense) => expense.categories?.join(', ') },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true, align: 'right', value: (expense) => formatMoney(expense.amount) },
]

const fetchPage = (params: PageParams) => expensesApi.list({ ...filters, ...params })
</script>

<template>
  <ResourceTable title="Expenses" description="What the SACCO spends. A voucher reaches the accounts once it is approved and paid." :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #actions>
      <Button v-if="can('expenses.create')" as-child size="sm"><RouterLink :to="{ name: 'expenses.create' }"><Plus /> New voucher</RouterLink></Button>
    </template>
    <template #filters>
      <input v-model="filters.search" type="search" placeholder="Voucher, payee, description…" aria-label="Search expenses" class="h-9 rounded-md border border-border bg-background px-3 text-sm" />
      <select v-model="filters.status" aria-label="Filter by status" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
        <option value="">All statuses</option>
        <option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ status.label }}</option>
      </select>
      <DateRangeFilter v-model:from="filters.from" v-model:to="filters.to" />
    </template>
    <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
    <template #row-actions="{ row }">
      <Button as-child variant="outline" size="sm"><RouterLink :to="{ name: 'expenses.show', params: { id: row.id } }">Open</RouterLink></Button>
    </template>
  </ResourceTable>
</template>
