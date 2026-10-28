import { computed, ref } from 'vue'
import { clearToken, getToken, setToken } from '@/core/auth/token'
import { permissionForRoute } from '@/core/auth/permissions'
import { authApi } from './api'
import type { LoginPayload, LoginResponse, User } from './types'

const user = ref<User | null>(null)
const token = ref<string | null>(getToken())

const deviceName = () => navigator.userAgent.slice(0, 255) || 'web'

function startSession(response: LoginResponse, remember: boolean): void {
  setToken(response.token, remember)
  token.value = response.token
  user.value = response.user
}

async function login(credentials: Omit<LoginPayload, 'device_name'>, remember = true): Promise<void> {
  startSession(await authApi.login({ ...credentials, device_name: deviceName() }), remember)
}


async function loadUser(): Promise<User> {
  user.value = await authApi.me()
  return user.value
}

/** Replace the cached user after their profile changes. */
function setUser(updated: User): void {
  user.value = updated
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

function can(permission?: string): boolean {
  return !!user.value?.approved_at && (!permission || user.value.permissions?.includes(permission) === true)
}

function canRoute(name: unknown): boolean {
  return can(permissionForRoute(String(name ?? '')))
}

export function useAuth() {
  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => token.value !== null),
    can,
    canRoute,
    login,
    loadUser,
    setUser,
    logout,
    forget,
  }
}
