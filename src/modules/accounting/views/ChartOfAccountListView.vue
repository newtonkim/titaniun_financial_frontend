<script setup lang="ts">
import { reactive } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatEnum } from '@/core/utils/format'
import { chartOfAccountsApi } from '../api'
import { ACCOUNT_TYPES, type ChartOfAccount, type ChartOfAccountFilters } from '../types'

const filters = reactive<ChartOfAccountFilters>({ type: '' })

const columns: Column<ChartOfAccount>[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', value: (account) => formatEnum(account.type) },
  { key: 'description', label: 'Description' },
  { key: 'is_active', label: 'Status' },
]

const fetchPage = () => chartOfAccountsApi.list(filters)
</script>

<template>
  <ResourceTable title="Chart of accounts" :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #filters>
      <select v-model="filters.type">
        <option value="">All types</option>
        <option v-for="type in ACCOUNT_TYPES" :key="type" :value="type">{{ formatEnum(type) }}</option>
      </select>
    </template>
    <template #cell-is_active="{ row }"><StatusBadge :status="row.is_active" /></template>
  </ResourceTable>
</template>
