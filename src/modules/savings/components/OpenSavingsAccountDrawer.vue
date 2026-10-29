<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { formatMoney, today } from '@/core/utils/format'
import { savingsAccountsApi, savingsProductsApi } from '../api'
import type { SavingsAccount, SavingsProduct } from '../types'

/** Open another savings account for a member, numbered after their existing accounts. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ memberId: number; memberNumber: string; existing: SavingsAccount[] }>()
const emit = defineEmits<{ saved: [account: SavingsAccount] }>()

const products = ref<SavingsProduct[]>([])
const nextNumber = computed(() => {
  const used = new Set(props.existing.map((account) => account.account_number))
  for (let sequence = props.existing.length + 1; ; sequence++) {
    const number = `${props.memberNumber}-SV${String(sequence).padStart(2, '0')}`
    if (!used.has(number)) return number
  }
})

const form = useForm({ account_number: '', savings_product_id: 0, opened_at: today() }, (data) =>
  savingsAccountsApi.create({ ...data, member_id: props.memberId }),
)
const product = computed(() => products.value.find((item) => item.id === form.data.savings_product_id) ?? null)

watch(open, async (isOpen) => {
  if (!isOpen) return
  form.errors.value = {}
  form.message.value = null
  const result = await savingsProductsApi.list({ active: true })
  products.value = result.data
  Object.assign(form.data, { account_number: nextNumber.value, savings_product_id: products.value[0]?.id ?? 0, opened_at: today() })
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
    title="Add savings account"
    description="Opens a new savings account for this member. Record the first deposit once it is open."
    save-button-text="Open account"
    :loading="form.processing.value"
    @save="save"
  >
    <p v-if="form.message.value" class="alert alert--error" role="alert">{{ form.message.value }}</p>
    <div class="form-grid">
      <FormField label="Savings product" class="span-all" :error="form.error('savings_product_id')">
        <select id="open-savings-product" v-model.number="form.data.savings_product_id" required>
          <option v-for="item in products" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </FormField>
      <FormField label="Account number" :error="form.error('account_number')">
        <input id="open-savings-number" v-model="form.data.account_number" required maxlength="50" />
      </FormField>
      <FormField label="Opened" :error="form.error('opened_at')">
        <input id="open-savings-date" v-model="form.data.opened_at" type="date" :max="today()" required />
      </FormField>
    </div>
    <p v-if="product" class="muted">
      {{ product.type === 'fixed' ? 'Fixed deposit' : 'Standard savings' }} · {{ product.interest_rate }}% interest · minimum balance {{ formatMoney(product.minimum_balance) }}
    </p>
  </AppDrawer>
</template>
