<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, reactive, ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { Button } from '@/core/components/ui/button'
import { formatEnum } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { suppliersApi } from '../api'
import SupplierFormDrawer from '../components/SupplierFormDrawer.vue'
import type { Supplier } from '../types'

const { can } = useAuth()
const table = ref<{ reload: () => Promise<void> } | null>(null)
const filters = reactive({ search: '' })
const notice = ref<string | null>(null)
const failure = ref<string | null>(null)
const formOpen = ref(false)
const editing = ref<Supplier | null>(null)

const canManage = computed(() => can('suppliers.manage'))

const columns: Column<Supplier>[] = [
  { key: 'name', label: 'Name', sortable: true, tone: 'strong' },
  { key: 'type', label: 'Type', sortable: true, tone: 'muted', value: (supplier) => formatEnum(supplier.type) },
  { key: 'identifier', label: 'Tax ID', value: (supplier) => (supplier.identifier ? `${supplier.identifier_type} ${supplier.identifier}` : null) },
  { key: 'phone', label: 'Phone', tone: 'muted' },
  { key: 'is_related_party', label: 'Related party', value: (supplier) => (supplier.is_related_party ? 'Yes' : 'No') },
  { key: 'is_active', label: 'Status', tone: 'muted', value: (supplier) => (supplier.is_active ? 'Active' : 'Inactive') },
]

const fetchPage = (params: PageParams) => suppliersApi.list({ ...filters, ...params })

function open(supplier: Supplier | null) {
  editing.value = supplier
  formOpen.value = true
}

function saved(supplier: Supplier) {
  notice.value = `${supplier.name} saved.`
  void table.value?.reload()
}

async function remove(supplier: Supplier) {
  failure.value = null
  try {
    await suppliersApi.remove(supplier.id)
    notice.value = `${supplier.name} deleted.`
    await table.value?.reload()
  } catch (exception) {
    failure.value = exception instanceof ApiError && exception.status === 409
      ? `${supplier.name} has vouchers, so it cannot be deleted. Edit it and switch it off instead.`
      : 'The supplier could not be deleted.'
  }
}
</script>

<template>
  <div class="tw-scope">
    <ResourceTable ref="table" title="Suppliers" description="Who the SACCO pays." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #actions>
        <Button v-if="canManage" size="sm" @click="open(null)"><Plus /> Add supplier</Button>
      </template>
      <template #messages>
        <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>
        <p v-if="failure" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ failure }}</p>
      </template>
      <template #filters>
        <input v-model="filters.search" type="search" placeholder="Name or tax ID…" aria-label="Search suppliers" class="h-9 rounded-md border border-border bg-background px-3 text-sm" />
      </template>
      <template v-if="canManage" #row-actions="{ row }">
        <Button variant="outline" size="icon-sm" :aria-label="`Edit ${row.name}`" @click="open(row)"><Pencil /></Button>
        <Button variant="outline" size="icon-sm" :aria-label="`Delete ${row.name}`" @click="remove(row)"><Trash2 /></Button>
      </template>
    </ResourceTable>
    <SupplierFormDrawer v-model:open="formOpen" :supplier="editing" @saved="saved" />
  </div>
</template>
