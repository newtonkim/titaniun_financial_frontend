<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { expenseCategoriesApi } from '../api'
import type { ExpenseCategory } from '../types'

const columns: Column<ExpenseCategory>[] = [
  { key: 'name', label: 'Name', sortable: true, tone: 'strong' },
  { key: 'description', label: 'Description', sortable: true, truncate: true },
  { key: 'chart_of_account_id', label: 'GL account' },
]

const fetchPage = (params: PageParams) => expenseCategoriesApi.list({ ...params })
</script>

<template>
  <ResourceTable title="Expense categories" description="How operating expenses are grouped." :columns="columns" :fetch="fetchPage" />
</template>
