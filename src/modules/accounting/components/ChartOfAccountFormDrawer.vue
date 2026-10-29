<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import FormField from '@/core/components/FormField.vue'
import SearchableSelect from '@/core/components/SearchableSelect.vue'
import { useForm } from '@/core/composables/useForm'
import { formatEnum } from '@/core/utils/format'
import { chartOfAccountsApi } from '../api'
import { nextGlCode, siblingSubtype } from '../gl-code'
import {
  ACCOUNT_TYPES,
  INCOME_STATEMENT_LINES,
  NORMAL_BALANCE_BY_TYPE,
  type AccountType,
  type ChartOfAccount,
  type StoreChartOfAccountPayload,
} from '../types'

/** Create or edit a ledger account. New accounts get the next free code under their parent. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ account: ChartOfAccount | null; accounts: ChartOfAccount[] }>()
const emit = defineEmits<{ saved: [account: ChartOfAccount] }>()

const blank = (): Required<StoreChartOfAccountPayload> => ({
  code: '',
  name: '',
  type: 'asset',
  subtype: '',
  normal_balance: 'debit',
  parent_id: null,
  is_control: false,
  is_postable: true,
  allow_manual: true,
  ifrs_category: '',
  income_statement_line: null,
  sort_order: null,
  description: '',
  is_active: true,
})

const form = useForm(blank(), (data) => {
  const payload = { ...data, subtype: data.subtype || null, ifrs_category: data.ifrs_category || null, description: data.description || null }
  if (!INCOME_STATEMENT_LINES.some((line) => line.type === payload.type && line.key === payload.income_statement_line)) payload.income_statement_line = null
  return props.account ? chartOfAccountsApi.update(props.account.id, payload) : chartOfAccountsApi.create(payload)
})
const filling = ref(false)

const editing = computed(() => props.account !== null)
const locked = computed(() => props.account?.has_postings === true)
const others = computed(() => props.accounts.filter((account) => account.id !== props.account?.id))
const parent = computed(() => others.value.find((account) => account.id === form.data.parent_id) ?? null)
const parentOptions = computed(() =>
  others.value
    .filter((account) => !account.is_postable && account.type === form.data.type)
    .map((account) => ({ id: account.id, name: `${account.code} · ${account.name}` })),
)
const subtypes = computed(() => [...new Set(props.accounts.filter((account) => account.type === form.data.type && account.subtype).map((account) => account.subtype as string))].sort())
const lines = computed(() => INCOME_STATEMENT_LINES.filter((line) => line.type === form.data.type))

watch(
  () => form.data.type,
  (type: AccountType) => {
    if (filling.value) return
    form.data.normal_balance = NORMAL_BALANCE_BY_TYPE[type]
    form.data.parent_id = null
    form.data.subtype = ''
    if (!editing.value) form.data.code = nextGlCode(type, null, props.accounts)
  },
)

watch(
  () => form.data.parent_id,
  () => {
    if (filling.value || editing.value) return
    form.data.code = nextGlCode(form.data.type, parent.value, props.accounts)
    if (parent.value) form.data.subtype = siblingSubtype(parent.value, props.accounts)
  },
)

watch(
  () => form.data.is_control,
  (header) => {
    if (!filling.value) form.data.is_postable = !header
  },
)

watch(open, (isOpen) => {
  if (!isOpen) return
  filling.value = true
  const account = props.account
  Object.assign(
    form.data,
    account
      ? { ...blank(), ...account, subtype: account.subtype ?? '', ifrs_category: account.ifrs_category ?? '', description: account.description ?? '' }
      : { ...blank(), code: nextGlCode('asset', null, props.accounts) },
  )
  form.errors.value = {}
  form.message.value = null
  queueMicrotask(() => (filling.value = false))
})

async function save() {
  const account = await form.submit()
  if (!account) return
  emit('saved', account)
  open.value = false
}
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="editing ? `Edit ${account?.code} · ${account?.name}` : 'New ledger account'"
    :description="locked ? 'This account has postings, so its type, normal balance and postable setting are fixed.' : 'Headers group sub-accounts; only postable accounts take journal entries.'"
    :save-button-text="editing ? 'Save changes' : 'Create account'"
    :loading="form.processing.value"
    @save="save"
  >
    <p v-if="form.message.value" class="alert alert--error" role="alert">{{ form.message.value }}</p>
    <div class="form-grid">
      <FormField label="Account type" :error="form.error('type')">
        <select id="coa-type" v-model="form.data.type" :disabled="locked">
          <option v-for="type in ACCOUNT_TYPES" :key="type" :value="type">{{ formatEnum(type) }}</option>
        </select>
      </FormField>
      <FormField label="Normal balance">
        <input id="coa-normal-balance" :value="form.data.normal_balance === 'debit' ? 'Debit (DR)' : 'Credit (CR)'" readonly aria-readonly="true" />
      </FormField>
      <FormField label="Account name" class="span-all" :error="form.error('name')">
        <input id="coa-name" v-model="form.data.name" required maxlength="255" placeholder="e.g. Mobile Money – MTN" />
      </FormField>
      <div class="field span-all">
        <span class="field__label">Parent account</span>
        <SearchableSelect v-model="form.data.parent_id" :options="parentOptions" placeholder="Top-level account" :error="form.error('parent_id')" />
      </div>
      <FormField label="GL code" :error="form.error('code')">
        <input id="coa-code" v-model="form.data.code" required maxlength="20" inputmode="numeric" class="coa-code" />
      </FormField>
      <FormField label="Subtype" :error="form.error('subtype')">
        <input id="coa-subtype" v-model="form.data.subtype" list="coa-subtypes" maxlength="100" placeholder="e.g. Bank" />
        <datalist id="coa-subtypes"><option v-for="subtype in subtypes" :key="subtype" :value="subtype" /></datalist>
      </FormField>
      <FormField v-if="lines.length" label="Income statement line" class="span-all" :error="form.error('income_statement_line')">
        <select id="coa-line" v-model="form.data.income_statement_line">
          <option :value="null">Inherit from parent / unclassified</option>
          <option v-for="line in lines" :key="line.key" :value="line.key">{{ line.label }}</option>
        </select>
      </FormField>
      <FormField label="IFRS category" :error="form.error('ifrs_category')">
        <input id="coa-ifrs" v-model="form.data.ifrs_category" maxlength="100" />
      </FormField>
      <FormField label="Sort order" :error="form.error('sort_order')">
        <input id="coa-sort" v-model.number="form.data.sort_order" type="number" min="0" />
      </FormField>
      <FormField label="Description" class="span-all" :error="form.error('description')">
        <input id="coa-description" v-model="form.data.description" />
      </FormField>
      <fieldset class="coa-flags span-all">
        <label class="inline"><input id="coa-header" v-model="form.data.is_control" type="checkbox" :disabled="locked" /> Header account that groups sub-accounts</label>
        <label class="inline"><input id="coa-postable" v-model="form.data.is_postable" type="checkbox" :disabled="locked" /> Postable: takes journal entries</label>
        <label class="inline"><input id="coa-manual" v-model="form.data.allow_manual" type="checkbox" /> Allow manual journal entries</label>
        <label class="inline"><input id="coa-active" v-model="form.data.is_active" type="checkbox" /> Active</label>
      </fieldset>
    </div>
  </AppDrawer>
</template>

<style scoped>
.coa-code { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-variant-numeric: tabular-nums; }
.coa-flags { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
</style>
