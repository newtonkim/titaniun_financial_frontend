<script setup lang="ts">
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatEnum, formatMoney } from '@/core/utils/format'
import { loanProductsApi } from '../api'
import type { LoanProduct } from '../types'

const columns: Column<LoanProduct>[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'interest_rate', label: 'Rate %', align: 'right' },
  { key: 'interest_method', label: 'Method', value: (product) => formatEnum(product.interest_method) },
  { key: 'repayment_frequency', label: 'Frequency', value: (product) => formatEnum(product.repayment_frequency) },
  { key: 'range', label: 'Amount range', align: 'right', value: (product) => `${formatMoney(product.min_amount)} – ${formatMoney(product.max_amount)}` },
  { key: 'terms', label: 'Term range', value: (product) => `${product.min_term} – ${product.max_term}` },
  { key: 'is_active', label: 'Status' },
]

const fetchPage = (page: number) => loanProductsApi.list({ page })
</script>

<template>
  <ResourceTable title="Loan products" :columns="columns" :fetch="fetchPage">
    <template #cell-is_active="{ row }"><StatusBadge :status="row.is_active" /></template>
  </ResourceTable>
</template>
