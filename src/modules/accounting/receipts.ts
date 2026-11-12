import { http } from '@/core/api/http'
import { createResourceApi } from '@/core/api/resource'
import type { ISODate, ISODateTime, Money, Wrapped } from '@/core/api/types'
import { escapeHtml as escape, letterheadHtml, openPrintWindow, type Letterhead } from '@/core/printing/letterhead'
import { amountInWords } from '@/core/utils/amountInWords'
import { formatDate, formatEnum, formatMoney } from '@/core/utils/format'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
]

export interface Receipt {
  id: number
  number: number
  received_on: ISODate
  received_from: string
  member_id: number | null
  member_number?: string | null
  amount: Money
  purpose: string
  payment_method: string | null
  payment_reference: string | null
  balance_after: Money | null
  balance_label: string | null
  is_manual: boolean
  issued_by?: string | null
  voided_at: ISODateTime | null
  void_reason: string | null
  letterhead?: Letterhead
}

export interface ManualReceiptPayload {
  received_from: string
  amount: string
  purpose: string
  received_on: ISODate
  payment_method: PaymentMethod
  payment_reference?: string | null
  balance_after?: string | null
}

export const receiptsApi = {
  ...createResourceApi<Receipt, ManualReceiptPayload, ManualReceiptPayload, { search?: string; from?: ISODate; to?: ISODate }>('/receipts'),
  void: (id: number, reason: string) => http.post<Wrapped<Receipt>>(`/receipts/${id}/void`, { reason }).then((response) => response.data),
}

export const letterheadApi = {
  show: () => http.get<Wrapped<Letterhead>>('/receipts/letterhead').then((response) => response.data),
}

export const receiptNumber = (number: number): string => String(number).padStart(6, '0')

export const paymentMethodLabel = (value: string | null): string => PAYMENT_METHODS.find((method) => method.value === value)?.label ?? (value ? formatEnum(value) : '—')

/** Print a receipt laid out like the institution's paper receipt book. Fetches it first so the letterhead is current. */
export async function printReceipt(id: number): Promise<void> {
  const receipt = await receiptsApi.show(id)
  const letterhead = receipt.letterhead
  if (!letterhead) return
  const line = (label: string, value: string) => `<div class="line"><span class="label">${escape(label)}</span><span class="value">${value}</span></div>`
  const body = `<div class="receipt">${letterheadHtml(letterhead)}
    <div class="title"><span class="no">No. <b>${escape(receiptNumber(receipt.number))}</b></span><span class="badge">RECEIPT</span><span>Date: <b>${escape(formatDate(receipt.received_on))}</b></span></div>
    ${receipt.voided_at ? `<div class="void">VOID: ${escape(receipt.void_reason)}</div>` : ''}
    ${line('Received with thanks from', escape(receipt.received_from) + (receipt.member_number ? ` <small>(${escape(receipt.member_number)})</small>` : ''))}
    ${line('The sum of', escape(amountInWords(receipt.amount)))}
    ${line('Being payment for', escape(receipt.purpose))}
    ${line('Paid by', escape(paymentMethodLabel(receipt.payment_method)) + (receipt.payment_reference ? ` &nbsp;·&nbsp; Ref: ${escape(receipt.payment_reference)}` : ''))}
    <div class="foot"><div class="amount">Shs. <b>${escape(formatMoney(receipt.amount))}</b></div>
      ${receipt.balance_after !== null ? `<div>${escape(receipt.balance_label ?? 'Balance')}: <b>${escape(receipt.balance_label === 'Shares held' ? receipt.balance_after.replace(/\.00$/, '') : formatMoney(receipt.balance_after))}</b></div>` : ''}
      <div class="sign">Received by: ${escape(receipt.issued_by ?? '')}<br><span>Signature ............................</span></div></div>
    <p class="thanks">With thanks</p></div>`
  openPrintWindow(`Receipt ${receiptNumber(receipt.number)}`, `
    @page { size: A5 landscape; margin: 10mm; }
    .receipt { max-width: 760px; margin: 0 auto; }
    .title { display: flex; justify-content: space-between; align-items: center; margin: 16px 0 14px; font-size: 13px; }
    .no b { color: #b83236; font-size: 16px; } .badge { border: 2px solid #1f2a5c; padding: 3px 14px; font-weight: 800; letter-spacing: .12em; color: #1f2a5c; }
    .line { display: flex; gap: 10px; align-items: baseline; margin: 10px 0; } .label { white-space: nowrap; color: #475569; }
    .value { flex: 1; border-bottom: 1px dotted #94a3b8; padding: 0 4px 2px; font-weight: 600; font-size: 13px; }
    .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-top: 18px; }
    .amount { border: 2px solid #1c2433; padding: 6px 14px; font-size: 15px; } .sign { text-align: right; color: #475569; } .sign span { display: block; margin-top: 18px; }
    .thanks { text-align: center; font-style: italic; color: #475569; margin-top: 18px; } .void { color: #b83236; font-weight: 800; text-align: center; border: 2px solid #b83236; padding: 4px; margin-bottom: 8px; }
  `, body)
}
