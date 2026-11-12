/** The business details printed at the top of receipts and invoices, set in Settings. */
export interface Letterhead {
  name: string
  tagline: string | null
  address: string | null
  phone: string | null
  email: string | null
  payment_instructions: string | null
  invoice_notes: string | null
  authorised_signatory: string | null
}

export const escapeHtml = (value: string | number | null | undefined): string => String(value ?? '').replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`)

/** Open a document on its own page so the app's styles do not interfere with printing. */
export function openPrintWindow(title: string, styles: string, body: string): void {
  const page = window.open('', '_blank', 'width=900,height=760')
  if (!page) return
  page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1c2433; margin: 0; font-size: 12px; }
    .head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #1f2a5c; padding-bottom: 12px; }
    .head h1 { margin: 0; font-size: 19px; color: #1f2a5c; } .tagline { color: #b83236; font-size: 11px; font-style: italic; }
    .contact { text-align: right; color: #475569; font-size: 11px; line-height: 1.5; }
    ${styles}
  </style></head><body>${body}</body></html>`)
  page.document.close()
  page.focus()
  page.print()
}

export function letterheadHtml(letterhead: Letterhead): string {
  const contact = [letterhead.address, letterhead.phone ? `Tel: ${letterhead.phone}` : null, letterhead.email ? `Email: ${letterhead.email}` : null].filter(Boolean)
  return `<div class="head"><div><h1>${escapeHtml(letterhead.name)}</h1>${letterhead.tagline ? `<div class="tagline">“${escapeHtml(letterhead.tagline)}”</div>` : ''}</div>
    <div class="contact">${contact.map((line) => escapeHtml(line)).join('<br>')}</div></div>`
}
