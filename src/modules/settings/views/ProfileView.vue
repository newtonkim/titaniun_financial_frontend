<script setup lang="ts">
import { computed, ref } from 'vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { useAuth } from '@/modules/auth/store'
import { settingsApi } from '../api'
import SettingsPage from './SettingsPage.vue'

const auth = useAuth()
const saved = ref(false)

const form = useForm({ name: auth.user.value?.name ?? '', email: auth.user.value?.email ?? '' }, async (payload) => {
  saved.value = false
  auth.setUser(await settingsApi.updateProfile(payload))
  saved.value = true
})

const hasFieldErrors = computed(() => Object.keys(form.errors.value).length > 0)
const emailChanged = computed(() => form.data.email !== auth.user.value?.email)
</script>

<template>
  <SettingsPage icon="user" title="Profile" description="Your name and the email you sign in with.">
    <form novalidate @submit.prevent="form.submit">
      <p v-if="form.message.value && !hasFieldErrors" class="alert alert--error" role="alert">{{ form.message.value }}</p>

      <FormField label="Full name" :error="form.error('name')">
        <input v-model="form.data.name" autocomplete="name" required @input="saved = false" />
      </FormField>
      <FormField label="Email address" :error="form.error('email')">
        <input v-model="form.data.email" type="email" autocomplete="email" required @input="saved = false" />
        <span v-if="emailChanged" class="muted">You'll sign in with the new address from now on.</span>
      </FormField>

      <div class="form-actions">
        <button class="btn btn--primary" type="submit" :disabled="form.processing.value">
          <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
          {{ form.processing.value ? 'Saving…' : 'Save changes' }}
        </button>
        <span v-if="saved" class="saved" role="status">Profile saved.</span>
      </div>
    </form>
  </SettingsPage>
</template>
