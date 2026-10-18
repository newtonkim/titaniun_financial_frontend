<script setup lang="ts">
import { reactive } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { savingsAccountsApi } from '../api'
import { SAVINGS_ACCOUNT_STATUSES, type SavingsAccount, type SavingsAccountFilters } from '../types'

const filters = reactive<SavingsAccountFilters>({ status: '' })

const columns: Column<SavingsAccount>[] = [
  { key: 'account_number', label: 'Account #' },
  { key: 'member', label: 'Member', value: (account) => (account.member ? `${account.member.first_name} ${account.member.last_name}` : null) },
  { key: 'product', label: 'Product', value: (account) => account.product?.name },
  { key: 'balance', label: 'Balance', align: 'right', value: (account) => formatMoney(account.balance) },
  { key: 'status', label: 'Status' },
  { key: 'opened_at', label: 'Opened', value: (account) => formatDate(account.opened_at) },
]

const fetchPage = (page: number) => savingsAccountsApi.list({ ...filters, page })
</script>

<template>
  <ResourceTable title="Savings accounts" :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #filters>
      <select v-model="filters.status">
        <option value="">All statuses</option>
        <option v-for="status in SAVINGS_ACCOUNT_STATUSES" :key="status" :value="status">{{ formatEnum(status) }}</option>
      </select>
    </template>
    <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
  </ResourceTable>
</template>
