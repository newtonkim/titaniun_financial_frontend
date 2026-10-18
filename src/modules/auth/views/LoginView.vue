<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { useAuth } from '../store'

const auth = useAuth()
const route = useRoute()
const router = useRouter()

const form = useForm({ email: '', password: '', code: '' }, async ({ email, password, code }) => {
  await auth.login({ email, password, code: code || undefined })
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
  await router.replace(redirect)
})
</script>

<template>
  <main class="auth">
    <form class="auth__card" @submit.prevent="form.submit">
      <h1>Titanium Financial</h1>
      <p class="muted">Sign in with your staff account.</p>

      <p v-if="form.message.value" class="alert alert--error">{{ form.message.value }}</p>

      <FormField label="Email" :error="form.error('email')">
        <input v-model="form.data.email" type="email" autocomplete="username" required />
      </FormField>
      <FormField label="Password" :error="form.error('password')">
        <input v-model="form.data.password" type="password" autocomplete="current-password" required />
      </FormField>
      <FormField label="Two-factor code (if enabled)" :error="form.error('code')">
        <input v-model="form.data.code" inputmode="numeric" autocomplete="one-time-code" />
      </FormField>

      <button class="btn btn--primary" type="submit" :disabled="form.processing.value">
        {{ form.processing.value ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </main>
</template>
