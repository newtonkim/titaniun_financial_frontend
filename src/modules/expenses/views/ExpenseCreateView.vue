<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { today } from '@/core/utils/format'
import { expenseCategoriesApi, expensesApi } from '../api'
import type { ExpenseCategory } from '../types'

const router = useRouter()
const categories = ref<ExpenseCategory[]>([])

const form = useForm(
  { expense_category_id: null as number | null, amount: '', expense_date: today(), description: '', reference: '' },
  async ({ expense_category_id, ...rest }) => {
    await expensesApi.create({ ...rest, expense_category_id: expense_category_id ?? 0 })
    await router.push({ name: 'expenses.index' })
  },
)

onMounted(async () => {
  categories.value = (await expenseCategoriesApi.list()).data
})
</script>

<template>
  <section class="panel">
    <header class="panel__header"><h1>Record expense</h1></header>
    <form class="form-grid" @submit.prevent="form.submit">
      <p v-if="form.message.value" class="alert alert--error span-all">{{ form.message.value }}</p>
      <FormField label="Category" :error="form.error('expense_category_id')">
        <select v-model="form.data.expense_category_id" required>
          <option :value="null" disabled>Select a category</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </FormField>
      <FormField label="Amount" :error="form.error('amount')"><input v-model="form.data.amount" type="number" min="0.01" step="0.01" required /></FormField>
      <FormField label="Date" :error="form.error('expense_date')"><input v-model="form.data.expense_date" type="date" :max="today()" required /></FormField>
      <FormField label="Reference" :error="form.error('reference')"><input v-model="form.data.reference" /></FormField>
      <FormField class="span-all" label="Description" :error="form.error('description')"><input v-model="form.data.description" required /></FormField>
      <div class="form-actions span-all">
        <RouterLink class="btn" :to="{ name: 'expenses.index' }">Cancel</RouterLink>
        <button class="btn btn--primary" type="submit" :disabled="form.processing.value">Save expense</button>
      </div>
    </form>
  </section>
</template>
