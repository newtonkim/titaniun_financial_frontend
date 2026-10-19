import { ref, type Ref } from 'vue'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { IncomeStatementResponse } from '../api'
import {
  formatStatementMoney,
  safeSpreadsheetText,
} from '../utils/incomeStatementFormat'

/** [GL code, description, current period, comparison period] */
export type ExportRow = [string, string, string, string]

export function incomeExportRows(r: IncomeStatementResponse): ExportRow[] {
  return r.rows.flatMap((row) => [
    ['', row.label, row.amount, row.compare_amount] as ExportRow,
    ...row.accounts.map((a): ExportRow => [a.code, `  ${a.name}`, a.amount, a.compare_amount]),
  ])
}
export function incomeExportMetadata(r: IncomeStatementResponse): string[] {
  return [
    r.entity,
    'Income Statement — Surplus / (Deficit)',
    `${r.from} to ${r.to}; comparison ${r.compare_from} to ${r.compare_to}`,
    r.currency,
    r.basis,
    `Generated ${r.generated_at}`,
    `Mapping ${r.mapping_version}`,
    `Classification: ${r.diagnostics.classification_complete ? 'Complete' : 'Incomplete; intermediate subtotals cover classified accounts only'}`,
    ...r.diagnostics.issues.map((i) => `${i.code} ${i.name}: ${i.message}`),
    `Ledger reconciliation difference: ${r.diagnostics.difference}; comparison ${r.diagnostics.compare_difference}`,
  ]
}
export function useIncomeStatementExport(result: Ref<IncomeStatementResponse | null>) {
  const error = ref('')
  const exporting = ref(false)
  async function run(kind: 'csv' | 'excel' | 'pdf') {
    if (!result.value) return
    // Capture the displayed response before any asynchronous work.
    const r = result.value
    const header = [
      'GL code',
      'Description',
      `${r.from} to ${r.to}`,
      `${r.compare_from} to ${r.compare_to}`,
    ]
    const rows = incomeExportRows(r)
    const metadata = incomeExportMetadata(r)
    const filename = `income-statement-${r.from}-${r.to}`
    error.value = ''
    exporting.value = true
    try {
      if (kind === 'csv') {
        const all = [
          ...metadata.map((text) => [safeSpreadsheetText(text)]),
          [],
          header,
          ...rows.map(([code, label, current, previous]) => [
            safeSpreadsheetText(code),
            safeSpreadsheetText(label),
            current,
            previous,
          ]),
        ]
        const csv =
          '\uFEFF' +
          all
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\r\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
        try {
          const link = document.createElement('a')
          link.href = url
          link.download = `${filename}.csv`
          link.click()
        } finally {
          URL.revokeObjectURL(url)
        }
      } else if (kind === 'excel') {
        // Decimal strings preserve exact values even above Excel's 15-digit precision.
        const sheet = XLSX.utils.aoa_to_sheet([
          ...metadata.map((text) => [safeSpreadsheetText(text)]),
          [],
          header,
          ...rows.map(([code, label, current, previous]) => [
            safeSpreadsheetText(code),
            safeSpreadsheetText(label),
            current,
            previous,
          ]),
        ])
        sheet['!cols'] = [{ wch: 15 }, { wch: 55 }, { wch: 28 }, { wch: 28 }]
        const book = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(book, sheet, 'Income Statement')
        XLSX.writeFile(book, `${filename}.xlsx`)
      } else {
        const pdf = new jsPDF()
        autoTable(pdf, {
          head: [['Income Statement — Surplus / (Deficit)']],
          body: metadata.map((text) => [text]),
          theme: 'plain',
          styles: { fontSize: 8 },
        })
        const startY =
          ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20) + 5
        autoTable(pdf, {
          startY,
          head: [header],
          body: rows.map(([code, label, current, previous]) => [
            code,
            label,
            formatStatementMoney(current),
            formatStatementMoney(previous),
          ]),
          styles: { fontSize: 8 },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
        })
        pdf.save(`${filename}.pdf`)
      }
    } catch {
      error.value = 'Export failed. Please try again.'
    } finally {
      exporting.value = false
    }
  }
  return { exportReport: run, exporting, exportError: error }
}
