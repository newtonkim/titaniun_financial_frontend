<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { chartOfAccountsApi } from '@/modules/accounting/api'
import type { ChartOfAccount } from '@/modules/accounting/types'
import { shareProductsApi } from '../api'
import type { ShareProduct, StoreShareProductPayload } from '../types'

/** Create or edit a share product, including the ledger accounts share payments post to. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ product: ShareProduct | null }>()
const emit = defineEmits<{ saved: [product: ShareProduct] }>()

const accounts = ref<ChartOfAccount[]>([])
const equityAccounts = computed(() => accounts.value.filter((account) => account.type === 'equity'))
const cashAccounts = computed(() => accounts.value.filter((account) => account.type === 'asset' && ['Cash', 'Bank'].includes(account.subtype ?? '')))

const blank: StoreShareProductPayload = { name: '', code: '', description: '', nominal_price: '10000', minimum_shares: 50, equity_account_id: null, cash_account_id: null, is_active: true }
const form = useForm({ ...blank }, (data) => (props.product ? shareProductsApi.update(props.product.id, data) : shareProductsApi.create(data)))

async function save() {
  const product = await form.submit()
  if (!product) return
  emit('saved', product)
  open.value = false
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  Object.assign(form.data, props.product ? { ...blank, ...props.product, description: props.product.description ?? '' } : blank)
  form.errors.value = {}
  form.message.value = null
  const result = await chartOfAccountsApi.list({ is_active: true })
  accounts.value = result.data.filter((account) => account.is_postable && account.is_active)
})
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="product ? `Edit ${product.name}` : 'New share product'"
    description="Shares are issued at the nominal price. With both accounts set, purchases, instalments and buy-backs post to the ledger."
    :loading="form.processing.value"
    @save="save"
  >
    <p v-if="form.message.value" class="alert alert--error" role="alert">{{ form.message.value }}</p>
    <div class="form-grid">
      <FormField label="Name" :error="form.error('name')"><input id="share-product-name" v-model="form.data.name" required maxlength="255" /></FormField>
      <FormField label="Code" :error="form.error('code')"><input id="share-product-code" v-model="form.data.code" required maxlength="20" /></FormField>
      <FormField label="Price per share (UGX)" :error="form.error('nominal_price')">
        <input id="share-product-price" v-model="form.data.nominal_price" type="number" min="1" step="0.01" required />
      </FormField>
      <FormField label="Minimum shares per member" :error="form.error('minimum_shares')">
        <input id="share-product-minimum" v-model.number="form.data.minimum_shares" type="number" min="1" required />
      </FormField>
      <FormField label="Share capital account" :error="form.error('equity_account_id')">
        <select id="share-product-equity" v-model="form.data.equity_account_id">
          <option :value="null">Not posted to the ledger</option>
          <option v-for="account in equityAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option>
        </select>
      </FormField>
      <FormField label="Payments paid into" :error="form.error('cash_account_id')">
        <select id="share-product-cash" v-model="form.data.cash_account_id">
          <option :value="null">Choose on each payment</option>
          <option v-for="account in cashAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option>
        </select>
      </FormField>
      <FormField label="Description" class="span-all" :error="form.error('description')">
        <input id="share-product-description" v-model="form.data.description" />
      </FormField>
      <label class="inline span-all"><input id="share-product-active" v-model="form.data.is_active" type="checkbox" /> Active product</label>
    </div>
  </AppDrawer>
</template>
