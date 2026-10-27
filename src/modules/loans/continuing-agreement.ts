import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { LoanAgreementSnapshot, LoanProductPreview } from './types'

export const continuingTemplateVersion = 'titanium-continuing-2026-01'
export const continuingTemplateSha256 = '1454440f5fd724578d2b632eea5ff998b2436a85df06ee07c9794cd645cd08fe'

const smallNumbers = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function integerWords(value: number): string {
  if (value < 20) return smallNumbers[value]!
  if (value < 100) return tens[Math.floor(value / 10)]! + (value % 10 ? `-${smallNumbers[value % 10]}` : '')
  if (value < 1000)
    return `${smallNumbers[Math.floor(value / 100)]} hundred${value % 100 ? ` and ${integerWords(value % 100)}` : ''}`
  for (const [amount, label] of [
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
  ] as const) {
    if (value >= amount)
      return `${integerWords(Math.floor(value / amount))} ${label}${value % amount ? ` ${integerWords(value % amount)}` : ''}`
  }
  return ''
}

export function amountInWords(value: string | number): string {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999999.99)
    throw new Error('Enter a valid loan amount.')
  const cents = Math.round(amount * 100)
  const words =
    integerWords(Math.floor(cents / 100)) +
    (cents % 100 ? ` and ${String(cents % 100).padStart(2, '0')}/100 only` : ' only')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const money = (value: string | number) =>
  Number(value).toLocaleString('en-UG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const date = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

/** The original letter-size page is reproduced at 288 dpi; only its empty fields receive text. */
export function createContinuingAgreement(
  snapshot: LoanAgreementSnapshot,
  background: Uint8Array,
  archived = false,
): jsPDF {
  if (
    snapshot.template_version !== continuingTemplateVersion ||
    snapshot.template_sha256 !== continuingTemplateSha256
  )
    throw new Error('This agreement template version is unavailable. Use its retained signed document.')
  const preview = snapshot.repayment_preview
  const firstDate = snapshot.first_repayment_date
  const finalDate = preview?.schedule_preview.at(-1)?.due_date
  if (
    !snapshot.agreement_date ||
    !firstDate ||
    !finalDate ||
    !preview?.schedule_preview.length ||
    !snapshot.guarantors.length ||
    !snapshot.applicant.display_name
  )
    throw new Error('The approved continuing-client agreement is incomplete.')
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  doc.addImage(background, 'PNG', 0, 0, 612, 792)
  doc.setFont('times', 'normal')
  doc.setTextColor(15)
  const put = (value: string, x: number, top: number, width: number) => {
    doc.setFontSize(10)
    const size = Math.min(10, ((width - 4) / Math.max(doc.getTextWidth(value), 1)) * 10)
    if (size < 6)
      throw new Error(
        'A name or amount is too long for the original form. Shorten the entered name before issuing the agreement.',
      )
    doc.setFontSize(size)
    doc.text(value, x + 2, top + 8.5)
  }
  const installment = preview.schedule_preview[0]!.installment
  put(date(snapshot.agreement_date), 89.42, 220.4, 203.5)
  put(snapshot.applicant.display_name, 72, 235, 220)
  put(amountInWords(snapshot.principal), 72, 249.6, 385)
  put(money(snapshot.principal), 75.66, 264.2, 121)
  put(date(finalDate), 395.61, 264.2, 93.5)
  put(String(snapshot.term), 254.71, 286.8, 49.5)
  put(`${Number(snapshot.annual_interest_rate)}% p.a.`, 452.98, 286.8, 60.5)
  put(amountInWords(installment), 72, 316, 313.5)
  put(money(installment), 75.66, 330.6, 126.5)
  put(`${date(firstDate)} and monthly thereafter`, 219.29, 353.2, 165)
  put(snapshot.applicant.display_name, 158.74, 472.8, 203.5)
  put(snapshot.guarantors[0]!.name, 163.65, 518, 198)
  if (archived) {
    doc.setFontSize(12)
    doc.setTextColor(182, 32, 42)
    doc.text('ARCHIVED / SUPERSEDED', 306, 36, { align: 'center' })
  }
  doc.setProperties({
    title: `${snapshot.loan_number} - Short Loan Agreement`,
    subject: `Revision ${snapshot.revision}; terms ${snapshot.terms_hash}`,
    creator: 'Titanium Financial',
  })
  return doc
}

export async function downloadContinuingAgreement(
  snapshot: LoanAgreementSnapshot,
  archived = false,
): Promise<void> {
  const response = await fetch(`${import.meta.env.BASE_URL}continuing-client-loan-v1.png`)
  if (!response.ok) throw new Error('The original agreement template could not be loaded. Please try again.')
  const doc = createContinuingAgreement(snapshot, new Uint8Array(await response.arrayBuffer()), archived)
  doc.save(`${snapshot.loan_number}-short-agreement-r${snapshot.revision}${archived ? '-archived' : ''}.pdf`)
}

export function createRepaymentSchedule(
  preview: LoanProductPreview,
  borrower: string,
  reference: string,
  draft = false,
): jsPDF {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(`${draft ? 'PROPOSED ' : ''}REPAYMENT SCHEDULE`, 14, 20)
  doc.setFontSize(10)
  const heading = doc.splitTextToSize(`${reference} | ${borrower}`, 180)
  doc.text(heading, 14, 29)
  const startY = 35 + heading.length * 4
  doc.text(`Total repayment: UGX ${money(preview.total_repayment)}`, 14, startY)
  autoTable(doc, {
    startY: startY + 6,
    head: [['Period', 'Due date', 'Principal', 'Interest', 'Charges', 'Installment', 'Balance']],
    body: preview.schedule_preview.map((row) => [
      row.period,
      row.due_date ? date(row.due_date) : '-',
      money(row.principal),
      money(row.interest),
      money(row.fees ?? 0),
      money(row.installment),
      money(row.balance),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 38, 64] },
    margin: { bottom: 25 },
    didDrawPage: () => {
      doc.setFontSize(8)
      doc.text('The final installment clears rounding differences. Late penalties are separate.', 14, 283)
      if (draft)
        doc.text('Proposed terms; repayment tracking starts after approval and disbursement.', 14, 288)
    },
  })
  return doc
}
