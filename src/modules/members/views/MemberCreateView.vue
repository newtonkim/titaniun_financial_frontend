<script setup lang="ts">
import { useRouter } from 'vue-router'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { formatEnum, today } from '@/core/utils/format'
import { membersApi } from '../api'
import { MEMBER_STATUSES, type StoreMemberPayload } from '../types'

const router = useRouter()

const form = useForm<StoreMemberPayload>(
  { member_number: '', first_name: '', last_name: '', national_id: '', phone: '', email: '', date_of_birth: '', status: 'active', joined_at: today() },
  async (payload) => {
    await membersApi.create(payload)
    await router.push({ name: 'members.index' })
  },
)
</script>

<template>
  <section class="panel">
    <header class="panel__header"><h1>New member</h1></header>
    <form class="form-grid" @submit.prevent="form.submit">
      <p v-if="form.message.value" class="alert alert--error span-all">{{ form.message.value }}</p>
      <FormField label="Member number" :error="form.error('member_number')"><input v-model="form.data.member_number" required /></FormField>
      <FormField label="National ID" :error="form.error('national_id')"><input v-model="form.data.national_id" required /></FormField>
      <FormField label="First name" :error="form.error('first_name')"><input v-model="form.data.first_name" required /></FormField>
      <FormField label="Last name" :error="form.error('last_name')"><input v-model="form.data.last_name" required /></FormField>
      <FormField label="Phone" :error="form.error('phone')"><input v-model="form.data.phone" type="tel" required /></FormField>
      <FormField label="Email" :error="form.error('email')"><input v-model="form.data.email" type="email" /></FormField>
      <FormField label="Date of birth" :error="form.error('date_of_birth')"><input v-model="form.data.date_of_birth" type="date" /></FormField>
      <FormField label="Joined" :error="form.error('joined_at')"><input v-model="form.data.joined_at" type="date" required /></FormField>
      <FormField label="Status" :error="form.error('status')">
        <select v-model="form.data.status">
          <option v-for="status in MEMBER_STATUSES" :key="status" :value="status">{{ formatEnum(status) }}</option>
        </select>
      </FormField>
      <div class="form-actions span-all">
        <RouterLink class="btn" :to="{ name: 'members.index' }">Cancel</RouterLink>
        <button class="btn btn--primary" type="submit" :disabled="form.processing.value">Save member</button>
      </div>
    </form>
  </section>
</template>
