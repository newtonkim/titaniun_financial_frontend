<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { authApi } from '../api'
import AuthLayout from '../components/AuthLayout.vue'
import PasswordInput from '../components/PasswordInput.vue'
import '../components/auth-form.css'

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = typeof route.query.email === 'string' ? route.query.email : ''

const hasValidLink = token !== '' && email !== ''
const completed = ref(false)

const form = useForm({ password: '', password_confirmation: '' }, async (passwords) => {
  await authApi.resetPassword({ token, email, ...passwords })
  completed.value = true
})

/** The backend reports expired or already-used tokens against the email field. */
const linkExpired = computed(() => form.error('email') !== undefined)
const confirmationMismatch = computed(
  () => form.data.password_confirmation.length > 0 && form.data.password_confirmation !== form.data.password,
)
</script>

<template>
  <AuthLayout>
    <section v-if="completed" class="auth-form" aria-live="polite">
      <header class="auth-form__header">
        <h1>Password updated</h1>
        <p>Your password has been changed and you've been signed out of every device. Sign in with your new password.</p>
      </header>
      <RouterLink class="auth-form__primary" :to="{ name: 'login', query: { email } }">Sign in</RouterLink>
    </section>

    <section v-else-if="!hasValidLink || linkExpired" class="auth-form" role="alert">
      <header class="auth-form__header">
        <h1>{{ hasValidLink ? 'This link has expired' : 'This link isn’t valid' }}</h1>
        <p>Reset links work once and expire after 60 minutes. Request a new one to continue.</p>
      </header>
      <RouterLink class="auth-form__primary" :to="{ name: 'forgot-password', query: email ? { email } : {} }">Request a new link</RouterLink>
      <p class="auth-form__divider">Remembered it?</p>
      <RouterLink class="auth-form__secondary" :to="{ name: 'login' }">Back to sign in</RouterLink>
    </section>

    <form v-else class="auth-form" novalidate @submit.prevent="form.submit">
      <header class="auth-form__header">
        <h1>Choose a new password</h1>
        <p>
          For <strong>{{ email }}</strong>. You'll be signed out of every device once it's changed.
        </p>
      </header>

      <p v-if="form.message.value && !form.error('password')" class="alert alert--error" role="alert">{{ form.message.value }}</p>

      <FormField label="New password" :error="form.error('password')">
        <PasswordInput v-model="form.data.password" autocomplete="new-password" placeholder="Create a password" />
      </FormField>
      <FormField label="Confirm new password" :error="confirmationMismatch ? 'Passwords don’t match yet.' : undefined">
        <PasswordInput v-model="form.data.password_confirmation" autocomplete="new-password" placeholder="Repeat your password" />
      </FormField>

      <button class="auth-form__primary" type="submit" :disabled="form.processing.value || confirmationMismatch" :aria-busy="form.processing.value">
        <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
        {{ form.processing.value ? 'Updating password…' : 'Reset password' }}
      </button>

      <p class="auth-form__divider">Remembered it?</p>
      <RouterLink class="auth-form__secondary" :to="{ name: 'login', query: { email } }">Back to sign in</RouterLink>
    </form>
  </AuthLayout>
</template>
