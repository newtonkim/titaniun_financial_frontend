import type { ISODateTime, Money } from '@/core/api/types'

/** A piece of work waiting on the signed-in user. It stays listed until the work is done. */
export interface StaffNotification {
  id: string
  type: string
  /** The record to open; empty for a daily reminder about a whole list. */
  record_id: number | null
  subject: string | null
  amount: Money | null
  /** How many records a daily reminder covers. */
  count: number | null
  occurred_at: ISODateTime
  is_unread: boolean
}

export interface NotificationFeed {
  data: StaffNotification[]
  unread_count: number
}
