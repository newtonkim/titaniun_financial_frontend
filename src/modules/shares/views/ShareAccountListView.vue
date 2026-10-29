<script setup lang="ts">
import { reactive, ref } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'
import { shareAccountsApi } from '../api'
import ShareAccountDrawer from '../components/ShareAccountDrawer.vue'
import { SHARE_ACCOUNT_STATUSES, type ShareAccount, type ShareAccountFilters } from '../types'

const filters = reactive<ShareAccountFilters>({ status: '' })
const table = ref<{ reload: () => void } | null>(null)
const viewing = ref(false)
const viewingId = ref<number | null>(null)

const columns: Column<ShareAccount>[] = [
  { key: 'account_number', label: 'Account #' },
  { key: 'member', label: 'Member', value: (account) => (account.member ? account.member.name : null) },
  { key: 'product', label: 'Product', value: (account) => account.product?.name },
  { key: 'shares_held', label: 'Shares', align: 'right' },
  { key: 'share_value', label: 'Value', align: 'right', value: (account) => formatMoney(account.share_value) },
  { key: 'subscription_balance', label: 'Instalments held', align: 'right', value: (account) => formatMoney(account.subscription_balance) },
  { key: 'status', label: 'Status' },
  { key: 'opened_at', label: 'Opened', value: (account) => formatDate(account.opened_at) },
]

const fetchPage = (page: number) => shareAccountsApi.list({ ...filters, page })

function open(account: ShareAccount) {
  viewingId.value = account.id
  viewing.value = true
}
</script>

<template>
  <div>
    <ResourceTable ref="table" title="Share accounts" description="Shares held by each member." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #filters>
        <select v-model="filters.status">
          <option value="">All statuses</option>
          <option v-for="status in SHARE_ACCOUNT_STATUSES" :key="status" :value="status">{{ formatEnum(status) }}</option>
        </select>
      </template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
      <template #row-actions="{ row }"><button type="button" class="btn btn--small" @click="open(row)">Open</button></template>
    </ResourceTable>
    <ShareAccountDrawer v-model:open="viewing" :account-id="viewingId" @changed="table?.reload()" />
  </div>
</template>
