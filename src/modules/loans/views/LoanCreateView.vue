<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { formatMoney } from '@/core/utils/format'
import MemberPicker from '@/modules/members/components/MemberPicker.vue'
import { loanProductsApi, loansApi } from '../api'
import type { LoanProduct } from '../types'

const router = useRouter()
const products = ref<LoanProduct[]>([])

const form = useForm(
  { loan_number: '', member_id: null as number | null, loan_product_id: null as number | null, principal: '', term: 12 },
  async ({ member_id, loan_product_id, ...rest }) => {
    await loansApi.create({ ...rest, member_id: member_id ?? 0, loan_product_id: loan_product_id ?? 0 })
    await router.push({ name: 'loans.index' })
  },
)

const product = computed(() => products.value.find((candidate) => candidate.id === form.data.loan_product_id))

onMounted(async () => {
  products.value = (await loanProductsApi.list({ active: true })).data
})
</script>

<template>
  <section class="panel">
    <header class="panel__header"><h1>New loan application</h1></header>
    <form class="form-grid" @submit.prevent="form.submit">
      <p v-if="form.message.value" class="alert alert--error span-all">{{ form.message.value }}</p>
      <FormField label="Loan number" :error="form.error('loan_number')"><input v-model="form.data.loan_number" required /></FormField>
      <FormField label="Borrower" :error="form.error('member_id')"><MemberPicker v-model="form.data.member_id" /></FormField>
      <FormField label="Product" :error="form.error('loan_product_id')">
        <select v-model="form.data.loan_product_id" required>
          <option :value="null" disabled>Select a product</option>
          <option v-for="option in products" :key="option.id" :value="option.id">{{ option.name }} ({{ option.interest_rate }}%)</option>
        </select>
      </FormField>
      <FormField label="Principal" :error="form.error('principal')">
        <input v-model="form.data.principal" type="number" min="0" step="0.01" required />
        <small v-if="product" class="muted">{{ formatMoney(product.min_amount) }} – {{ formatMoney(product.max_amount) }}</small>
      </FormField>
      <FormField label="Term" :error="form.error('term')">
        <input v-model.number="form.data.term" type="number" min="1" required />
        <small v-if="product" class="muted">{{ product.min_term }} – {{ product.max_term }} {{ product.repayment_frequency === 'weekly' ? 'weeks' : 'months' }}</small>
      </FormField>
      <div class="form-actions span-all">
        <RouterLink class="btn" :to="{ name: 'loans.index' }">Cancel</RouterLink>
        <button class="btn btn--primary" type="submit" :disabled="form.processing.value">Submit application</button>
      </div>
    </form>
  </section>
</template>
