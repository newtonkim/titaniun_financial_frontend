<script setup lang="ts">
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatMoney } from '@/core/utils/format'
import { savingsProductsApi } from '../api'
import type { SavingsProduct } from '../types'

const columns: Column<SavingsProduct>[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'interest_rate', label: 'Rate %', align: 'right' },
  { key: 'minimum_balance', label: 'Minimum balance', align: 'right', value: (product) => formatMoney(product.minimum_balance) },
  { key: 'is_active', label: 'Status' },
]

const fetchPage = (page: number) => savingsProductsApi.list({ page })
</script>

<template>
  <ResourceTable title="Savings products" :columns="columns" :fetch="fetchPage">
    <template #cell-is_active="{ row }"><StatusBadge :status="row.is_active" /></template>
  </ResourceTable>
</template>
