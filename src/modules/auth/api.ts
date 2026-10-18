import { http } from '@/core/api/http'
import type { Wrapped } from '@/core/api/types'
import type { LoginPayload, LoginResponse, RegisterPayload, RegisterResponse, User } from './types'

export const authApi = {
  login: (payload: LoginPayload) => http.post<LoginResponse>('/login', payload),
  register: (payload: RegisterPayload) => http.post<RegisterResponse>('/register', payload),
  logout: () => http.post<void>('/logout'),
  me: () => http.get<Wrapped<User>>('/user').then((response) => response.data),
}
