import type { ISODateTime } from '@/core/api/types'

export interface AccessRole {
  id: number
  name: string
  label: string
  description: string | null
  protected: boolean
  permissions: string[]
  users_count: number
}
export interface PermissionGroup {
  name: string
  permissions: { name: string; label: string }[]
}
export interface StaffAccess {
  id: number
  name: string
  email: string
  approved_at: ISODateTime | null
  roles: string[]
  permissions: string[]
  created_at: ISODateTime | null
}
export interface AccessActivity {
  id: number
  action: string
  subject: string
  actor: string
  created_at: ISODateTime
  before: { roles?: string[]; permissions?: string[]; name?: string }
  after: { roles?: string[]; permissions?: string[]; name?: string }
}
export interface RolePayload {
  name: string
  description: string
  permissions: string[]
}
