import { formatDate, formatMoney } from '@/core/utils/format'
import type { Expense } from './types'

const escape = (value: string | number | null | undefined): string => String(value ?? '').replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`)

/** Open the voucher on its own A4 page, with space for signatures. */
export function printExpenseVoucher(expense: Expense): void {
  const page = window.open('', '_blank', 'width=820,height=720')
  if (!page) return
  const rows = (expense.lines ?? []).map((line) => `<tr><td>${escape(line.category)}</td><td>${escape(line.description)}</td><td class="num">${escape(formatMoney(line.amount))}</td></tr>`).join('')
  const withheld = Number(expense.wht_amount) ? `<tr><td colspan="2">Tax withheld</td><td class="num">${escape(formatMoney(expense.wht_amount))}</td></tr><tr><td colspan="2"><b>Paid to payee</b></td><td class="num"><b>${escape(formatMoney(expense.net_paid))}</b></td></tr>` : ''
  page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(expense.number ?? `Draft ${expense.id}`)}</title><style>
    @page { size: A4; margin: 16mm; } body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1c2433; margin: 0; font-size: 12px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1f2a5c; padding-bottom: 12px; }
    h1 { margin: 0; font-size: 20px; color: #1f2a5c; } .tag { color: #b83236; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .doc { text-align: right; } .doc b { display: block; font-size: 15px; color: #1f2a5c; }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin: 18px 0; } dt { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; } dd { margin: 2px 0 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; } th { background: #1f2a5c; color: #fff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; }
    td { padding: 7px 8px; border-bottom: 1px solid #eef1f6; } .num { text-align: right; font-variant-numeric: tabular-nums; } tfoot td { font-weight: 700; }
    .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 56px; } .sign div { border-top: 1px solid #1c2433; padding-top: 6px; font-size: 11px; }
  </style></head><body>
    <header><div><h1>Titaniun Financial</h1><div class="tag">Expense voucher</div></div><div class="doc"><b>${escape(expense.number ?? `Draft #${expense.id}`)}</b>${escape(expense.status.replace('_', ' '))}</div></header>
    <dl><div><dt>Paid to</dt><dd>${escape(expense.payee)}</dd></div><div><dt>Date</dt><dd>${escape(formatDate(expense.expense_date))}</dd></div>
      <div><dt>Purpose</dt><dd>${escape(expense.description)}</dd></div><div><dt>Paid</dt><dd>${expense.paid_on ? 'Yes' : 'Not yet'}</dd></div>
      <div><dt>Paid from</dt><dd>${escape(expense.paid_from)}</dd></div><div><dt>Reference</dt><dd>${escape(expense.reference)}</dd></div></dl>
    <table><thead><tr><th>Category</th><th>Detail</th><th class="num">UGX</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td class="num">${escape(formatMoney(expense.amount))}</td></tr>${withheld}</tfoot></table>
    <div class="sign"><div>Prepared by: ${escape(expense.recorder_name)}</div><div>Approved by: ${escape(expense.approver_name)}</div><div>Received by (name, ID, signature)</div></div>
  </body></html>`)
  page.document.close()
  page.focus()
  page.print()
}
