<script setup lang="ts">
import { reactive } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { formatDate, formatMoney } from '@/core/utils/format'
import { expensesApi } from '../api'
import type { Expense, ExpenseFilters } from '../types'

const filters = reactive<ExpenseFilters>({ from: '', to: '' })

const columns: Column<Expense>[] = [
  { key: 'expense_date', label: 'Date', value: (expense) => formatDate(expense.expense_date) },
  { key: 'category', label: 'Category', value: (expense) => expense.category?.name },
  { key: 'description', label: 'Description' },
  { key: 'reference', label: 'Reference' },
  { key: 'recorder', label: 'Recorded by', value: (expense) => expense.recorder?.name },
  { key: 'amount', label: 'Amount', align: 'right', value: (expense) => formatMoney(expense.amount) },
]

const fetchPage = (page: number) => expensesApi.list({ ...filters, page })
</script>

<template>
  <ResourceTable title="Expenses" :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #actions>
      <RouterLink class="btn btn--primary" :to="{ name: 'expenses.create' }">Record expense</RouterLink>
    </template>
    <template #filters>
      <label class="inline">From <input v-model="filters.from" type="date" /></label>
      <label class="inline">To <input v-model="filters.to" type="date" /></label>
    </template>
  </ResourceTable>
</template>
