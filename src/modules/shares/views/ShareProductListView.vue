<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { Button } from '@/core/components/ui/button'
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
  { key: 'code', label: 'Code', tone: 'strong' },
  { key: 'name', label: 'Name' },
  { key: 'nominal_price', label: 'Nominal price', align: 'right', value: (product) => formatMoney(product.nominal_price) },
  { key: 'minimum_shares', label: 'Minimum shares', align: 'right' },
  { key: 'ledger', label: 'Ledger', value: (product) => (product.equity_account_id ? 'Posted' : 'Not posted') },
  { key: 'is_active', label: 'Status' },
]

const fetchPage = (page: number, perPage: number) => shareProductsApi.list({ page, per_page: perPage })

function edit(product: ShareProduct | null) {
  selected.value = product
  editing.value = true
}
</script>

<template>
  <div>
    <ResourceTable ref="table" title="Share products" description="Share classes members can buy." :columns="columns" :fetch="fetchPage">
      <template #actions>
        <Button v-if="can('shares.products.manage')" size="sm" @click="edit(null)"><Plus /> New product</Button>
      </template>
      <template #cell-is_active="{ row }"><StatusBadge :status="row.is_active" /></template>
      <template v-if="can('shares.products.manage')" #row-actions="{ row }">
        <Button variant="outline" size="xs" @click="edit(row)">Edit</Button>
      </template>
    </ResourceTable>
    <ShareProductFormDrawer v-model:open="editing" :product="selected" @saved="table?.reload()" />
  </div>
</template>
