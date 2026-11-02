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

const form = useForm({ books_locked_through: '', expense_backdate_days: 7 }, async (data) => {
  await accountingSettingsApi.update({ books_locked_through: data.books_locked_through || null, expense_backdate_days: data.expense_backdate_days })
  saved.value = true
})

onMounted(async () => {
  try {
    const settings = await accountingSettingsApi.show()
    form.data.books_locked_through = settings.books_locked_through ?? ''
    form.data.expense_backdate_days = settings.expense_backdate_days
  } catch {
    loadError.value = 'The settings could not be loaded.'
  }
})
</script>

<template>
  <div class="tw-scope flex max-w-xl flex-col gap-6">
    <PageHeader title="Books and periods" description="Protect figures that have already been reported." />
    <form class="flex flex-col gap-5 rounded-lg border border-border bg-background p-5" @submit.prevent="form.submit">
      <p v-if="loadError || form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ loadError || form.message.value }}</p>
      <p v-if="saved" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Saved.</p>
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
        Days a voucher can be dated back
        <Input v-model.number="form.data.expense_backdate_days" type="number" min="0" max="366" required :disabled="!canManage" />
        <span class="text-xs font-normal text-muted-foreground">Checked when a voucher is submitted, so old costs cannot be slipped into a past month.</span>
        <span v-if="form.error('expense_backdate_days')" class="text-xs font-normal text-destructive">{{ form.error('expense_backdate_days') }}</span>
      </label>
      <div v-if="canManage" class="flex justify-end"><Button type="submit" :disabled="form.processing.value">{{ form.processing.value ? 'Saving…' : 'Save' }}</Button></div>
    </form>
  </div>
</template>
