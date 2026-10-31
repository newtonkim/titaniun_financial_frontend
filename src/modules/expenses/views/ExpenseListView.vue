<script setup lang="ts">
import { reactive } from 'vue'
import { Plus } from 'lucide-vue-next'
import DateRangeFilter from '@/core/components/DateRangeFilter.vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { Button } from '@/core/components/ui/button'
import { formatDate, formatMoney } from '@/core/utils/format'
import { expensesApi } from '../api'
import type { Expense, ExpenseFilters } from '../types'

const filters = reactive<ExpenseFilters>({ from: '', to: '' })

const columns: Column<Expense>[] = [
  { key: 'expense_date', label: 'Date', value: (expense) => formatDate(expense.expense_date) },
  { key: 'category', label: 'Category', value: (expense) => expense.category?.name },
  { key: 'description', label: 'Description', truncate: true },
  { key: 'reference', label: 'Reference', tone: 'muted' },
  { key: 'recorder', label: 'Recorded by', tone: 'muted', value: (expense) => expense.recorder?.name },
  { key: 'amount', label: 'Amount', align: 'right', value: (expense) => formatMoney(expense.amount) },
]

const fetchPage = (page: number, perPage: number) => expensesApi.list({ ...filters, page, per_page: perPage })
</script>

<template>
  <ResourceTable title="Expenses" description="Operating costs paid by the SACCO." :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #actions>
      <Button as-child size="sm"><RouterLink :to="{ name: 'expenses.create' }"><Plus /> Record expense</RouterLink></Button>
    </template>
    <template #filters>
      <DateRangeFilter v-model:from="filters.from" v-model:to="filters.to" />
    </template>
  </ResourceTable>
</template>
