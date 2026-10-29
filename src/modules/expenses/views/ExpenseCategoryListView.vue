<script setup lang="ts">
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { expenseCategoriesApi } from '../api'
import type { ExpenseCategory } from '../types'

const columns: Column<ExpenseCategory>[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'chart_of_account_id', label: 'GL account' },
]

const fetchPage = (page: number) => expenseCategoriesApi.list({ page })
</script>

<template>
  <ResourceTable title="Expense categories" description="How operating expenses are grouped." :columns="columns" :fetch="fetchPage" />
</template>
