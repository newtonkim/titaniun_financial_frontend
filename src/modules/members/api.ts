import { createResourceApi } from '@/core/api/resource'
import type { Member, MemberFilters, StoreMemberPayload } from './types'

export const membersApi = createResourceApi<Member, StoreMemberPayload, Partial<StoreMemberPayload>, MemberFilters>('/members')
