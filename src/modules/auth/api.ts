import { http } from '@/core/api/http'
import type { Wrapped } from '@/core/api/types'
import type { LoginPayload, LoginResponse, RegisterPayload, RegisterResponse, ResetPasswordPayload, User } from './types'

export const authApi = {
  login: (payload: LoginPayload) => http.post<LoginResponse>('/login', payload),
  register: (payload: RegisterPayload) => http.post<RegisterResponse>('/register', payload),
  forgotPassword: (email: string) => http.post<{ message: string }>('/forgot-password', { email }),
  resetPassword: (payload: ResetPasswordPayload) => http.post<{ message: string }>('/reset-password', payload),
  logout: () => http.post<void>('/logout'),
  me: () => http.get<Wrapped<User>>('/user').then((response) => response.data),
}
