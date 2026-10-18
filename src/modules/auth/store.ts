import { computed, ref } from 'vue'
import { clearToken, getToken, setToken } from '@/core/auth/token'
import { authApi } from './api'
import type { LoginPayload, User } from './types'

const user = ref<User | null>(null)
const token = ref<string | null>(getToken())

async function login(credentials: Omit<LoginPayload, 'device_name'>): Promise<void> {
  const response = await authApi.login({ ...credentials, device_name: navigator.userAgent.slice(0, 255) || 'web' })
  setToken(response.token)
  token.value = response.token
  user.value = response.user
}

async function loadUser(): Promise<User> {
  user.value = await authApi.me()
  return user.value
}

/** Forget the session locally without calling the backend (e.g. after a 401). */
function forget(): void {
  clearToken()
  token.value = null
  user.value = null
}

async function logout(): Promise<void> {
  try {
    await authApi.logout()
  } finally {
    forget()
  }
}

export function useAuth() {
  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => token.value !== null),
    login,
    loadUser,
    logout,
    forget,
  }
}
