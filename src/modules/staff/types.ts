import type { StaffAccess } from '@/modules/settings/access-types'

export type StaffUser = StaffAccess

export type StaffFilters = {
  search?: string
  status?: 'active' | 'inactive' | ''
  role?: string
}

export interface StaffPayload {
  name: string
  email: string
  /** Required for a new account; leave empty when editing to keep the current password. */
  password: string
  roles: string[]
  is_active: boolean
}
