import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { inflateSync } from 'node:zlib'
import {
  amountInWords,
  continuingTemplateSha256,
  continuingTemplateVersion,
  createContinuingAgreement,
  createRepaymentSchedule,
} from './continuing-agreement.ts'

const image = readFileSync(new URL('../../../public/continuing-client-loan-v1.png', import.meta.url))
const snapshot = {
  application_type: 'continuing',
  template_version: continuingTemplateVersion,
  template_sha256: continuingTemplateSha256,
  revision: 1,
  loan_number: 'CONTINUING-EXAMPLE',
  terms_hash: 'approved-terms',
  agreement_date: '2026-10-27',
  first_repayment_date: '2026-11-30',
  term: 3,
  principal: '10000.00',
  annual_interest_rate: '12.00',
  applicant: { display_name: 'Jane Applicant' },
  guarantors: [{ name: 'John Guarantor' }],
  repayment_preview: {
    total_repayment: 10300,
    schedule_preview: [
      {
        period: 1,
        due_date: '2026-11-30',
        principal: 3333.33,
        interest: 100,
        installment: 3433.33,
        balance: 6666.67,
      },
      {
        period: 2,
        due_date: '2026-12-30',
        principal: 3333.33,
        interest: 100,
        installment: 3433.33,
        balance: 3333.34,
      },
      {
        period: 3,
        due_date: '2027-01-30',
        principal: 3333.34,
        interest: 100,
        installment: 3433.34,
        balance: 0,
      },
    ],
  },
}

test('the downloadable original is byte-for-byte identical to the supplied PDF', () => {
  const original = readFileSync(new URL('../../../public/continuing-client-loan-v1.pdf', import.meta.url))
  assert.equal(createHash('sha256').update(original).digest('hex'), continuingTemplateSha256)
})

test('amounts in words include decimals and carry rounding into shillings', () => {
  assert.equal(amountInWords('10000.00'), 'Ten thousand only')
  assert.equal(amountInWords('3433.33'), 'Three thousand four hundred and thirty-three and 33/100 only')
  assert.equal(amountInWords(999.999), 'One thousand only')
  assert.equal(amountInWords('1000000'), 'One million only')
  assert.throws(() => amountInWords(-1))
})

test('the completed agreement keeps one letter-size page and fills the approved figures', () => {
  const doc = createContinuingAgreement(snapshot, image)
  assert.equal(doc.getNumberOfPages(), 1)
  assert.equal(doc.internal.pageSize.getWidth(), 612)
  assert.equal(doc.internal.pageSize.getHeight(), 792)
  assert.match(doc.output(), /\/Subtype \/Image/)
  assert.match(doc.output(), /CONTINUING-EXAMPLE - Short Loan Agreement/)
  const pdf = Buffer.from(doc.output('arraybuffer')).toString('latin1')
  const streams = [...pdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((match) => {
      try {
        return inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1')
      } catch {
        return match[1]
      }
    })
    .join('\n')
  assert.match(streams, /Jane Applicant/)
  assert.match(streams, /John Guarantor/)
  assert.match(streams, /10,000.00/)
  assert.match(streams, /12% p.a./)
})

test('a mismatched template or incomplete approved agreement cannot be issued', () => {
  assert.throws(
    () => createContinuingAgreement({ ...snapshot, template_sha256: 'different' }, image),
    /template version/,
  )
  assert.throws(
    () => createContinuingAgreement({ ...snapshot, first_repayment_date: null }, image),
    /incomplete/,
  )
})

test('the separate schedule supports multiple pages for a long loan term', () => {
  const preview = {
    total_repayment: 60000,
    schedule_preview: Array.from({ length: 120 }, (_, index) => ({
      period: index + 1,
      due_date: '2026-11-30',
      principal: 400,
      interest: 100,
      installment: 500,
      balance: 48000 - (index + 1) * 400,
    })),
  }
  const doc = createRepaymentSchedule(preview, 'Jane Applicant', 'LONG-TERM', true)
  assert.ok(doc.getNumberOfPages() > 1)
})
