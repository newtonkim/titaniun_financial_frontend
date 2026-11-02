<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, onMounted, ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { Button } from '@/core/components/ui/button'
import { formatEnum } from '@/core/utils/format'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import { useAuth } from '@/modules/auth/store'
import { expenseCategoriesApi } from '../api'
import ExpenseCategoryDeleteDialog from '../components/ExpenseCategoryDeleteDialog.vue'
import ExpenseCategoryFormDrawer from '../components/ExpenseCategoryFormDrawer.vue'
import type { ExpenseCategory } from '../types'

const { can } = useAuth()
const table = ref<{ reload: () => Promise<void> } | null>(null)
const accountNames = ref<Record<number, string>>({})
const notice = ref<string | null>(null)

const formOpen = ref(false)
const editing = ref<ExpenseCategory | null>(null)
const deleting = ref<ExpenseCategory | null>(null)
const removing = ref(false)
const deleteError = ref<string | null>(null)

const canManage = computed(() => can('expenses.categories.manage'))

const columns: Column<ExpenseCategory>[] = [
  { key: 'name', label: 'Name', sortable: true, tone: 'strong' },
  { key: 'description', label: 'Description', sortable: true, truncate: true },
  { key: 'chart_of_account_id', label: 'GL account', value: (category) => (category.chart_of_account_id === null ? null : accountNames.value[category.chart_of_account_id] ?? null) },
  { key: 'kind', label: 'Kind', tone: 'muted', value: (category) => formatEnum(category.kind) },
  { key: 'is_active', label: 'Status', tone: 'muted', value: (category) => (category.is_active ? 'Active' : 'Inactive') },
]

const fetchPage = (params: PageParams) => expenseCategoriesApi.list({ ...params })

function add() {
  editing.value = null
  formOpen.value = true
}

function edit(category: ExpenseCategory) {
  editing.value = category
  formOpen.value = true
}

function saved(category: ExpenseCategory) {
  notice.value = `${category.name} saved.`
  void table.value?.reload()
}

function askToDelete(category: ExpenseCategory) {
  deleting.value = category
  deleteError.value = null
}

async function confirmDelete() {
  if (!deleting.value) return
  removing.value = true
  try {
    await expenseCategoriesApi.remove(deleting.value.id)
    notice.value = `${deleting.value.name} deleted.`
    deleting.value = null
    await table.value?.reload()
  } catch (exception) {
    deleteError.value = exception instanceof ApiError && exception.status === 409
      ? 'This category has expenses recorded against it, so it cannot be deleted.'
      : exception instanceof Error ? exception.message : 'The category could not be deleted.'
  } finally {
    removing.value = false
  }
}

onMounted(async () => {
  const accounts = await chartOfAccountsApi.list().catch(() => null)
  accountNames.value = Object.fromEntries((accounts?.data ?? []).map((account) => [account.id, `${account.code} ${account.name}`]))
})
</script>

<template>
  <ResourceTable ref="table" title="Expense categories" description="How operating expenses are grouped." :columns="columns" :fetch="fetchPage">
    <template #actions>
      <Button v-if="canManage" size="sm" @click="add"><Plus /> Add category</Button>
    </template>
    <template #messages>
      <p v-if="notice" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{{ notice }}</p>
    </template>
    <template v-if="canManage" #row-actions="{ row }">
      <Button variant="ghost" size="icon-sm" :aria-label="`Edit ${row.name}`" title="Edit" @click="edit(row)"><Pencil /></Button>
      <Button variant="ghost" size="icon-sm" :aria-label="`Delete ${row.name}`" title="Delete" @click="askToDelete(row)"><Trash2 /></Button>
    </template>
    <template #empty>
      <p class="font-medium">No categories yet</p>
      <p class="mt-1 text-muted-foreground">Add one to start recording expenses.</p>
    </template>
  </ResourceTable>

  <ExpenseCategoryFormDrawer v-model:open="formOpen" :category="editing" @saved="saved" />
  <ExpenseCategoryDeleteDialog v-if="deleting" :name="deleting.name" :deleting="removing" :error="deleteError" @confirm="confirmDelete" @cancel="deleting = null" />
</template>
