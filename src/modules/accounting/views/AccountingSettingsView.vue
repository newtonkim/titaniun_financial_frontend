<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { formatDate, today } from '@/core/utils/format'
import { useAuth } from '@/modules/auth/store'
import { accountingSettingsApi } from '../api'

const { can } = useAuth()
const saved = ref(false)
const loadError = ref('')
const canManage = computed(() => can('accounting.manage'))

const form = useForm({ books_locked_through: '', expense_backdate_days: 31, expense_approval_above: '' }, async (data) => {
  await accountingSettingsApi.update({ books_locked_through: data.books_locked_through || null, expense_backdate_days: data.expense_backdate_days, expense_approval_above: data.expense_approval_above === '' ? null : String(data.expense_approval_above) })
  saved.value = true
})

onMounted(async () => {
  try {
    const settings = await accountingSettingsApi.show()
    form.data.books_locked_through = settings.books_locked_through ?? ''
    form.data.expense_backdate_days = settings.expense_backdate_days
    form.data.expense_approval_above = settings.expense_approval_above ?? ''
  } catch {
    loadError.value = 'The settings could not be loaded.'
  }
})
</script>

<template>
  <div class="tw-scope flex max-w-xl flex-col gap-6">
    <PageHeader title="Books and periods" description="Optional safeguards. You can leave these as they are." />
    <form class="flex flex-col gap-5 rounded-lg border border-border bg-background p-5" @submit.prevent="form.submit">
      <p v-if="loadError || form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ loadError || form.message.value }}</p>
      <p v-if="saved" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Saved.</p>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Expenses above this amount need approval (UGX)
        <Input v-model="form.data.expense_approval_above" type="number" min="0" step="1" placeholder="No approval needed" :disabled="!canManage" />
        <span class="text-xs font-normal text-muted-foreground">Leave empty and every expense is recorded straight away. Set an amount and anything above it waits for a second person, who cannot be the one who recorded it.</span>
        <span v-if="form.error('expense_approval_above')" class="text-xs font-normal text-destructive">{{ form.error('expense_approval_above') }}</span>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Books locked through
        <Input v-model="form.data.books_locked_through" type="date" :max="today()" :disabled="!canManage" />
        <span class="text-xs font-normal text-muted-foreground">
          <template v-if="form.data.books_locked_through">Nothing can post on or before {{ formatDate(form.data.books_locked_through) }}. A correction goes in as a reversal in an open period.</template>
          <template v-else>Not locked. Anything can still post to any date.</template>
        </span>
        <span v-if="form.error('books_locked_through')" class="text-xs font-normal text-destructive">{{ form.error('books_locked_through') }}</span>
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        How many days back an expense can be dated
        <Input v-model.number="form.data.expense_backdate_days" type="number" min="0" max="366" required :disabled="!canManage" />
        <span class="text-xs font-normal text-muted-foreground">Stops old costs being slipped into a past month.</span>
        <span v-if="form.error('expense_backdate_days')" class="text-xs font-normal text-destructive">{{ form.error('expense_backdate_days') }}</span>
      </label>
      <div v-if="canManage" class="flex justify-end"><Button type="submit" :disabled="form.processing.value">{{ form.processing.value ? 'Saving…' : 'Save' }}</Button></div>
    </form>
  </div>
</template>
