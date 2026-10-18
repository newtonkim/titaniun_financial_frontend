<script setup lang="ts">
import { computed, ref } from 'vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import AuthLayout from '../components/AuthLayout.vue'
import PasswordInput from '../components/PasswordInput.vue'
import '../components/auth-form.css'
import { authApi } from '../api'

/** Email of the account just created; it stays locked until an administrator approves it. */
const pendingEmail = ref<string | null>(null)

const form = useForm({ name: '', email: '', password: '', password_confirmation: '' }, async (details) => {
  const response = await authApi.register(details)
  pendingEmail.value = response.user.email
})

const hasFieldErrors = computed(() => Object.keys(form.errors.value).length > 0)
const confirmationMismatch = computed(
  () => form.data.password_confirmation.length > 0 && form.data.password_confirmation !== form.data.password,
)
</script>

<template>
  <AuthLayout>
    <section v-if="pendingEmail" class="auth-form" role="status">
      <header class="auth-form__header">
        <h1>Account awaiting approval</h1>
        <p>
          We've created the account for <strong>{{ pendingEmail }}</strong>. An administrator needs to approve it before you can
          sign in. Ask your branch manager to approve it.
        </p>
      </header>
      <RouterLink class="btn btn--primary" :to="{ name: 'login', query: $route.query }">Go to sign in</RouterLink>
    </section>

    <form v-else class="auth-form" novalidate @submit.prevent="form.submit">
      <header class="auth-form__header">
        <h1>Create your staff account</h1>
        <p>An administrator approves new accounts before they can sign in.</p>
      </header>

      <p v-if="form.message.value && !hasFieldErrors" class="alert alert--error" role="alert">{{ form.message.value }}</p>

      <FormField label="Full name" :error="form.error('name')">
        <input v-model="form.data.name" autocomplete="name" required autofocus />
      </FormField>
      <FormField label="Work email" :error="form.error('email')">
        <input v-model="form.data.email" type="email" autocomplete="email" required />
      </FormField>
      <FormField label="Password" :error="form.error('password')">
        <PasswordInput v-model="form.data.password" autocomplete="new-password" />
        <span v-if="!form.error('password')" class="auth-form__help">Use a long password you don't use anywhere else.</span>
      </FormField>
      <FormField label="Confirm password" :error="confirmationMismatch ? 'Passwords don’t match yet.' : undefined">
        <PasswordInput v-model="form.data.password_confirmation" autocomplete="new-password" />
      </FormField>

      <button class="btn btn--primary" type="submit" :disabled="form.processing.value || confirmationMismatch" :aria-busy="form.processing.value">
        <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
        {{ form.processing.value ? 'Creating account…' : 'Create account' }}
      </button>

      <p class="auth-form__aside">
        Already have an account? <RouterLink :to="{ name: 'login', query: $route.query }">Sign in</RouterLink>
      </p>
    </form>
  </AuthLayout>
</template>
