import type { ISODateTime } from '@/core/api/types'

export interface User {
  id: number
  name: string
  email: string
  email_verified_at: ISODateTime | null
  created_at: ISODateTime | null
}

export interface LoginPayload {
  email: string
  password: string
  device_name: string
  /** Two-factor authentication code, when enabled for the user. */
  code?: string
  recovery_code?: string
}

export interface LoginResponse {
  token: string
  token_type: 'Bearer'
  user: User
}
