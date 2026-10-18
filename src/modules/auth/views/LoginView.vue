<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import AuthLayout from '../components/AuthLayout.vue'
import PasswordInput from '../components/PasswordInput.vue'
import '../components/auth-form.css'
import { useAfterAuthRedirect } from '../composables'
import { useAuth } from '../store'

const auth = useAuth()
const redirectAfterAuth = useAfterAuthRedirect()

/** Revealed once the backend reports that the account has two-factor authentication. */
const needsTwoFactor = ref(false)
const useRecoveryCode = ref(false)
const codeInput = ref<HTMLInputElement | null>(null)

const form = useForm({ email: '', password: '', code: '', recovery_code: '' }, async ({ email, password, code, recovery_code }) => {
  await auth.login({
    email,
    password,
    code: useRecoveryCode.value ? undefined : code || undefined,
    recovery_code: useRecoveryCode.value ? recovery_code || undefined : undefined,
  })
  await redirectAfterAuth()
})

const hasFieldErrors = computed(() => Object.keys(form.errors.value).length > 0)

async function signIn(): Promise<void> {
  await form.submit()

  if (form.errors.value.code && !needsTwoFactor.value) {
    // First prompt for a code is a step in the flow, not a mistake.
    needsTwoFactor.value = true
    form.errors.value = {}
    form.message.value = null
    await nextTick()
    codeInput.value?.focus()
  }
}

async function toggleRecoveryCode(): Promise<void> {
  useRecoveryCode.value = !useRecoveryCode.value
  form.errors.value = {}
  await nextTick()
  codeInput.value?.focus()
}
</script>

<template>
  <AuthLayout>
    <form class="auth-form" novalidate @submit.prevent="signIn">
      <header class="auth-form__header">
        <h1>Sign in</h1>
        <p v-if="needsTwoFactor">Your account uses two-factor authentication.</p>
        <p v-else>Use your staff email and password.</p>
      </header>

      <p v-if="form.message.value && !hasFieldErrors" class="alert alert--error" role="alert">{{ form.message.value }}</p>

      <template v-if="!needsTwoFactor">
        <FormField label="Email" :error="form.error('email')">
          <input v-model="form.data.email" type="email" autocomplete="username" required autofocus />
        </FormField>
        <FormField label="Password" :error="form.error('password')">
          <PasswordInput v-model="form.data.password" autocomplete="current-password" />
        </FormField>
      </template>

      <template v-else>
        <FormField v-if="!useRecoveryCode" label="Authentication code" :error="form.error('code')">
          <input ref="codeInput" v-model="form.data.code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
          <span class="auth-form__help">Enter the 6-digit code from your authenticator app.</span>
        </FormField>
        <FormField v-else label="Recovery code" :error="form.error('code')">
          <input ref="codeInput" v-model="form.data.recovery_code" autocomplete="off" spellcheck="false" required />
          <span class="auth-form__help">Each recovery code works once.</span>
        </FormField>
        <button type="button" class="auth-form__switch" @click="toggleRecoveryCode">
          {{ useRecoveryCode ? 'Use an authentication code' : 'Use a recovery code instead' }}
        </button>
      </template>

      <button class="btn btn--primary" type="submit" :disabled="form.processing.value" :aria-busy="form.processing.value">
        <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
        {{ form.processing.value ? 'Signing in…' : needsTwoFactor ? 'Verify and sign in' : 'Sign in' }}
      </button>

      <p class="auth-form__aside">
        New staff member? <RouterLink :to="{ name: 'register', query: $route.query }">Create an account</RouterLink>
      </p>
    </form>
  </AuthLayout>
</template>
