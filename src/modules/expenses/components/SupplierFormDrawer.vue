<script setup lang="ts">
import { computed, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { Input } from '@/core/components/ui/input'
import { useForm } from '@/core/composables/useForm'
import { suppliersApi } from '../api'
import type { Supplier, SupplierPayload } from '../types'

/** Add a supplier, or edit one. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ supplier: Supplier | null }>()
const emit = defineEmits<{ saved: [supplier: Supplier] }>()

const blank = { name: '', type: 'company' as SupplierPayload['type'], identifier_type: 'TIN' as NonNullable<SupplierPayload['identifier_type']>, identifier: '', is_resident: true, phone: '', mobile_money_number: '', bank_details: '', is_related_party: false, related_party_note: '', is_active: true }

const editing = computed(() => props.supplier !== null)
const form = useForm(structuredClone(blank), (data) => {
  const payload = { ...data, identifier: data.identifier || null, identifier_type: data.identifier ? data.identifier_type : null, phone: data.phone || null, mobile_money_number: data.mobile_money_number || null, bank_details: data.bank_details || null, related_party_note: data.related_party_note || null }
  return props.supplier ? suppliersApi.update(props.supplier.id, payload) : suppliersApi.create(payload)
})

async function save() {
  const supplier = await form.submit()
  if (supplier) {
    emit('saved', supplier)
    open.value = false
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  const supplier = props.supplier
  Object.assign(form.data, structuredClone(blank), supplier ? { ...supplier, identifier_type: supplier.identifier_type ?? 'TIN', identifier: supplier.identifier ?? '', phone: supplier.phone ?? '', mobile_money_number: supplier.mobile_money_number ?? '', bank_details: supplier.bank_details ?? '', related_party_note: supplier.related_party_note ?? '' } : {})
  form.errors.value = {}
  form.message.value = null
})

const field = 'flex flex-col gap-1 text-sm font-medium'
const select = 'h-9 rounded-md border border-border bg-background px-3 text-sm font-normal'
const fieldError = 'text-xs font-normal text-destructive'
</script>

<template>
  <AppDrawer v-model:open="open" :title="editing ? 'Edit supplier' : 'Add supplier'" :save-button-text="editing ? 'Save changes' : 'Add supplier'" :loading="form.processing.value" @save="save">
    <div class="flex flex-col gap-4">
      <p v-if="form.message.value" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ form.message.value }}</p>
      <label :class="field">
        Name
        <Input v-model="form.data.name" required maxlength="255" />
        <span v-if="form.error('name')" :class="fieldError">{{ form.error('name') }}</span>
      </label>
      <label :class="field">
        Type
        <select v-model="form.data.type" :class="select">
          <option value="company">Company</option>
          <option value="individual">Individual</option>
          <option value="government">Government body</option>
        </select>
      </label>
      <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
        <label :class="field">
          ID type
          <select v-model="form.data.identifier_type" :class="select">
            <option value="TIN">TIN</option>
            <option value="NIN">NIN</option>
            <option value="BRN">BRN</option>
          </select>
        </label>
        <label :class="field">
          ID number
          <Input v-model="form.data.identifier" maxlength="50" />
          <span v-if="form.error('identifier')" :class="fieldError">{{ form.error('identifier') }}</span>
        </label>
      </div>
      <label :class="field">
        Phone
        <Input v-model="form.data.phone" maxlength="30" />
      </label>
      <label :class="field">
        Mobile money number
        <Input v-model="form.data.mobile_money_number" maxlength="30" />
      </label>
      <label :class="field">
        Bank details
        <textarea v-model="form.data.bank_details" rows="2" maxlength="500" class="rounded-md border border-border bg-background px-3 py-2 text-sm font-normal" />
      </label>
      <label class="flex items-center gap-2 text-sm font-normal"><input v-model="form.data.is_resident" type="checkbox" /> Resident in Uganda</label>
      <label class="flex items-start gap-2 text-sm font-normal">
        <input v-model="form.data.is_related_party" type="checkbox" class="mt-0.5" />
        <span>Related party <span class="block text-xs text-muted-foreground">Owned by or connected to a board member, committee member or staff member.</span></span>
      </label>
      <label v-if="form.data.is_related_party" :class="field">
        Who is connected, and how?
        <textarea v-model="form.data.related_party_note" rows="2" maxlength="500" required class="rounded-md border border-border bg-background px-3 py-2 text-sm font-normal" />
        <span v-if="form.error('related_party_note')" :class="fieldError">{{ form.error('related_party_note') }}</span>
      </label>
      <label class="flex items-center gap-2 text-sm font-normal"><input v-model="form.data.is_active" type="checkbox" /> Active</label>
    </div>
  </AppDrawer>
</template>
