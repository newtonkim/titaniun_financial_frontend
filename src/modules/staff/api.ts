import { createResourceApi } from '@/core/api/resource'
import type { StaffFilters, StaffPayload, StaffUser } from './types'

/** Staff accounts: create, edit, deactivate and delete the people who sign in. */
export const staffApi = createResourceApi<StaffUser, StaffPayload, StaffPayload, StaffFilters>('/staff')
