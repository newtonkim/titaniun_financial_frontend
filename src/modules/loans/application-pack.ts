import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import clauses from './application-guarantee.json'
import type { LoanAgreementSnapshot } from './types'

/** Build the signed paper pack from the committee-approved, versioned snapshot. */
export function downloadApplicationPack(snapshot: LoanAgreementSnapshot) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const navy: [number, number, number] = [16, 38, 64]
  const red: [number, number, number] = [182, 32, 42]
  const money = (value: unknown) => Number(value ?? 0).toLocaleString('en-UG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const text = (value: unknown) => String(value ?? '')
  const applicant = snapshot.applicant
  let y = 42
  const header = (title: string) => {
    doc.setFillColor(...navy); doc.rect(0, 0, 210, 27, 'F')
    doc.setFont('helvetica', 'bold'); doc.setTextColor(255); doc.setFontSize(14)
    doc.text('TITANIUM FINANCIAL', 18, 13)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text('Consultancy Co. Ltd  |  Journey to Financial Freedom', 18, 20)
    doc.setTextColor(...navy); doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.text(title, 18, 39)
    y = 48
  }
  const page = (title: string) => { doc.addPage(); header(title) }
  const table = (rows: string[][], columns = ['Particulars', 'Information']) => {
    autoTable(doc, { startY: y, head: [columns], body: rows, margin: { left: 18, right: 18, bottom: 20 }, theme: 'grid', headStyles: { fillColor: navy, fontSize: 9 }, styles: { font: 'helvetica', fontSize: 9, cellPadding: 3.3, textColor: [34, 44, 56], lineColor: [222, 226, 232], lineWidth: .2 } })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }
  const paragraph = (value: string) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(42, 48, 58)
    const lines = doc.splitTextToSize(value.replace(/[\u200b\u2018\u2019]/g, "'"), 174) as string[]
    for (const line of lines) { if (y > 268) page('Guarantee and indemnity agreement · continued'); doc.text(line, 18, y); y += 4.8 }
    y += 5
  }
  header('Client registration & credit application')
  table([['Loan reference', snapshot.loan_number], ['Agreement revision', `${snapshot.revision} / ${snapshot.template_version}`], ['Applicant type', text(applicant.applicant_type)], ['Full / registered name', text(applicant.display_name)], ['NIN / registration number', text(applicant.applicant_type === 'business' ? applicant.business_registration_number : applicant.national_id)], ['Date of birth', text(applicant.date_of_birth)], ['Occupation / business activity', text(applicant.applicant_type === 'business' ? applicant.business_activity : applicant.occupation)], ['Employer', text(applicant.employer)], ['Address', text(applicant.address)], ['Town / division / district', text(applicant.district)], ['Telephone', text(applicant.phone)], ['Email', text(applicant.email)], ['Authorized signatory', text(applicant.signatory_name)], ['Designation', text(applicant.signatory_title)]])
  page('Approved facility & financial obligations')
  const processing = snapshot.processing_fee_type === 'percentage' ? Number(snapshot.principal) * Number(snapshot.processing_fee_value) / 100 : snapshot.processing_fee_type === 'flat' ? Number(snapshot.processing_fee_value) : 0
  table([['Approved principal', `UGX ${money(snapshot.principal)}`], ['Duration / repayment cycle', `${snapshot.term} months / ${snapshot.repayment_frequency}`], ['Contractual interest rate', `${Number(snapshot.monthly_interest_rate).toFixed(2)}% per month / ${snapshot.annual_interest_rate}% per year`], ['Interest calculation', snapshot.interest_method.replace(/_/g, ' ')], ['Processing fee', `UGX ${money(processing)}`], ...snapshot.charges.map(charge => [charge.name, `UGX ${money(charge.amount)} / ${charge.frequency}; ${charge.collection === 'upfront' ? 'deduct at disbursement' : 'collect with repayments'}`])])
  paragraph('The figures above are the approved product terms. Interest and each administrative or third-party charge are disclosed separately. The repayment schedule forms part of the facility documentation. No commission is added to the borrower’s repayment obligation.')
  if (snapshot.collaterals.length) table(snapshot.collaterals.map(asset => [asset.asset_type, `${asset.description}; UGX ${money(asset.estimated_value)}`]), ['Proposed collateral', 'Description and estimated value'])
  page('Applicant declaration & acknowledgement')
  paragraph('I/WE hereby declare that the details furnished herein are true, accurate, and correct to the best of my/our knowledge, information, and belief. I/We undertake to notify Titanium Financial Consultancy Company Ltd immediately of any material changes in the stated particulars.')
  paragraph('I/We acknowledge the approved facility amount, interest calculation, separately disclosed charges, security arrangements and repayment obligations presented in this document pack.')
  table([['Applicant / authorized signatory', text(applicant.declaration_name ?? applicant.signatory_name ?? applicant.display_name)], ['Designation (business applicants)', text(applicant.signatory_title)], ['Signature / common seal', '___________________________________'], ['Date', '___________________________________'], ['Witness name, address and occupation', '___________________________________'], ['Witness signature and date', '___________________________________']])
  paragraph('FOR OFFICIAL USE ONLY')
  table([['Verified and processed by', '___________________________________'], ['Designation', '___________________________________'], ['Signature and date', '___________________________________'], ['Credit committee decision', `Approved · ${snapshot.approved_at.slice(0, 10)}`]])
  page('Guarantee and indemnity agreement')
  paragraph('THE REPUBLIC OF UGANDA\nIN FAVOUR OF TITANIUM FINANCIAL CONSULTANCY CO. LIMITED\nP.O. Box 199046, Kampala, Uganda')
  table([['Borrower', text(applicant.display_name)], ['Borrower NIN / registration number', text(applicant.national_id || applicant.business_registration_number)], ['Facility principal', `UGX ${money(snapshot.principal)}`], ...snapshot.guarantors.map((g, i) => [`Guarantor ${i + 1}`, `${g.name}; NIN ${g.national_id}; Tel ${g.phone}; Address ${g.address}; Guarantee UGX ${money(g.guaranteed_amount)}`])])
  paragraph('The guarantors acknowledge the facility described in this pack. Their individual identities and guarantee amounts are recorded above. The following guarantee clauses are reproduced from the Titanium application form supplied for this process.')
  const legalText = clauses.clauses.replace(/UGX\s*\.{3,}\s*\/=\s*/g, `UGX ${money(snapshot.principal)}/= `)
  for (const section of legalText.split(/\n(?=\s*\d+\.\s+[A-Z])/)) paragraph(section.trim())
  for (const [index, guarantor] of snapshot.guarantors.entries()) {
    page(`Execution · guarantor ${index + 1}`)
    table([['Guarantor', guarantor.name], ['NIN', guarantor.national_id], ['Address', guarantor.address], ['Occupation', '___________________________________'], ['Signature and date', '___________________________________'], ['Witness name', '___________________________________'], ['Witness address and occupation', '___________________________________'], ['Witness signature and date', '___________________________________']])
  }
  page('Lender acceptance & document record')
  table([['Authorized lender signatory', '___________________________________'], ['Title / designation', '___________________________________'], ['Signature and date', '___________________________________'], ['Loan reference', snapshot.loan_number], ['Template / revision', `${snapshot.template_version} / ${snapshot.revision}`]])
  paragraph(`Approved terms fingerprint: ${snapshot.terms_hash}`)
  paragraph('Retain verified signed copies of the application, facility agreement and each guarantee with the loan record. Staff approval of this application is recorded separately from the applicant’s signature.')
  for (let index = 1; index <= doc.getNumberOfPages(); index++) { doc.setPage(index); doc.setDrawColor(...red); doc.line(18, 280, 192, 280); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(90); doc.text(`${snapshot.loan_number} | Revision ${snapshot.revision}`, 18, 286); doc.text(`Page ${index} of ${doc.getNumberOfPages()}`, 192, 286, { align: 'right' }) }
  doc.save(`${snapshot.loan_number}-application-pack-r${snapshot.revision}.pdf`)
}
