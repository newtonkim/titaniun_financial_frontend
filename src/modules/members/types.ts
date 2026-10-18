import type { ISODate, ISODateTime } from '@/core/api/types'

export type MemberStatus = 'active' | 'inactive' | 'exited'

export const MEMBER_STATUSES: MemberStatus[] = ['active', 'inactive', 'exited']

export interface Member {
  id: number
  member_number: string
  first_name: string
  last_name: string
  national_id: string
  phone: string
  email: string | null
  date_of_birth: ISODate | null
  status: MemberStatus
  joined_at: ISODate
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

export interface StoreMemberPayload {
  member_number: string
  first_name: string
  last_name: string
  national_id: string
  phone: string
  email?: string | null
  date_of_birth?: ISODate | null
  status?: MemberStatus
  joined_at: ISODate
}

export type MemberFilters = {
  search?: string
  status?: MemberStatus | ''
}
