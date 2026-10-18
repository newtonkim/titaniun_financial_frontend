<script setup lang="ts">
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatMoney } from '@/core/utils/format'
import { shareProductsApi } from '../api'
import type { ShareProduct } from '../types'

const columns: Column<ShareProduct>[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'nominal_price', label: 'Nominal price', align: 'right', value: (product) => formatMoney(product.nominal_price) },
  { key: 'minimum_shares', label: 'Minimum shares', align: 'right' },
  { key: 'is_active', label: 'Status' },
]

const fetchPage = (page: number) => shareProductsApi.list({ page })
</script>

<template>
  <ResourceTable title="Share products" :columns="columns" :fetch="fetchPage">
    <template #cell-is_active="{ row }"><StatusBadge :status="row.is_active" /></template>
  </ResourceTable>
</template>
