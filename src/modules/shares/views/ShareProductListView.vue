<script setup lang="ts">
import { ref } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatMoney } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { shareProductsApi } from '../api'
import ShareProductFormDrawer from '../components/ShareProductFormDrawer.vue'
import type { ShareProduct } from '../types'

const { can } = useAuth()
const table = ref<{ reload: () => void } | null>(null)
const editing = ref(false)
const selected = ref<ShareProduct | null>(null)

const columns: Column<ShareProduct>[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'nominal_price', label: 'Nominal price', align: 'right', value: (product) => formatMoney(product.nominal_price) },
  { key: 'minimum_shares', label: 'Minimum shares', align: 'right' },
  { key: 'ledger', label: 'Ledger', value: (product) => (product.equity_account_id ? 'Posted' : 'Not posted') },
  { key: 'is_active', label: 'Status' },
]

const fetchPage = (page: number) => shareProductsApi.list({ page })

function edit(product: ShareProduct | null) {
  selected.value = product
  editing.value = true
}
</script>

<template>
  <div>
    <ResourceTable ref="table" title="Share products" :columns="columns" :fetch="fetchPage">
      <template #actions>
        <button v-if="can('shares.products.manage')" type="button" class="btn btn--primary" @click="edit(null)">New product</button>
      </template>
      <template #cell-is_active="{ row }"><StatusBadge :status="row.is_active" /></template>
      <template v-if="can('shares.products.manage')" #row-actions="{ row }">
        <button type="button" class="btn btn--small" @click="edit(row)">Edit</button>
      </template>
    </ResourceTable>
    <ShareProductFormDrawer v-model:open="editing" :product="selected" @saved="table?.reload()" />
  </div>
</template>
