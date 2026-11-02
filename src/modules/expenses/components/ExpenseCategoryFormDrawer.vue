<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import { expenseCategoriesApi } from '../api'
import type { ExpenseCategory, ExpenseCategoryKind } from '../types'

/** Add an expense category, or edit one. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ category: ExpenseCategory | null }>()
const emit = defineEmits<{ saved: [category: ExpenseCategory] }>()

const accounts = ref<{ id: number; name: string }[]>([])
const editing = computed(() => props.category !== null)

const form = useForm({ name: '', description: '', chart_of_account_id: null as number | null, kind: 'expense' as ExpenseCategoryKind, requires_resolution: false, is_active: true }, (data) => {
  const payload = { ...data, description: data.description || null }
  return props.category ? expenseCategoriesApi.update(props.category.id, payload) : expenseCategoriesApi.create(payload)
})

async function loadAccounts() {
  const result = await chartOfAccountsApi.list({ is_active: true, type: form.data.kind === 'capital' ? 'asset' : 'expense', is_postable: true })
  accounts.value = result.data.map((account) => ({ id: account.id, name: `${account.code} ${account.name}` }))
}

async function save() {
  const category = await form.submit()
  if (category) {
    emit('saved', category)
    open.value = false
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  form.data.name = props.category?.name ?? ''
  form.data.description = props.category?.description ?? ''
  form.data.chart_of_account_id = props.category?.chart_of_account_id ?? null
  form.data.kind = props.category?.kind ?? 'expense'
  form.data.requires_resolution = props.category?.requires_resolution ?? false
  form.data.is_active = props.category?.is_active ?? true
  form.errors.value = {}
  form.message.value = null
  void loadAccounts().catch(() => {
    form.message.value = 'The ledger accounts could not be loaded.'
  })
})

/** A capital category posts to an asset account, so changing the kind changes which accounts apply. */
function kindChanged() {
  form.data.chart_of_account_id = null
  void loadAccounts()
}
</script>

<template>
  <AppDrawer v-model:open="open" :title="editing ? 'Edit category' : 'Add category'" :save-button-text="editing ? 'Save changes' : 'Add category'" :loading="form.processing.value" @save="save">
    <div class="flex flex-col gap-4">
      <p v-if="form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ form.message.value }}</p>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Name
        <Input v-model="form.data.name" required maxlength="255" />
        <span v-if="form.error('name')" class="text-xs font-normal text-destructive">{{ form.error('name') }}</span>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea v-model="form.data.description" rows="3" class="rounded-md border border-border bg-background px-3 py-2 text-sm font-normal" />
        <span v-if="form.error('description')" class="text-xs font-normal text-destructive">{{ form.error('description') }}</span>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Kind
        <select v-model="form.data.kind" class="h-9 rounded-md border border-border bg-background px-3 text-sm font-normal" @change="kindChanged">
          <option value="expense">Expense</option>
          <option value="capital">Capital (an asset, not a cost)</option>
          <option value="payroll_only">Payroll only (never a voucher)</option>
        </select>
        <span v-if="form.error('kind')" class="text-xs font-normal text-destructive">{{ form.error('kind') }}</span>
      </label>
      <div class="flex flex-col gap-1 text-sm font-medium">
        <span>GL account</span>
        <SearchableSelect v-model="form.data.chart_of_account_id" :options="accounts" placeholder="Choose an expense account" :error="form.error('chart_of_account_id')" />
        <span class="text-xs font-normal text-muted-foreground">Vouchers in this category post to this account.</span>
      </div>
      <label class="flex items-start gap-2 text-sm font-normal">
        <input v-model="form.data.requires_resolution" type="checkbox" class="mt-0.5" />
        <span>Needs a general meeting resolution <span class="block text-xs text-muted-foreground">For payments to officers. The voucher must quote the resolution.</span></span>
      </label>
      <label class="flex items-start gap-2 text-sm font-normal">
        <input v-model="form.data.is_active" type="checkbox" class="mt-0.5" />
        <span>Active <span class="block text-xs text-muted-foreground">A used category cannot be deleted, so switch it off instead.</span></span>
      </label>
    </div>
  </AppDrawer>
</template>
