import { formatDate, formatMoney } from '@/core/utils/format'
import type { ShareCertificate } from './types'

const escape = (value: string | number | null | undefined) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`)

/** Open a printable share certificate in a new window and start printing. */
export function printShareCertificate(certificate: ShareCertificate): void {
  const page = window.open('', '_blank', 'width=900,height=650')
  if (!page) return

  page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Share certificate ${escape(certificate.certificate_number)}</title>
<style>
  @page { size: A4 landscape; margin: 16mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c2620; margin: 0; }
  .frame { border: 6px double #1d6b57; padding: 36px 48px; min-height: 150mm; display: flex; flex-direction: column; gap: 18px; }
  .top { display: flex; justify-content: space-between; font-family: system-ui, sans-serif; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #55645f; }
  h1 { margin: 12px 0 0; font-size: 34px; text-align: center; letter-spacing: .04em; }
  .lede { text-align: center; font-size: 17px; line-height: 1.7; max-width: 60ch; margin: 0 auto; }
  .lede strong { font-size: 20px; }
  .figures { display: flex; justify-content: center; gap: 48px; font-family: system-ui, sans-serif; }
  .figures div { text-align: center; } .figures span { display: block; font-size: 12px; color: #55645f; text-transform: uppercase; letter-spacing: .06em; }
  .figures b { font-size: 20px; font-variant-numeric: tabular-nums; }
  .note { text-align: center; font-size: 13px; color: #55645f; }
  .signatures { margin-top: auto; display: flex; justify-content: space-between; gap: 48px; font-family: system-ui, sans-serif; font-size: 13px; }
  .signatures div { flex: 1; border-top: 1px solid #1c2620; padding-top: 6px; text-align: center; }
</style></head><body><div class="frame">
  <div class="top"><span>Titanium Financial SACCO</span><span>Certificate ${escape(certificate.certificate_number)}</span></div>
  <h1>Share Certificate</h1>
  <p class="lede">This certifies that <strong>${escape(certificate.member_name)}</strong> (member ${escape(certificate.member_number)})
    is the registered holder of <strong>${escape(certificate.number_of_shares)}</strong> fully paid ${escape(certificate.product_name)}
    of ${escape(formatMoney(certificate.nominal_price))} each, recorded on share account ${escape(certificate.account_number)}.</p>
  <div class="figures">
    <div><span>Shares</span><b>${escape(certificate.number_of_shares)}</b></div>
    <div><span>Value</span><b>${escape(formatMoney(certificate.value))}</b></div>
    <div><span>Issued</span><b>${escape(formatDate(certificate.issued_on))}</b></div>
  </div>
  <p class="note">Shares are transferable to another member with committee approval and cannot be withdrawn
    (Tier 4 Microfinance Institutions and Money Lenders Act, 2016, s.48). This certificate replaces any earlier certificate for this account.</p>
  <div class="signatures"><div>Chairperson</div><div>Secretary</div><div>Treasurer</div></div>
</div></body></html>`)
  page.document.close()
  page.focus()
  page.print()
}
