import { REPORT_ENTITY } from '../api'
import { computed, ref, type Ref } from 'vue'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BalanceSheetResponse } from '../api'
import type { StatementRow } from '../utils/balanceSheetRows'
import { formatAccounting, formatLongDate, formatShortDate } from '../utils/accountingFormat'

import type { ReportSelection } from './useBalanceSheet'

const round2 = (v: number) => Math.round(v * 100) / 100
const indent = (depth: number) => '  '.repeat(Math.max(depth - 1, 0))

export function useBalanceSheetExport(result: Ref<BalanceSheetResponse | null>, rows: Ref<StatementRow[]>, selection?: Ref<ReportSelection | null>) {
  const exporting = ref(false)
  const comparison = computed(() => selection ? selection.value?.mode === 'compare' : true)
  const columns = <T>(cells: T[], singleCount: number): T[] => comparison.value ? cells : cells.slice(0, singleCount)
  function periodLabel(which: 'first' | 'second', fallback: string): string {
    const s = selection?.value
    return s?.mode === 'compare'
      ? `Period ${which === 'first' ? 1 : 2}: ${s[`${which}From`]} to ${s[`${which}To`]} (closing ${fallback})`
      : formatShortDate(fallback)
  }

  function header(r: BalanceSheetResponse): string[] {
    return columns(['GL Code', 'Account', periodLabel('first', r.as_at), periodLabel('second', r.compare_to), 'Difference (1 - 2)'], 3)
  }

  /** Numeric cells stay numbers (or null) so spreadsheets can sum them. */
  function dataRows(): (string | number | null)[][] {
    return rows.value.map(row => columns([
      row.glCode ?? '',
      row.kind === 'section' ? row.label.toUpperCase() : indent(row.depth) + row.label,
      row.amount === null ? null : round2(row.amount),
      row.compareAmount === null ? null : round2(row.compareAmount),
      row.amount === null || row.compareAmount === null ? null : round2(row.amount - row.compareAmount),
    ], 3))
  }

  function download(blob: Blob, filename: string) {
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  function run(fn: (r: BalanceSheetResponse) => void) {
    if (!result.value) return
    exporting.value = true
    try { fn(result.value) } finally { exporting.value = false }
  }

  function exportCsv() {
    run(r => {
      const all = [header(r), ...dataRows()]
      const csv = all
        .map(cells => cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
      download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `balance-sheet-${r.as_at}.csv`)
    })
  }

  function exportExcel() {
    run(r => {
      const title = [[REPORT_ENTITY], ['Statement of Financial Position'], [`As at ${formatLongDate(r.as_at)}`], []]
      const ws = XLSX.utils.aoa_to_sheet([...title, header(r), ...dataRows()])
      const firstDataRow = title.length + 1
      for (let i = firstDataRow; i < firstDataRow + rows.value.length; i++) {
        for (const c of [2, 3, 4]) {
          const cell = ws[XLSX.utils.encode_cell({ r: i, c })]
          if (cell && typeof cell.v === 'number') cell.z = '#,##0.00;(#,##0.00);"-"'
        }
      }
      ws['!cols'] = [{ wch: 10 }, { wch: 48 }, { wch: 18 }, { wch: 18 }, { wch: 16 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet')
      XLSX.writeFile(wb, `balance-sheet-${r.as_at}.xlsx`)
    })
  }

  function exportPdf() {
    run(r => {
      const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()

      doc.setFont('helvetica', 'bold').setFontSize(14)
      doc.text(REPORT_ENTITY, pageW / 2, 16, { align: 'center' })
      doc.setFontSize(11).text('Statement of Financial Position', pageW / 2, 23, { align: 'center' })
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90)
      doc.text(`As at ${formatLongDate(r.as_at)}`, pageW / 2, 29, { align: 'center' })
      doc.setFontSize(7).text(`Generated ${new Date(r.generated_at).toLocaleString()}`, pageW - 14, 35, { align: 'right' })
      doc.setTextColor(0)

      const kinds = rows.value.map(row => row.kind)
      autoTable(doc, {
        startY: 38,
        head: [header(r).slice(1)],
        body: rows.value.map(row => columns([
          row.kind === 'section' ? row.label.toUpperCase() : indent(row.depth) + row.label,
          formatAccounting(row.amount),
          formatAccounting(row.compareAmount),
          row.amount === null || row.compareAmount === null ? '' : formatAccounting(row.amount - row.compareAmount),
        ], 2)),
        theme: 'plain',
        headStyles: { fontStyle: 'bold', fontSize: 8, textColor: 60, lineWidth: { bottom: 0.3 }, lineColor: 60 },
        bodyStyles: { fontSize: 8, cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 } },
        columnStyles: { 0: { cellWidth: 92 }, 1: { halign: 'right' }, 2: { halign: 'right', textColor: 90 }, 3: { halign: 'right', textColor: 110 } },
        didParseCell: data => {
          if (data.section === 'head' && data.column.index > 0) data.cell.styles.halign = 'right'
          if (data.section !== 'body') return
          const kind = kinds[data.row.index]
          if (kind === 'section') {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.textColor = [30, 100, 60]
          }
          if (kind === 'subtotal' || kind === 'section-total' || kind === 'grand-total') {
            data.cell.styles.fontStyle = 'bold'
          }
          if (kind === 'grand-total') {
            data.cell.styles.fillColor = [240, 245, 242]
            if (data.column.index > 0) {
              data.cell.styles.lineWidth = { top: 0.3, bottom: 0.6 }
              data.cell.styles.lineColor = 20
            }
          }
        },
      })

      let y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 38) + 22
      if (y > pageH - 20) { doc.addPage(); y = 40 }
      const colW = (pageW - 28) / 3
      doc.setFontSize(8).setTextColor(60)
      ;['Prepared by', 'Checked by', 'Approved by'].forEach((label, i) => {
        const x = 14 + i * colW
        doc.line(x, y, x + colW - 10, y)
        doc.text(label, x, y + 4)
        doc.text('Date: ____________', x, y + 9)
      })

      doc.save(`balance-sheet-${r.as_at}.pdf`)
    })
  }

  return { exporting, exportCsv, exportExcel, exportPdf }
}
