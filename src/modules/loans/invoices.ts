import { http } from '@/core/api/http'
import type { ISODate, ISODateTime, Money, Paginated, Wrapped } from '@/core/api/types'
import { escapeHtml as escape, letterheadHtml, openPrintWindow, type Letterhead } from '@/core/printing/letterhead'
import { formatDate, formatMoney } from '@/core/utils/format'
import type { Loan, LoanRepayment } from './types'

export interface LoanInvoice {
  id: number
  number: number
  kind: 'disbursement' | 'instalment'
  issued_on: ISODate
  due_on: ISODate
  principal_due: Money
  interest_due: Money
  fees_due: Money
  arrears: Money
  total_due: Money
  status: 'open' | 'overdue' | 'paid'
  issued_by?: string | null
  loan: {
    id: number
    loan_number: string
    principal: Money
    interest_rate: Money
    interest_period: string | null
    term: number
    product: string | null
    disbursed_at: ISODate | null
    maturity_date: ISODate | null
    borrower: string | null
    member_number: string | null
    phone: string | null
  }
  schedule?: { period: number; due_date: ISODate; principal: Money; interest: Money; fees: Money; total: Money; remaining: Money }[]
  letterhead?: Letterhead
  created_at: ISODateTime | null
}

export const INVOICE_STATUS: Record<LoanInvoice['status'], { label: string; badge: string }> = {
  open: { label: 'Open', badge: 'pending' },
  overdue: { label: 'Overdue', badge: 'rejected' },
  paid: { label: 'Paid', badge: 'active' },
}

export const loanInvoicesApi = {
  list: (params: { page?: number; per_page?: number; search?: string; loan_id?: number } = {}) => http.get<Paginated<LoanInvoice>>('/loan-invoices', params),
  show: (id: number) => http.get<Wrapped<LoanInvoice>>(`/loan-invoices/${id}`).then((response) => response.data),
  issue: (loanId: number) => http.post<Wrapped<LoanInvoice>>(`/loans/${loanId}/invoices`).then((response) => response.data),
}

export const invoiceNumber = (number: number): string => `INV${String(number).padStart(4, '0')}`

/** The rate as the product quotes it. Loans store an annual rate, so a monthly product shows a twelfth of it. */
const rateLabel = (rate: string | number, period: string | null | undefined): string =>
  period === 'per_month' ? `${(Number(rate) / 12).toFixed(2)}% per month` : `${Number(rate).toFixed(2)}% per year`

const SCHEDULE_STYLES = `
  table { width: 100%; border-collapse: collapse; margin-top: 8px; } th { background: #1f2a5c; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 6px 8px; border: 1px solid #e2e8f0; } .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  h2 { font-size: 13px; color: #1f2a5c; margin: 18px 0 4px; } .muted { color: #64748b; } .paid { color: #1d7a46; font-weight: 600; }
`

/** Print a loan repayment invoice laid out like the institution's paper invoice, with the full schedule. */
export async function printLoanInvoice(id: number): Promise<void> {
  const invoice = await loanInvoicesApi.show(id)
  const letterhead = invoice.letterhead
  if (!letterhead) return
  const loan = invoice.loan
  const row = (label: string, value: string) => `<tr><td>${escape(label)}</td><td class="num">${value}</td></tr>`
  const schedule = (invoice.schedule ?? []).map((item) => `<tr><td>${item.period}</td><td>${escape(formatDate(item.due_date))}</td><td class="num">${escape(formatMoney(item.principal))}</td><td class="num">${escape(formatMoney(item.interest))}</td><td class="num">${escape(formatMoney(item.fees))}</td><td class="num">${escape(formatMoney(item.total))}</td><td class="num">${Number(item.remaining) ? escape(formatMoney(item.remaining)) : '<span class="paid">Paid</span>'}</td></tr>`).join('')
  const body = `${letterheadHtml(letterhead)}
    <h2>LOAN REPAYMENT INVOICE</h2>
    <table class="meta"><tr><td>Invoice No.: <b>${escape(invoiceNumber(invoice.number))}</b></td><td>Date: <b>${escape(formatDate(invoice.issued_on))}</b></td></tr>
      <tr><td>Loan Account No.: <b>${escape(loan.loan_number)}</b></td><td>Contact: ${escape(loan.phone)}</td></tr>
      <tr><td colspan="2">Borrower's name: <b>${escape(loan.borrower)}</b> ${loan.member_number ? `(${escape(loan.member_number)})` : ''}</td></tr></table>
    <h2>Loan details</h2>
    <table>${row('Principal loan amount (UGX)', escape(formatMoney(loan.principal)))}${row('Interest rate', escape(rateLabel(loan.interest_rate, loan.interest_period)))}
      ${row('Principal due (UGX)', escape(formatMoney(invoice.principal_due)))}${row('Interest due (UGX)', escape(formatMoney(invoice.interest_due)))}
      ${Number(invoice.fees_due) ? row('Fees and charges due (UGX)', escape(formatMoney(invoice.fees_due))) : ''}${Number(invoice.arrears) ? row('Of which arrears from earlier instalments (UGX)', escape(formatMoney(invoice.arrears))) : ''}
      ${row('Total amount due (UGX)', `<b>${escape(formatMoney(invoice.total_due))}</b>`)}${row('Due date', `<b>${escape(formatDate(invoice.due_on))}</b>`)}
      ${row('Payment mode', 'Cash / Bank Transfer / Mobile Money')}</table>
    ${letterhead.payment_instructions ? `<h2>Payment instructions</h2><p style="white-space: pre-line">${escape(letterhead.payment_instructions)}</p>` : ''}
    <h2>Repayment schedule</h2><table><thead><tr><th>No.</th><th>Due date</th><th class="num">Principal</th><th class="num">Interest</th><th class="num">Fees</th><th class="num">Instalment</th><th class="num">Still owed</th></tr></thead><tbody>${schedule}</tbody></table>
    <h2>Notes</h2><p style="white-space: pre-line" class="muted">${escape(letterhead.invoice_notes ?? 'Please quote your invoice number when making payment.')}</p>
    <p style="margin-top: 26px">Authorised by: <b>${escape(letterhead.authorised_signatory ?? invoice.issued_by ?? '')}</b> &nbsp; Signature ............................</p>`
  openPrintWindow(`Invoice ${invoiceNumber(invoice.number)}`, `@page { size: A4; margin: 14mm; } ${SCHEDULE_STYLES} .meta td { border: 1px solid #94a3b8; }`, body)
}

/** Print a loan statement: the loan's terms, its schedule with what is paid, and every repayment. */
export function printLoanStatement(loan: Loan, repayments: LoanRepayment[], letterhead: Letterhead): void {
  const installments = loan.installments ?? []
  const owed = (item: (typeof installments)[number]) => Number(item.principal) + Number(item.interest) + Number(item.fees ?? 0) - Number(item.principal_paid) - Number(item.interest_paid) - Number(item.fees_paid ?? 0)
  const outstanding = installments.reduce((sum, item) => sum + owed(item), 0)
  const today = new Date().toISOString().slice(0, 10)
  const arrears = installments.filter((item) => item.due_date.slice(0, 10) < today).reduce((sum, item) => sum + owed(item), 0)
  const schedule = installments.map((item) => `<tr><td>${item.period}</td><td>${escape(formatDate(item.due_date))}</td><td class="num">${escape(formatMoney(Number(item.principal) + Number(item.interest) + Number(item.fees ?? 0)))}</td><td class="num">${escape(formatMoney(Number(item.principal_paid) + Number(item.interest_paid) + Number(item.fees_paid ?? 0)))}</td><td class="num">${owed(item) > 0 ? escape(formatMoney(owed(item))) : '<span class="paid">Paid</span>'}</td></tr>`).join('')
  const payments = repayments.map((item) => `<tr><td>${escape(formatDate(item.paid_at))}</td><td>${escape(item.receipt ? `No. ${String(item.receipt.number).padStart(6, '0')}` : (item.reference ?? ''))}</td><td class="num">${escape(formatMoney(item.amount))}</td><td class="num">${escape(formatMoney(item.principal_paid))}</td><td class="num">${escape(formatMoney(item.interest_paid))}</td></tr>`).join('')
  const body = `${letterheadHtml(letterhead)}
    <h2>LOAN STATEMENT</h2>
    <table><tr><td>Borrower: <b>${escape(loan.borrower?.name ?? '')}</b></td><td>Loan No.: <b>${escape(loan.loan_number)}</b></td></tr>
      <tr><td>Principal: <b>UGX ${escape(formatMoney(loan.principal))}</b></td><td>Interest: ${escape(rateLabel(loan.interest_rate, loan.product?.interest_period))}</td></tr>
      <tr><td>Disbursed: ${escape(formatDate(loan.disbursed_at))}</td><td>Statement date: ${escape(formatDate(today))}</td></tr>
      <tr><td>Balance owed: <b>UGX ${escape(formatMoney(outstanding))}</b></td><td>In arrears: <b>UGX ${escape(formatMoney(arrears))}</b></td></tr></table>
    <h2>Repayment schedule</h2><table><thead><tr><th>No.</th><th>Due date</th><th class="num">Instalment</th><th class="num">Paid</th><th class="num">Still owed</th></tr></thead><tbody>${schedule}</tbody></table>
    <h2>Payments received</h2>${payments ? `<table><thead><tr><th>Date</th><th>Receipt</th><th class="num">Amount</th><th class="num">Principal</th><th class="num">Interest</th></tr></thead><tbody>${payments}</tbody></table>` : '<p class="muted">No payments yet.</p>'}`
  openPrintWindow(`Loan statement ${loan.loan_number}`, `@page { size: A4; margin: 14mm; } ${SCHEDULE_STYLES}`, body)
}
