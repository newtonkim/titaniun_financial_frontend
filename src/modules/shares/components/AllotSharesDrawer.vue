<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { formatMoney, today } from '@/core/utils/format'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import MemberPicker from '@/modules/members/components/MemberPicker.vue'
import { shareProductsApi } from '../api'
import type { ShareProduct } from '../types'

/** Issues shares to several members in one step, such as the founders' opening capital. */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ allotted: [count: number] }>()

const products = ref<ShareProduct[]>([])
const accounts = ref<ChartOfAccount[]>([])
const productId = ref<number | null>(null)
const rows = reactive<{ member_id: number | null; number_of_shares: number }[]>([])

const product = computed(() => products.value.find((item) => item.id === productId.value))
const totalShares = computed(() => rows.reduce((sum, row) => sum + (Number(row.number_of_shares) || 0), 0))
const totalValue = computed(() => totalShares.value * Number(product.value?.nominal_price ?? 0))

const form = useForm({ transacted_at: today(), reference: 'Founding share capital', payment_account_id: null as number | null }, async (data) => {
  if (!productId.value) throw new Error('Choose a share product.')
  const allotments = rows.filter((row) => row.member_id !== null).map((row) => ({ member_id: row.member_id as number, number_of_shares: Number(row.number_of_shares) }))
  return shareProductsApi.allot(productId.value, { ...data, allotments })
})

function addRow() {
  rows.push({ member_id: null, number_of_shares: product.value?.minimum_shares ?? 1 })
}

async function load() {
  const [productList, accountList] = await Promise.all([shareProductsApi.list({ active: true }), chartOfAccountsApi.list({ is_active: true })])
  products.value = productList.data
  accounts.value = accountList.data.filter((account) => account.is_postable && account.type === 'asset' && ['Cash', 'Bank'].includes(account.subtype ?? ''))
  productId.value ??= products.value[0]?.id ?? null
  form.data.payment_account_id = product.value?.cash_account_id ?? accounts.value[0]?.id ?? null
  if (rows.length === 0) addRow()
}

async function save() {
  const result = await form.submit()
  if (!result) return
  emit('allotted', result.length)
  rows.splice(0)
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) void load()
})
</script>

<template>
  <AppDrawer
    v-model:open="open"
    title="Allot shares"
    description="Issue shares to several members at once. The one-third ownership limit is checked after every share in the allotment is issued."
    save-button-text="Allot shares"
    :loading="form.processing.value"
    :save-disabled="totalShares === 0"
    width="w-full sm:max-w-[640px]"
    @save="save"
  >
    <p v-if="form.message.value" class="alert alert--error" role="alert">{{ form.message.value }}</p>
    <div class="form-grid">
      <FormField label="Share product">
        <select v-model="productId" required>
          <option v-for="item in products" :key="item.id" :value="item.id">{{ item.name }} · {{ formatMoney(item.nominal_price) }} a share</option>
        </select>
      </FormField>
      <FormField label="Date" :error="form.error('transacted_at')">
        <input v-model="form.data.transacted_at" type="date" :max="today()" required />
      </FormField>
      <FormField label="Paid into" :error="form.error('payment_account_id')">
        <select v-model="form.data.payment_account_id">
          <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option>
        </select>
      </FormField>
      <FormField label="Reference" :error="form.error('reference')">
        <input v-model="form.data.reference" maxlength="100" />
      </FormField>
    </div>

    <div class="allot-rows">
      <div v-for="(row, index) in rows" :key="index" class="allot-row">
        <FormField :label="`Member ${index + 1}`" :error="form.error(`allotments.${index}.member_id`)">
          <MemberPicker v-model="row.member_id" />
        </FormField>
        <FormField label="Shares" :error="form.error(`allotments.${index}.number_of_shares`)">
          <input v-model.number="row.number_of_shares" type="number" min="1" required />
        </FormField>
        <button type="button" class="btn btn--small btn--danger" :disabled="rows.length === 1" @click="rows.splice(index, 1)">Remove</button>
      </div>
      <button type="button" class="btn btn--small" @click="addRow">Add member</button>
    </div>

    <p class="muted allot-total">
      {{ totalShares }} shares · {{ formatMoney(totalValue) }}
      <template v-if="product"> · minimum {{ product.minimum_shares }} shares per member</template>
    </p>
  </AppDrawer>
</template>

<style scoped>
.allot-rows { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.25rem; }
.allot-row { display: grid; grid-template-columns: 1fr 7rem auto; gap: 0.6rem; align-items: end; }
.allot-total { margin-top: 1rem; font-variant-numeric: tabular-nums; }
@media (max-width: 480px) { .allot-row { grid-template-columns: 1fr; } }
</style>
