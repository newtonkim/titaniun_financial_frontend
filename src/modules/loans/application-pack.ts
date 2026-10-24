import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import clauses from './application-guarantee.json'
import type { LoanAgreementSnapshot, LoanProduct, LoanProductPreview, StoreLoanPayload } from './types'
import type { Member } from '@/modules/members/types'

const money = (value: unknown) =>
  Number(value ?? 0).toLocaleString('en-UG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const text = (value: unknown) => String(value ?? '')

function createApplicationDocument(compact = false) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const navy: [number, number, number] = [16, 38, 64]
  const red: [number, number, number] = [182, 32, 42]
  let y = 42
  let sectionTitle = ''
  const header = (title: string) => {
    sectionTitle = title.replace(/ · continued$/, '')
    doc.setFillColor(...navy)
    doc.rect(0, 0, 210, 27, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255)
    doc.setFontSize(14)
    doc.text('TITANIUM FINANCIAL', 18, 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Consultancy Co. Ltd  |  Journey to Financial Freedom', 18, 20)
    doc.setTextColor(...navy)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 18, 39)
    y = 48
  }
  const page = (title: string) => {
    doc.addPage()
    header(title)
  }
  const table = (rows: string[][], columns = ['Particulars', 'Information']) => {
    const title = sectionTitle
    autoTable(doc, {
      startY: y,
      head: [columns],
      body: rows,
      margin: { top: 48, left: 18, right: 18, bottom: 20 },
      theme: 'grid',
      headStyles: { fillColor: navy, textColor: 255, fontSize: 9 },
      willDrawPage: ({ pageNumber }) => {
        if (pageNumber > 1) header(`${title} · continued`)
      },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: compact ? 2.5 : 3.3,
        textColor: [34, 44, 56],
        lineColor: [222, 226, 232],
        lineWidth: 0.2,
      },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }
  const paragraph = (value: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(42, 48, 58)
    const lines = doc.splitTextToSize(value.replace(/[\u200b\u2018\u2019]/g, "'"), 174) as string[]
    for (const line of lines) {
      if (y > 268) {
        page(`${sectionTitle} · continued`)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(42, 48, 58)
      }
      doc.text(line, 18, y)
      y += 4.8
    }
    y += 5
  }
  const save = (filename: string, footer: string) => {
    for (let index = 1; index <= doc.getNumberOfPages(); index++) {
      doc.setPage(index)
      doc.setDrawColor(...red)
      doc.line(18, 280, 192, 280)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(90)
      doc.text(footer, 18, 286)
      doc.text(`Page ${index} of ${doc.getNumberOfPages()}`, 192, 286, { align: 'right' })
    }
    doc.save(filename)
  }
  return { header, page, table, paragraph, save }
}

/** Build the signed paper pack from the committee-approved, versioned snapshot. */
export function downloadApplicationPack(
  snapshot: LoanAgreementSnapshot,
  preview?: LoanProductPreview,
  archived = false,
) {
  const { header, page, table, paragraph, save } = createApplicationDocument()
  const applicant = snapshot.applicant
  header('Client registration & credit application')
  table([
    ['Loan reference', snapshot.loan_number],
    ['Agreement revision', `${snapshot.revision} / ${snapshot.template_version}`],
    ['Applicant type', text(applicant.applicant_type)],
    ['Full / registered name', text(applicant.display_name)],
    [
      'NIN / registration number',
      text(applicant.applicant_type === 'business' ? applicant.business_registration_number : applicant.national_id),
    ],
    ['Date of birth', text(applicant.date_of_birth)],
    [
      'Occupation / business activity',
      text(applicant.applicant_type === 'business' ? applicant.business_activity : applicant.occupation),
    ],
    ['Employer', text(applicant.employer)],
    ['Address', text(applicant.address)],
    ['Town / division / district', text(applicant.district)],
    ['Telephone', text(applicant.phone)],
    ['Email', text(applicant.email)],
    ['Authorized signatory', text(applicant.signatory_name)],
    ['Designation', text(applicant.signatory_title)],
  ])
  page('Approved facility & financial obligations')
  const processing =
    snapshot.processing_fee_type === 'percentage'
      ? (Number(snapshot.principal) * Number(snapshot.processing_fee_value)) / 100
      : snapshot.processing_fee_type === 'flat'
        ? Number(snapshot.processing_fee_value)
        : 0
  table([
    ['Approved principal', `UGX ${money(snapshot.principal)}`],
    ['Duration / repayment cycle', `${snapshot.term} months / ${snapshot.repayment_frequency}`],
    [
      'Contractual interest rate',
      `${Number(snapshot.monthly_interest_rate).toFixed(2)}% per month / ${snapshot.annual_interest_rate}% per year`,
    ],
    ['Interest calculation', snapshot.interest_method.replace(/_/g, ' ')],
    ['Processing fee', `UGX ${money(processing)}`],
    ...snapshot.charges.map((charge) => [
      charge.name,
      `UGX ${money(charge.amount)} / ${charge.frequency}; ${charge.collection === 'upfront' ? 'deduct at disbursement' : 'collect with repayments'}`,
    ]),
  ])
  paragraph(
    'The figures above are the approved product terms. Interest and each administrative or third-party charge are disclosed separately. The repayment schedule forms part of the facility documentation. No commission is added to the borrower’s repayment obligation.',
  )
  if (snapshot.collaterals.length)
    table(
      snapshot.collaterals.map((asset) => [
        asset.asset_type,
        `${asset.description}; UGX ${money(asset.estimated_value)}`,
      ]),
      ['Proposed collateral', 'Description and estimated value'],
    )
  if (preview) {
    page('Repayment schedule')
    paragraph(
      'Repayment periods are shown below. Calendar due dates are confirmed against the actual disbursement date and any approved grace period.',
    )
    table(
      preview.schedule_preview.map((row) => [
        String(row.period),
        money(row.principal),
        money(row.interest),
        money(row.fees ?? 0),
        money(row.installment),
      ]),
      ['Month', 'Principal · UGX', 'Interest · UGX', 'Fees · UGX', 'Installment · UGX'],
    )
    table([
      ['Total repayment', `UGX ${money(preview.total_repayment)}`],
      ['Net disbursement', `UGX ${money(preview.net_disbursement)}`],
    ])
  }
  page('Applicant declaration & acknowledgement')
  paragraph(clauses.declaration)
  paragraph(
    'I/We acknowledge the approved facility amount, interest calculation, separately disclosed charges, security arrangements and repayment obligations presented in this document pack.',
  )
  table([
    [
      'Applicant / authorized signatory',
      text(applicant.declaration_name ?? applicant.signatory_name ?? applicant.display_name),
    ],
    ['Designation (business applicants)', text(applicant.signatory_title)],
    ['Signature / common seal', '___________________________________'],
    ['Date', '___________________________________'],
    ['Witness name, address and occupation', '___________________________________'],
    ['Witness signature and date', '___________________________________'],
  ])
  paragraph('FOR OFFICIAL USE ONLY')
  table([
    ['Verified and processed by', '___________________________________'],
    ['Designation', '___________________________________'],
    ['Signature and date', '___________________________________'],
    ['Credit committee decision', `Approved · ${snapshot.approved_at.slice(0, 10)}`],
  ])
  page('Guarantee and indemnity agreement')
  paragraph(
    'THE REPUBLIC OF UGANDA\nIN FAVOUR OF TITANIUM FINANCIAL CONSULTANCY CO. LIMITED\nP.O. Box 199046, Kampala, Uganda',
  )
  table([
    ['Borrower', text(applicant.display_name)],
    ['Borrower NIN / registration number', text(applicant.national_id || applicant.business_registration_number)],
    ['Facility principal', `UGX ${money(snapshot.principal)}`],
    ...snapshot.guarantors.map((g, i) => [
      `Guarantor ${i + 1}`,
      `${g.name}; NIN ${g.national_id}; Tel ${g.phone}; Address ${g.address}; Guarantee UGX ${money(g.guaranteed_amount)}`,
    ]),
  ])
  paragraph(
    'The guarantors acknowledge the facility described in this pack. Their individual identities and guarantee amounts are recorded above. The following guarantee clauses are reproduced from the Titanium application form supplied for this process.',
  )
  const legalText = clauses.clauses.replace(/UGX\s*\.{3,}\s*\/=\s*/g, `UGX ${money(snapshot.principal)}/= `)
  for (const section of legalText.split(/\n(?=\s*\d+\.\s+[A-Z])/)) paragraph(section.trim())
  for (const [index, guarantor] of snapshot.guarantors.entries()) {
    page(`Execution · guarantor ${index + 1}`)
    table([
      ['Guarantor', guarantor.name],
      ['NIN', guarantor.national_id],
      ['Address', guarantor.address],
      ['Occupation', '___________________________________'],
      ['Signature and date', '___________________________________'],
      ['Witness name', '___________________________________'],
      ['Witness address and occupation', '___________________________________'],
      ['Witness signature and date', '___________________________________'],
    ])
  }
  page('Lender acceptance & document record')
  table([
    ['Authorized lender signatory', '___________________________________'],
    ['Title / designation', '___________________________________'],
    ['Signature and date', '___________________________________'],
    ['Loan reference', snapshot.loan_number],
    ['Template / revision', `${snapshot.template_version} / ${snapshot.revision}`],
  ])
  paragraph(`Approved terms fingerprint: ${snapshot.terms_hash}`)
  paragraph(
    'Retain verified signed copies of the application, facility agreement and each guarantee with the loan record. Staff approval of this application is recorded separately from the applicant’s signature.',
  )
  save(
    `${snapshot.loan_number}-application-pack-r${snapshot.revision}.pdf`,
    `${snapshot.loan_number} | Revision ${snapshot.revision}${archived ? ' | ARCHIVED / SUPERSEDED' : ''}`,
  )
}

interface ApplicationFormInput {
  form: Pick<
    StoreLoanPayload,
    | 'application_data'
    | 'charges'
    | 'interest_method'
    | 'purpose'
    | 'repayment_source'
    | 'collaterals'
    | 'guarantors'
    | 'principal'
  > & { term: number | string }
  product?: Pick<
    LoanProduct,
    'name' | 'interest_rate' | 'interest_period' | 'processing_fee_type' | 'processing_fee_value'
  > | null
  member?: Pick<
    Member,
    'member_number' | 'nationality' | 'gender' | 'marital_status' | 'next_of_kin' | 'next_of_kin_contact'
  > | null
  officerName?: string
  guarantorNames: Record<number, string>
  reference?: string
}

/** Export the current form without requiring a saved or approved loan. */
export function downloadApplicationForm(input: ApplicationFormInput) {
  const { header, page, table, paragraph, save } = createApplicationDocument(true)
  const { form } = input
  const applicant = form.application_data ?? {}
  const blank = '___________________________________'
  const field = (value: unknown) => text(value).trim() || blank
  const amount = (value: unknown) =>
    value !== '' && value != null && Number.isFinite(Number(value)) ? `UGX ${money(value)}` : blank
  const reference = input.reference ?? 'New application'
  const business = applicant.applicant_type === 'business'
  header('Loan application form')
  paragraph(
    'DRAFT APPLICATION. Complete the information below. Requested terms are subject to appraisal, committee approval and finance review before the final agreement is issued.',
  )
  table([
    ['Application reference', reference],
    ['Member number', field(input.member?.member_number)],
    ['Applicant type', business ? 'Business / company' : 'Individual'],
    ['Full / registered name', field(applicant.display_name)],
    ...(business
      ? [
          ['Registration / incorporation number', field(applicant.business_registration_number)],
          ['Nature of business', field(applicant.business_activity)],
          ['Authorized signatory', field(applicant.signatory_name)],
          ['Designation', field(applicant.signatory_title)],
          ['Signatory NIN', field(applicant.signatory_national_id)],
        ]
      : [
          ['National identification number', field(applicant.national_id)],
          ['Date of birth', field(applicant.date_of_birth)],
          [
            'Gender / marital status',
            [input.member?.gender, input.member?.marital_status].filter(Boolean).join(' / ') || blank,
          ],
          ['Occupation / profession', field(applicant.occupation)],
          ['Employer / place of work', field(applicant.employer)],
          [
            'Next of kin / contact',
            [input.member?.next_of_kin, input.member?.next_of_kin_contact].filter(Boolean).join(' / ') || blank,
          ],
        ]),
    ['Nationality', field(input.member?.nationality)],
    ['Physical address', field(applicant.address)],
    ['Town / division / district', field(applicant.district)],
    ['Primary telephone', field(applicant.phone)],
    ['Email address', field(applicant.email)],
  ])
  page('Requested loan & security')
  table([
    ['Loan product', field(input.product?.name)],
    ['Requested principal', amount(form.principal)],
    ['Requested term', form.term ? `${form.term} months` : blank],
    [
      'Product interest rate',
      input.product
        ? `${input.product.interest_rate}% ${input.product.interest_period === 'per_month' ? 'per month' : 'per year'}`
        : blank,
    ],
    ['Interest calculation', form.interest_method === 'reducing_balance' ? 'Reducing balance' : 'Flat'],
    [
      'Product processing fee',
      !input.product
        ? blank
        : input.product.processing_fee_type === 'percentage'
          ? `${input.product.processing_fee_value}% of principal`
          : input.product.processing_fee_type === 'flat'
            ? amount(input.product.processing_fee_value)
            : 'None',
    ],
    ['Purpose of the loan', field(form.purpose)],
    ['Source of repayments', field(form.repayment_source)],
    ['Assigned loan officer', field(input.officerName)],
  ])
  table(
    form.charges?.length
      ? form.charges.map((charge) => [
          charge.name,
          `${amount(charge.amount)} ${charge.frequency === 'monthly' ? 'per month' : 'once'}; ${charge.collection === 'upfront' ? 'deduct at disbursement' : 'collect with repayments'}`,
        ])
      : [
          ['Charge name', blank],
          ['Amount / frequency / collection', blank],
        ],
    ['Proposed additional charges', 'Amount and collection'],
  )
  table(
    form.collaterals?.length
      ? form.collaterals.map((asset) => [asset.asset_type, `${asset.description}; ${amount(asset.estimated_value)}`])
      : [
          ['Collateral type / description', blank],
          ['Estimated value', blank],
        ],
    ['Proposed collateral', 'Description and estimated value'],
  )
  const guarantees = form.guarantors?.length
    ? form.guarantors
    : [
        { member_id: 0, guaranteed_amount: '' },
        { member_id: 0, guaranteed_amount: '' },
      ]
  table(
    guarantees.map((guarantor, index) => [
      `Guarantor ${index + 1}`,
      `${field(input.guarantorNames[guarantor.member_id])}; guarantee ${amount(guarantor.guaranteed_amount)}`,
    ]),
    ['Savings-backed guarantors', 'Name and guaranteed amount'],
  )
  page('Applicant declaration & official use')
  paragraph(clauses.declaration)
  table([
    [
      'Applicant / authorized signatory',
      field(applicant.declaration_name || applicant.signatory_name || applicant.display_name),
    ],
    ['Signature / common seal', blank],
    ['Date', blank],
    ['Witness name', blank],
    ['Witness address and occupation', blank],
    ['Witness signature and date', blank],
  ])
  paragraph('FOR OFFICIAL USE ONLY')
  table([
    ['Receiving officer / designation', blank],
    ['Date received', blank],
    ['Appraisal / recommendation', blank],
    ['Committee decision / date', blank],
    ['Finance pricing review', blank],
  ])
  save('Titanium-loan-application-form.pdf', `${reference} | DRAFT APPLICATION`)
}
