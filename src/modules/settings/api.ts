import { http, request } from '@/core/api/http'
import type { Wrapped } from '@/core/api/types'
import type { User } from '@/modules/auth/types'

export interface UpdateProfilePayload {
  name: string
  email: string
}

export interface UpdatePasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

export const settingsApi = {
  updateProfile: (payload: UpdateProfilePayload) => http.patch<Wrapped<User>>('/user', payload).then((response) => response.data),
  /** Signs out every other device; this session stays signed in. */
  updatePassword: (payload: UpdatePasswordPayload) => request<{ message: string }>('PUT', '/user/password', { body: payload }),
}
