import type { ISODate, ISODateTime, Money } from '@/core/api/types'
import type { Loan } from '@/modules/loans/types'
import type { SavingsAccount } from '@/modules/savings/types'
import type { ShareAccount } from '@/modules/shares/types'

export type MemberStatus = 'pending' | 'active' | 'dormant' | 'suspended' | 'rejected' | 'inactive' | 'exited'
export type MemberType = 'new_member' | 'existing_member'
/** Members save and borrow; free agents only save. */
export type MemberCategory = 'member' | 'free_agent'
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

/** Free agent settings: a free agent code is the prefix, a dash, then exactly `code_length` letters or digits. */
export interface MemberSettings {
  code_prefix: string
  code_length: number
  /** A member's open savings accounts move to this product when they become a free agent. */
  savings_product_id: number | null
  /** A free agent's accounts on the free agent product move to this one when they become a member. */
  member_savings_product_id: number | null
}

export interface Member extends ClientApplicationDetails {
  id: number
  member_number: string
  name: string
  member_type: MemberType
  category: MemberCategory
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
  guarantor_name: string | null
  guarantor_nin: string | null
  guarantor_phone: string | null
  guarantor_address: string | null
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
  guarantor_name?: string | null
  guarantor_nin?: string | null
  guarantor_phone?: string | null
  guarantor_address?: string | null
  is_shareholder?: boolean
  joined_at?: ISODate | null
  category?: MemberCategory
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
  category?: MemberCategory
  status?: MemberStatus | ''
  member_type?: MemberType | ''
  per_page?: number
}

export interface MemberTransaction {
  id: number
  source: MemberAccountSource
  type: string
  /** Read in the account's own direction: a repayment credits the loan. */
  direction: 'credit' | 'debit'
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
  /** This account's balance after the entry: savings held, loan principal owed, or the value of the shares held. */
  balance_after: Money
  /** Shares held after the entry, on share accounts. */
  shares_after: number | null
  /** Instalment money waiting to buy a whole share, on instalment rows. */
  subscription_after: Money | null
  principal_paid: Money | null
  interest_paid: Money | null
  fees_paid: Money | null
}

export type MemberAccountSource = 'savings' | 'shares' | 'loans'

/** The member's balances, kept apart because savings, shares and loans cannot be added together. */
export interface MemberBalances {
  savings_balance: Money
  available_to_withdraw: Money
  shares_held: number
  shares_value: Money
  subscription_balance: Money
  loans_outstanding: Money
}

export interface MemberLedgerResponse {
  data: MemberTransaction[]
  summary: MemberBalances
}

export interface MemberStatementSection {
  source: MemberAccountSource
  account_id: number
  account: string
  account_type: string | null
  status: string
  opening: Money
  /** Left off share accounts, which are read in units. */
  credits: Money | null
  debits: Money | null
  closing: Money
  shares_opening: number | null
  shares_closing: number | null
  entries: MemberTransaction[]
}

export interface MemberStatementData {
  member: { name: string; member_number: string; phone: string | null; address: string | null }
  period: { from: ISODate; to: ISODate }
  summary: Pick<MemberBalances, 'savings_balance' | 'shares_held' | 'shares_value' | 'loans_outstanding'>
  sections: MemberStatementSection[]
}

export interface MemberImportResult {
  imported: number
  failed: number
  failures: { row: number; errors: Record<string, string[]> }[]
}

export type MemberExitType = 'withdrawal' | 'death' | 'expulsion'
export type MemberExitStatus = 'settling' | 'awaiting_approval' | 'completed' | 'cancelled'

/** What stands between a member and leaving. It reports only; staff settle on the usual screens. */
export interface MemberSettlement {
  savings: { id: number; account_number: string; status: string; frozen: boolean; balance: Money }[]
  savings_total: Money
  loans: { id: number; loan_number: string; outstanding: Money }[]
  loans_total: Money
  guarantees: { id: number; loan_number: string | null; amount: Money }[]
  shares: { id: number; account_number: string; shares_held: number; value: Money }[]
  net_savings_after_loans: Money
  nominees: { name: string; relationship: string; percentage: Money; witnessed: boolean }[]
  blockers: string[]
}

export interface MemberExit {
  id: number
  member_id: number
  member_name?: string
  type: MemberExitType
  status: MemberExitStatus
  reason: string
  notice_given_on: ISODate
  notice_days: number
  earliest_exit_on: ISODate
  started_by: string
  submitted_by: string | null
  submitted_by_id: number | null
  decided_by: string | null
  decided_at: ISODateTime | null
  rejection_reason: string | null
  created_at: ISODateTime | null
  settlement: MemberSettlement
}
