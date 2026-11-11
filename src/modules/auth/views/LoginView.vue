<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import FormField from '@/core/components/FormField.vue'
import { useForm } from '@/core/composables/useForm'
import AuthLayout from '../components/AuthLayout.vue'
import PasswordInput from '../components/PasswordInput.vue'
import '../components/auth-form.css'
import { useAfterAuthRedirect } from '../composables'
import { support } from '../config'
import { useAuth } from '../store'

const auth = useAuth()
const route = useRoute()
const redirectAfterAuth = useAfterAuthRedirect()

/** Revealed once the backend reports that the account has two-factor authentication. */
const needsTwoFactor = ref(false)
const useRecoveryCode = ref(false)
const codeInput = ref<HTMLInputElement | null>(null)

const form = useForm(
  { email: typeof route.query.email === 'string' ? route.query.email : '', password: '', remember: false, code: '', recovery_code: '' },
  async ({ email, password, remember, code, recovery_code }) => {
    await auth.login(
      {
        email,
        password,
        code: useRecoveryCode.value ? undefined : code || undefined,
        recovery_code: useRecoveryCode.value ? recovery_code || undefined : undefined,
      },
      remember,
    )
    await redirectAfterAuth()
  },
)

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
        <h1>Welcome back</h1>
        <p v-if="needsTwoFactor">Your account uses two-factor authentication.</p>
        <p v-else>Sign in to your client portal.</p>
      </header>

      <p v-if="form.message.value && !hasFieldErrors" class="alert alert--error" role="alert">{{ form.message.value }}</p>

      <template v-if="!needsTwoFactor">
        <FormField label="Email address" :error="form.error('email')">
          <input v-model="form.data.email" type="email" autocomplete="username" placeholder="you@company.co.ug" required autofocus />
        </FormField>

        <div class="field" :class="{ 'field--invalid': form.error('password') }">
          <div class="auth-form__label-row">
            <label for="password" class="field__label">Password</label>
            <RouterLink :to="{ name: 'forgot-password', query: form.data.email ? { email: form.data.email } : {} }">Forgot password?</RouterLink>
          </div>
          <PasswordInput id="password" v-model="form.data.password" autocomplete="current-password" placeholder="Enter your password" />
          <span v-if="form.error('password')" class="field__error">{{ form.error('password') }}</span>
        </div>

        <label class="auth-form__remember">
          <input v-model="form.data.remember" type="checkbox" />
          Keep me signed in
        </label>
      </template>

      <template v-else>
        <FormField v-if="!useRecoveryCode" label="Authentication code" :error="form.error('code')">
          <input ref="codeInput" v-model="form.data.code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code" required />
          <span class="auth-form__hint">Enter the code from your authenticator app.</span>
        </FormField>
        <FormField v-else label="Recovery code" :error="form.error('code')">
          <input ref="codeInput" v-model="form.data.recovery_code" autocomplete="off" spellcheck="false" required />
          <span class="auth-form__hint">Each recovery code works once.</span>
        </FormField>
        <button type="button" class="auth-form__switch" @click="toggleRecoveryCode">
          {{ useRecoveryCode ? 'Use an authentication code' : 'Use a recovery code instead' }}
        </button>
      </template>

      <button class="auth-form__primary" type="submit" :disabled="form.processing.value" :aria-busy="form.processing.value">
        <span v-if="form.processing.value" class="spinner" aria-hidden="true" />
        {{ form.processing.value ? 'Signing in…' : needsTwoFactor ? 'Verify and sign in' : 'Sign in' }}
      </button>

      <p class="auth-form__divider">New to Titanium?</p>
      <RouterLink class="auth-form__secondary" :to="{ name: 'register', query: $route.query }">Create an account</RouterLink>

      <p v-if="support.phone || support.email" class="auth-form__help">
        Need help?
        <template v-if="support.phone">Call <a :href="`tel:${support.phone}`">{{ support.phone }}</a></template>
        <template v-if="support.phone && support.email"> or </template>
        <template v-if="support.email">email <a :href="`mailto:${support.email}`">{{ support.email }}</a></template>
      </p>
    </form>
  </AuthLayout>
</template>
