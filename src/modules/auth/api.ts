import { http } from '@/core/api/http'
import type { Wrapped } from '@/core/api/types'
import type { LoginPayload, LoginResponse, User } from './types'

export const authApi = {
  login: (payload: LoginPayload) => http.post<LoginResponse>('/login', payload),
  logout: () => http.post<void>('/logout'),
  me: () => http.get<Wrapped<User>>('/user').then((response) => response.data),
}
