<script setup lang="ts">
import { computed, ref } from 'vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { authApi } from '../api'
import AuthLayout from '../components/AuthLayout.vue'
import PasswordInput from '../components/PasswordInput.vue'
import '../components/auth-form.css'

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
        <h1>Awaiting approval</h1>
        <p>
          We've created the account for <strong>{{ pendingEmail }}</strong>. An administrator needs to approve it before you can
          sign in.
        </p>
      </header>
      <RouterLink class="auth-form__primary" :to="{ name: 'login', query: $route.query }">Go to sign in</RouterLink>
    </section>

    <form v-else class="auth-form" novalidate @submit.prevent="form.submit">
      <header class="auth-form__header">
        <h1>Create an account</h1>
        <p>An administrator approves new accounts before they can sign in.</p>
      </header>

      <p v-if="form.message.value && !hasFieldErrors" class="alert alert--error" role="alert">{{ form.message.value }}</p>

      <FormField label="Full name" :error="form.error('name')">
        <input v-model="form.data.name" autocomplete="name" placeholder="Jane Namukasa" required autofocus />
      </FormField>
      <FormField label="Email address" :error="form.error('email')">
        <input v-model="form.data.email" type="email" autocomplete="email" placeholder="you@company.co.ug" required />
      </FormField>
      <FormField label="Password" :error="form.error('password')">
        <PasswordInput v-model="form.data.password" autocomplete="new-password" placeholder="Create a password" />
      </FormField>
      <FormField label="Confirm password" :error="confirmationMismatch ? 'Passwords don’t match yet.' : undefined">
        <PasswordInput v-model="form.data.password_confirmation" autocomplete="new-password" placeholder="Repeat your password" />
      </FormField>

      <button class="auth-form__primary" type="submit" :disabled="form.processing.value || confirmationMismatch" :aria-busy="form.processing.value">
        <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
        {{ form.processing.value ? 'Creating account…' : 'Create account' }}
      </button>

      <p class="auth-form__divider">Already have an account?</p>
      <RouterLink class="auth-form__secondary" :to="{ name: 'login', query: $route.query }">Sign in</RouterLink>
    </form>
  </AuthLayout>
</template>
