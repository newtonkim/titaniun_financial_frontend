<script setup lang="ts">
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { expenseCategoriesApi } from '../api'
import type { ExpenseCategory } from '../types'

const columns: Column<ExpenseCategory>[] = [
  { key: 'name', label: 'Name', tone: 'strong' },
  { key: 'description', label: 'Description', truncate: true },
  { key: 'chart_of_account_id', label: 'GL account' },
]

const fetchPage = (page: number, perPage: number) => expenseCategoriesApi.list({ page, per_page: perPage })
</script>

<template>
  <ResourceTable title="Expense categories" description="How operating expenses are grouped." :columns="columns" :fetch="fetchPage" />
</template>
