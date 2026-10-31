import { ref, type Ref } from 'vue'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CashFlowResponse } from '../api'
import { safeSpreadsheetText } from '../utils/incomeStatementFormat'
import type { ExportRow } from './useIncomeStatementExport'
import { cashMoney } from '../utils/cashFlowFormat'
import { FINANCING_LIABILITY_ROWS, includesMigration, reconciliationLines, sectionLines } from '../utils/cashFlowStatement'

/** The statement and its notes as rows: [GL code, description, current, comparison]. */
export function cashFlowExportRows(r: CashFlowResponse): ExportRow[] {
  const statement = r.sections.flatMap((section): ExportRow[] => [
    ['', section.label.toUpperCase(), '', ''],
    ...sectionLines(section).flatMap((line): ExportRow[] => {
      if (line.kind === 'heading') return [['', line.label, '', '']]
      if (line.kind !== 'row') return [['', line.label, line.amount, line.compare_amount]]
      return [
        ['', `  ${line.row.label}`, line.row.amount, line.row.compare_amount],
        ...line.row.accounts.map((a): ExportRow => [a.code ?? '', `      ${a.name ?? ''}`, a.amount, a.compare_amount]),
      ]
    }),
  ])

  const liabilities = r.financing_liabilities

  return [
    ...statement,
    ...reconciliationLines(r).map((line): ExportRow => ['', line.label, line.amount, line.compare_amount]),
    ['', '', '', ''],
    ['', 'NOTE 1: CASH AND CASH EQUIVALENTS (end of period, then start of period)', '', ''],
    ...r.cash_accounts.map((a): ExportRow => [a.code ?? '', `  ${a.name ?? ''}`, a.closing, a.opening]),
    ['', 'NOTE 2: NON-CASH TRANSACTIONS', '', ''],
    ...r.non_cash.map((item): ExportRow => ['', `  ${item.label}`, item.amount, item.compare_amount]),
    ['', 'NOTE 3: LIABILITIES FROM FINANCING ACTIVITIES', '', ''],
    ...FINANCING_LIABILITY_ROWS.map((row): ExportRow => ['', `  ${row.label}`, liabilities.current[row.key], liabilities.compare[row.key]]),
  ]
}

export function cashFlowExportMetadata(r: CashFlowResponse): string[] {
  return [
    r.entity,
    'Statement of Cash Flows (direct method)',
    `${r.from} to ${r.to}; comparison ${r.compare_from} to ${r.compare_to}`,
    r.currency,
    r.basis,
    `Generated ${r.generated_at}`,
    ...(includesMigration(r)
      ? ['DRAFT: this period includes balances migrated at go-live, so it does not show a full period of cash flows.']
      : []),
    ...r.checks.filter((check) => !check.passed).map((check) => `Check failed: ${check.label}`),
    `Reconciliation difference: ${r.diagnostics.difference}; comparison ${r.diagnostics.compare_difference}`,
    ...r.diagnostics.issues.map((i) => `${i.code ?? ''} ${i.name}: ${i.message}`),
  ]
}

export function useCashFlowExport(result: Ref<CashFlowResponse | null>) {
  const error = ref('')
  const exporting = ref(false)

  async function run(kind: 'csv' | 'excel' | 'pdf') {
    if (!result.value) return
    const r = result.value
    const header = [
      'GL code',
      'Description',
      `${r.from} to ${r.to}`,
      `${r.compare_from} to ${r.compare_to}`,
    ]
    const rows = cashFlowExportRows(r)
    const metadata = cashFlowExportMetadata(r)
    const filename = `cash-flow-${r.from}-${r.to}`
    const sheetRows = [
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
    error.value = ''
    exporting.value = true
    try {
      if (kind === 'csv') {
        const csv =
          '﻿' +
          sheetRows
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
        const sheet = XLSX.utils.aoa_to_sheet(sheetRows)
        sheet['!cols'] = [{ wch: 15 }, { wch: 60 }, { wch: 28 }, { wch: 28 }]
        const book = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(book, sheet, 'Cash Flow')
        XLSX.writeFile(book, `${filename}.xlsx`)
      } else {
        const pdf = new jsPDF()
        autoTable(pdf, {
          head: [['Statement of Cash Flows']],
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
            current === '' ? '' : cashMoney(current),
            previous === '' ? '' : cashMoney(previous),
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
