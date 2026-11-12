<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/core/components/PageHeader.vue'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { useAuth } from '@/modules/auth/store'
import { accountingSettingsApi, type AccountingSettings } from '../api'

const { can } = useAuth()
const saved = ref(false)
const loadError = ref('')
const canManage = computed(() => can('accounting.manage'))
let current: AccountingSettings | null = null

const form = useForm(
  { business_name: '', business_tagline: '', business_address: '', business_phone: '', business_email: '', payment_instructions: '', invoice_notes: '', authorised_signatory: '', receipt_numbers_start_at: 1, invoice_numbers_start_at: 1 },
  async (data) => {
    if (!current) return
    const nullable = (value: string) => value.trim() || null
    current = await accountingSettingsApi.update({
      ...current,
      ...data,
      business_tagline: nullable(data.business_tagline),
      business_address: nullable(data.business_address),
      business_phone: nullable(data.business_phone),
      business_email: nullable(data.business_email),
      payment_instructions: nullable(data.payment_instructions),
      invoice_notes: nullable(data.invoice_notes),
      authorised_signatory: nullable(data.authorised_signatory),
    })
    saved.value = true
  },
)

onMounted(async () => {
  try {
    current = await accountingSettingsApi.show()
    Object.assign(form.data, Object.fromEntries(Object.keys(form.data).map((key) => [key, current?.[key as keyof AccountingSettings] ?? ''])))
  } catch {
    loadError.value = 'The settings could not be loaded.'
  }
})

const field = 'flex flex-col gap-1 text-sm font-medium'
const hint = 'text-xs font-normal text-muted-foreground'
const area = 'rounded-md border border-border bg-background px-3 py-2 text-sm font-normal'
</script>

<template>
  <div class="tw-scope flex max-w-2xl flex-col gap-6">
    <PageHeader title="Receipts and invoices" description="The business details printed on receipts, invoices and loan statements." />
    <form class="flex flex-col gap-5 rounded-lg border border-border bg-background p-5" @submit.prevent="form.submit">
      <p v-if="loadError || form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ loadError || form.message.value }}</p>
      <p v-if="saved" role="status" class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Saved.</p>
      <fieldset :disabled="!canManage" class="flex flex-col gap-4">
        <label :class="field">Business name<Input v-model="form.data.business_name" required maxlength="255" /></label>
        <label :class="field">Tagline<Input v-model="form.data.business_tagline" maxlength="255" /></label>
        <label :class="field">Address<Input v-model="form.data.business_address" maxlength="255" /></label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label :class="field">Phone<Input v-model="form.data.business_phone" maxlength="255" /></label>
          <label :class="field">Email<Input v-model="form.data.business_email" type="email" maxlength="255" /><span v-if="form.error('business_email')" class="text-xs font-normal text-destructive">{{ form.error('business_email') }}</span></label>
        </div>
        <label :class="field">
          Payment instructions
          <textarea v-model="form.data.payment_instructions" rows="5" maxlength="2000" :class="area" placeholder="Bank name, account name and number, and mobile money numbers" />
          <span :class="hint">Printed on every invoice, so borrowers know where to pay.</span>
        </label>
        <label :class="field">
          Invoice notes
          <textarea v-model="form.data.invoice_notes" rows="3" maxlength="2000" :class="area" placeholder="Late payments attract a penalty. Quote your invoice number when paying." />
        </label>
        <label :class="field">Invoices authorised by<Input v-model="form.data.authorised_signatory" maxlength="255" /></label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label :class="field">
            Receipt numbers start at
            <Input v-model.number="form.data.receipt_numbers_start_at" type="number" min="1" required />
            <span :class="hint">To carry on from a paper receipt book, enter its next number.</span>
          </label>
          <label :class="field">
            Invoice numbers start at
            <Input v-model.number="form.data.invoice_numbers_start_at" type="number" min="1" required />
            <span :class="hint">Numbers already issued are never reused.</span>
          </label>
        </div>
      </fieldset>
      <div v-if="canManage" class="flex justify-end"><Button type="submit" :disabled="form.processing.value">{{ form.processing.value ? 'Saving…' : 'Save' }}</Button></div>
    </form>
  </div>
</template>
