<script setup lang="ts">
import { computed, ref } from 'vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import PasswordInput from '@/modules/auth/components/PasswordInput.vue'
import { settingsApi } from '../api'
import SettingsPage from './SettingsPage.vue'

const saved = ref(false)

const form = useForm({ current_password: '', password: '', password_confirmation: '' }, async (payload) => {
  saved.value = false
  await settingsApi.updatePassword(payload)
  form.data.current_password = ''
  form.data.password = ''
  form.data.password_confirmation = ''
  saved.value = true
})

const hasFieldErrors = computed(() => Object.keys(form.errors.value).length > 0)
const confirmationMismatch = computed(
  () => form.data.password_confirmation.length > 0 && form.data.password_confirmation !== form.data.password,
)
</script>

<template>
  <SettingsPage icon="lock" title="Security" description="Change your password. Every other device will be signed out; this one stays signed in.">
    <form novalidate @submit.prevent="form.submit">
      <p v-if="form.message.value && !hasFieldErrors" class="alert alert--error" role="alert">{{ form.message.value }}</p>

      <FormField label="Current password" :error="form.error('current_password')">
        <PasswordInput v-model="form.data.current_password" autocomplete="current-password" />
      </FormField>
      <FormField label="New password" :error="form.error('password')">
        <PasswordInput v-model="form.data.password" autocomplete="new-password" />
      </FormField>
      <FormField label="Confirm new password" :error="confirmationMismatch ? 'Passwords don’t match yet.' : undefined">
        <PasswordInput v-model="form.data.password_confirmation" autocomplete="new-password" />
      </FormField>

      <div class="form-actions">
        <button class="btn btn--primary" type="submit" :disabled="form.processing.value || confirmationMismatch">
          <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
          {{ form.processing.value ? 'Updating…' : 'Update password' }}
        </button>
        <span v-if="saved" class="saved" role="status">Password updated. Other devices have been signed out.</span>
      </div>
    </form>
  </SettingsPage>
</template>
