<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import { authApi } from '../api'
import AuthLayout from '../components/AuthLayout.vue'
import '../components/auth-form.css'

const RESEND_COOLDOWN_SECONDS = 60

const route = useRoute()

/** Email the link was sent to; switches the page to its confirmation state. */
const sentTo = ref<string | null>(null)
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

function startCooldown(): void {
  cooldown.value = RESEND_COOLDOWN_SECONDS
  clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

const form = useForm({ email: typeof route.query.email === 'string' ? route.query.email : '' }, async ({ email }) => {
  await authApi.forgotPassword(email)
  sentTo.value = email
  startCooldown()
})

const hasFieldErrors = computed(() => Object.keys(form.errors.value).length > 0)

function useDifferentEmail(): void {
  sentTo.value = null
  form.errors.value = {}
  form.message.value = null
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <AuthLayout>
    <section v-if="sentTo" class="auth-form" aria-live="polite">
      <header class="auth-form__header">
        <h1>Check your email</h1>
        <p>
          If an account exists for <strong>{{ sentTo }}</strong>, we've sent a link to reset your password. The link expires in
          60 minutes.
        </p>
      </header>

      <p v-if="form.message.value" class="alert alert--error" role="alert">{{ form.error('email') ?? form.message.value }}</p>

      <RouterLink class="auth-form__primary" :to="{ name: 'login', query: { email: sentTo } }">Back to sign in</RouterLink>

      <p class="auth-form__divider">Didn't get the email?</p>
      <button class="auth-form__secondary" type="button" :disabled="cooldown > 0 || form.processing.value" @click="form.submit">
        <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
        {{ form.processing.value ? 'Sending…' : cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link' }}
      </button>
      <p class="auth-form__help">
        Check your spam folder, or
        <button type="button" class="auth-form__inline" @click="useDifferentEmail">use a different email</button>.
      </p>
    </section>

    <form v-else class="auth-form" novalidate @submit.prevent="form.submit">
      <header class="auth-form__header">
        <h1>Forgot your password?</h1>
        <p>Enter the email you sign in with and we'll send you a link to choose a new one.</p>
      </header>

      <p v-if="form.message.value && !hasFieldErrors" class="alert alert--error" role="alert">{{ form.message.value }}</p>

      <FormField label="Email address" :error="form.error('email')">
        <input v-model="form.data.email" type="email" autocomplete="email" placeholder="you@company.co.ug" required autofocus />
      </FormField>

      <button class="auth-form__primary" type="submit" :disabled="form.processing.value" :aria-busy="form.processing.value">
        <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
        {{ form.processing.value ? 'Sending link…' : 'Send reset link' }}
      </button>

      <p class="auth-form__divider">Remembered it?</p>
      <RouterLink class="auth-form__secondary" :to="{ name: 'login', query: form.data.email ? { email: form.data.email } : {} }">
        Back to sign in
      </RouterLink>
    </form>
  </AuthLayout>
</template>
