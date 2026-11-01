<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import DateRangeFilter from '@/core/components/DateRangeFilter.vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { savingsAccountsApi, savingsProductsApi } from '../api'
import { SAVINGS_ACCOUNT_STATUSES, type SavingsAccount, type SavingsAccountFilters, type SavingsProduct } from '../types'

const QUIET_PERIODS = [6, 12, 24]

const filters = reactive<SavingsAccountFilters>({ status: '', savings_product_id: '', quiet_months: '', opened_from: '', opened_to: '', closed_from: '', closed_to: '' })
const products = ref<SavingsProduct[]>([])
const showClosedDates = computed(() => filters.status === 'closed')

const columns: Column<SavingsAccount>[] = [
  { key: 'account_number', label: 'Account #', sortable: true, tone: 'strong' },
  { key: 'member', label: 'Member', sortable: true, value: (account) => (account.member ? account.member.name : null) },
  { key: 'product', label: 'Product', sortable: true, value: (account) => account.product?.name },
  { key: 'balance', label: 'Balance', sortable: true, align: 'right', value: (account) => formatMoney(account.balance) },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'last_member_activity_at', label: 'Last activity', sortable: true, tone: 'muted', value: (account) => formatDate(account.last_member_activity_at) },
  { key: 'opened_at', label: 'Opened', sortable: true, value: (account) => formatDate(account.opened_at) },
]

const fetchPage = (params: PageParams) => savingsAccountsApi.list({ ...filters, ...params })

onMounted(async () => {
  products.value = (await savingsProductsApi.list({ per_page: 100 })).data
})
</script>

<template>
  <ResourceTable title="Savings accounts" description="Member savings accounts and their balances. Open an account to act on it." :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #filters>
      <select v-model="filters.status" aria-label="Status">
        <option value="">All statuses</option>
        <option v-for="status in SAVINGS_ACCOUNT_STATUSES" :key="status" :value="status">{{ formatEnum(status) }}</option>
      </select>
      <select v-model="filters.savings_product_id" aria-label="Product">
        <option value="">All products</option>
        <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
      </select>
      <select v-model="filters.quiet_months" aria-label="Quiet accounts">
        <option value="">Any activity</option>
        <option v-for="months in QUIET_PERIODS" :key="months" :value="months">Quiet {{ months }}+ months</option>
      </select>
      <span class="text-xs text-muted-foreground">Opened</span>
      <DateRangeFilter v-model:from="filters.opened_from" v-model:to="filters.opened_to" />
      <template v-if="showClosedDates">
        <span class="text-xs text-muted-foreground">Closed</span>
        <DateRangeFilter v-model:from="filters.closed_from" v-model:to="filters.closed_to" />
      </template>
    </template>
    <template #cell-account_number="{ row }">
      <RouterLink :to="{ name: 'savings.accounts.show', params: { id: row.id } }" class="hover:text-brand hover:underline">{{ row.account_number }}</RouterLink>
    </template>
    <template #cell-status="{ row }">
      <span class="flex items-center gap-1.5">
        <StatusBadge :status="row.status" />
        <StatusBadge v-if="row.frozen_at" status="frozen" />
      </span>
    </template>
  </ResourceTable>
</template>
