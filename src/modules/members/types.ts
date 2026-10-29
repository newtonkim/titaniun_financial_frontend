import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Loan } from '@/modules/loans/types'
import type { SavingsAccount } from '@/modules/savings/types'
import type { ShareAccount } from '@/modules/shares/types'

export type MemberStatus = 'pending' | 'active' | 'dormant' | 'suspended' | 'rejected' | 'inactive' | 'exited'
export type MemberType = 'new_member' | 'existing_member'
export type Gender = 'male' | 'female' | 'other'
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'

export const MEMBER_STATUSES: MemberStatus[] = [
  'pending',
  'active',
  'dormant',
  'suspended',
  'rejected',
  'inactive',
  'exited',
]
/** Statuses an edit may set directly; pending and rejected belong to the approval workflow. */
export const EDITABLE_STATUSES: MemberStatus[] = ['active', 'dormant', 'suspended', 'inactive', 'exited']
export const GENDERS: Gender[] = ['male', 'female', 'other']
export const MARITAL_STATUSES: MaritalStatus[] = ['single', 'married', 'divorced', 'widowed']
export const SALUTATIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'] as const

export interface UserSummary {
  id: number
  name: string
}

export interface ClientApplicationDetails {
  applicant_type?: 'individual' | 'business'
  employer?: string | null
  occupation?: string | null
  district?: string | null
  business_registration_number?: string | null
  business_activity?: string | null
  signatory_name?: string | null
  signatory_title?: string | null
  signatory_national_id?: string | null
}

export interface Member extends ClientApplicationDetails {
  id: number
  member_number: string
  name: string
  member_type: MemberType
  salutation: string | null
  gender: Gender | null
  date_of_birth: ISODate | null
  marital_status: MaritalStatus | null
  nationality: string | null
  address: string | null
  national_id: string | null
  phone: string
  phone_country: string | null
  other_contact: string | null
  other_contact_country: string | null
  mobile_money_number: string | null
  mobile_money_country: string | null
  email: string | null
  next_of_kin: string | null
  next_of_kin_contact: string | null
  next_of_kin_contact_country: string | null
  is_shareholder: boolean
  initial_deposit: Money | null
  opening_balance: Money | null
  avatar_url: string | null
  status: MemberStatus
  joined_at: ISODate
  referred_by: number | null
  referrer?: UserSummary | null
  registered_by: number | null
  registrar?: UserSummary | null
  approved_by: number | null
  approver?: UserSummary | null
  approved_at: ISODateTime | null
  rejected_by: number | null
  rejecter?: UserSummary | null
  rejected_at: ISODateTime | null
  rejection_reason: string | null
  savings_accounts?: SavingsAccount[]
  share_accounts?: ShareAccount[]
  loans?: Loan[]
  created_at: ISODateTime | null
  updated_at: ISODateTime | null
}

/** Personal and contact details shared by registering and editing a member. */
export interface MemberDetailsPayload extends ClientApplicationDetails {
  member_number?: string | null
  name: string
  salutation?: string | null
  gender: Gender | null
  date_of_birth?: ISODate | null
  marital_status: MaritalStatus | null
  nationality: string
  address: string
  national_id?: string | null
  phone: string
  other_contact?: string | null
  mobile_money_number?: string | null
  email?: string | null
  next_of_kin?: string | null
  next_of_kin_contact?: string | null
  is_shareholder?: boolean
  joined_at?: ISODate | null
}

export interface StoreMemberPayload extends MemberDetailsPayload {
  member_type: MemberType
  savings_product_id?: number | null
  initial_deposit?: number | null
  opening_balance?: number | null
  share_product_id?: number | null
  shares_quantity?: number | null
}

export interface UpdateMemberPayload extends Partial<MemberDetailsPayload> {
  member_type?: MemberType
  status?: MemberStatus
}

export type MemberFilters = {
  search?: string
  status?: MemberStatus | ''
  member_type?: MemberType | ''
  per_page?: number
}

export interface MemberTransaction {
  id: number
  source: 'savings' | 'shares' | 'loans'
  type: string
  account_id: number
  account: string
  /** The account's product. */
  account_type: string | null
  amount: Money
  date: ISODate
  transacted_at: ISODateTime
  reference: string | null
  narration: string | null
  transacted_by: string | null
  recorded_by: string | null
  journal_entry_id: number | null
  reversal_of_id: number | null
  reversed_at: ISODateTime | null
  is_reversible: boolean
}

export interface MemberImportResult {
  imported: number
  failed: number
  failures: { row: number; errors: Record<string, string[]> }[]
}
