import { jsPDF } from 'jspdf'
import { formatMoney } from '@/core/utils/format'
import type { SavingsReceipt } from './types'

type Rgb = [number, number, number]

const NAVY: Rgb = [31, 42, 92]
const BRAND: Rgb = [184, 50, 54]
const SLATE: Rgb = [100, 116, 139]
const INK: Rgb = [31, 41, 55]
const BORDER: Rgb = [226, 232, 240]

function issued(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${day} · ${time}`
}

/**
 * Draw an A4 receipt for a savings deposit or withdrawal and open it in a new tab, falling back to a
 * download when the browser blocks the tab.
 */
export function openSavingsReceipt(receipt: SavingsReceipt): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 10
  const right = width - margin
  const currency = receipt.currency_code
  const sacco = receipt.branding.sacco_name
  const loanCredit = receipt.transaction_type === 'loan_disbursement'
  const kind = receipt.is_reversal ? 'reversal' : loanCredit ? 'loan credit' : receipt.transaction_type
  const deposit = receipt.transaction_type === 'deposit' || loanCredit
  const amount = formatMoney(receipt.amount)

  const text = (color: Rgb) => doc.setTextColor(...color)
  const fill = (color: Rgb) => doc.setFillColor(...color)
  const rule = (y: number) => {
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.25)
    doc.line(margin, y, right, y)
  }

  // Page surface and header band
  doc.setFillColor(244, 247, 250)
  doc.rect(0, 0, width, height, 'F')
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(4, 4, width - 8, height - 8, 2.5, 2.5, 'F')
  fill(NAVY)
  doc.roundedRect(4, 4, width - 8, 34, 2.5, 2.5, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(4, 35, width - 8, 3, 'F')
  fill(BRAND)
  doc.rect(4, 38, 92, 1.4, 'F')

  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.4)
  doc.circle(margin + 9, 21, 8.4, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(sacco.charAt(0).toUpperCase(), margin + 9, 24.5, { align: 'center' })
  doc.setFontSize(21)
  doc.text(sacco.toUpperCase(), margin + 26, 19)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.text(receipt.branding.tagline, margin + 26, 26)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('SAVINGS & CREDIT COOPERATIVE', margin + 26, 32)
  doc.roundedRect(right - 58, 12, 52, 9.5, 1.8, 1.8, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`${kind.toUpperCase()} RECEIPT`, right - 32, 18.2, { align: 'center' })

  // Receipt number and issue time
  text(SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.4)
  doc.text('R E C E I P T  N O.', margin, 50)
  doc.text('I S S U E D', right, 50, { align: 'right' })
  text(NAVY)
  doc.setFontSize(11)
  doc.text(receipt.receipt_number, margin, 57.5)
  doc.text(issued(receipt.transacted_at), right, 57.5, { align: 'right' })
  rule(64)

  // Account holder
  doc.setFillColor(248, 250, 252)
  doc.rect(4, 64, width - 8, 26, 'F')
  text(SLATE)
  doc.setFontSize(7.4)
  doc.text('A C C O U N T  H O L D E R', margin, 74)
  doc.text('A C C O U N T  N O.', right, 74, { align: 'right' })
  text(INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(receipt.member.name, margin, 83.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  text(NAVY)
  doc.text(receipt.account.account_number, right, 83.5, { align: 'right' })
  rule(90)

  // Transaction details
  text(SLATE)
  doc.setFontSize(7.6)
  doc.text('T R A N S A C T I O N   D E T A I L S', margin, 103)
  const rows: [string, string][] = [
    ['Account type', receipt.account.product],
    ['Member number', receipt.member.member_number],
    ['Payment mode', receipt.payment_mode ?? '—'],
    [loanCredit ? 'Credited to' : deposit ? 'Deposited by' : 'Collected by', receipt.transacted_by ?? receipt.member.name],
    ['Reference', receipt.reference ?? '—'],
    ['Narration', receipt.narration ?? '—'],
    ['Balance after transaction', `${currency} ${formatMoney(receipt.balance_after)}`],
  ]
  let y = 114
  for (const [label, value] of rows) {
    text(SLATE)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(label, margin, y)
    text(INK)
    doc.setFont('helvetica', 'bold')
    doc.text(doc.splitTextToSize(value, 110), right, y, { align: 'right' })
    rule(y + 4)
    y += 10
  }

  // Total band
  y = Math.max(y + 6, 192)
  fill(NAVY)
  doc.roundedRect(margin, y, width - margin * 2, 24, 2.5, 2.5, 'F')
  fill(BRAND)
  doc.rect(margin, y, 2.8, 24, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(receipt.is_reversal ? 'REVERSED' : loanCredit ? 'CREDITED' : deposit ? 'DEPOSITED' : 'PAID OUT', margin + 12, y + 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(deposit ? 'Amount credited to account' : 'Amount paid to the member', margin + 12, y + 17)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(currency, right - 62, y + 15, { align: 'right' })
  doc.setFontSize(22)
  doc.text(amount, right - 4, y + 16, { align: 'right' })

  // Note
  const noteY = y + 36
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(...BORDER)
  doc.roundedRect(margin, noteY, width - margin * 2, 16, 2, 2, 'FD')
  text(SLATE)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.6)
  doc.text('This is a computer-generated receipt and forms a valid record of the transaction above.', width / 2, noteY + 6.5, { align: 'center' })
  doc.text(receipt.is_reversed ? 'This transaction has since been reversed.' : 'Please retain it for your records.', width / 2, noteY + 11.5, { align: 'center' })

  // Served by and signature
  const signY = height - 48
  text(SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('S E R V E D  B Y', margin, signY)
  text(INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text(receipt.received_by ?? 'SYSTEM', margin, signY + 7)
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(right - 82, signY + 5.5, right, signY + 5.5)
  text(SLATE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Signature & stamp', right - 41, signY + 11, { align: 'center' })

  // Footer
  const footerY = height - 11
  doc.setDrawColor(...BORDER)
  doc.setLineDashPattern([1.5, 1.2], 0)
  doc.line(margin, footerY - 8, right, footerY - 8)
  doc.setLineDashPattern([], 0)
  text(NAVY)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.6)
  doc.text(`Thank you for saving with ${sacco}.`, width / 2, footerY - 2.5, { align: 'center' })

  const url = doc.output('bloburl')
  const opened = window.open(String(url), '_blank', 'noopener,noreferrer')
  if (!opened) doc.save(`${receipt.receipt_number.toLowerCase()}.pdf`)
  setTimeout(() => URL.revokeObjectURL(String(url)), 60_000)
}
