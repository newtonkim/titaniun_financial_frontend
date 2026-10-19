import { errorMessage, REPORT_ENTITY } from '../api'
import { ref, computed, onMounted } from 'vue'
import { formatMoneyValue } from '../utils/money'
import { trialBalanceApi } from '../api'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function currentMonthRange(): { from: string; to: string } {
  const now   = new Date()
  const y     = now.getFullYear()
  const m     = String(now.getMonth() + 1).padStart(2, '0')
  const last  = new Date(y, now.getMonth() + 1, 0).getDate()
  return {
    from: `${y}-${m}-01`,
    to:   `${y}-${m}-${String(last).padStart(2, '0')}`,
  }
}

export function useTrialBalance() {
  const today                        = new Date().toISOString().split('T')[0]
  const { from: monthFrom, to: monthTo } = currentMonthRange()

  const mode        = ref<'as_of_date' | 'period'>('period')
  const asOfDate    = ref(today)
  const periodFrom  = ref(monthFrom)
  const periodTo    = ref(monthTo)
  const loading     = ref(false)
  const result      = ref<any>(null)
  const hideZero    = ref(true)
  const exporting   = ref(false)
  const error       = ref<string | null>(null)

  // Drill-down drawer
  const drawerOpen     = ref(false)
  const drawerAccount  = ref<any>(null)

  // ── Computed ────────────────────────────────────────────────────────────────
  const allAccounts = computed(() => result.value?.accounts ?? [])
  const totals      = computed(() => result.value?.totals   ?? null)
  const isBalanced  = computed(() => totals.value?.is_balanced === true)
  const drFrom      = computed(() => result.value?.from ?? result.value?.date ?? asOfDate.value)
  const drTo        = computed(() => result.value?.to   ?? result.value?.date ?? asOfDate.value)

  const accounts = computed(() => {
    if (!hideZero.value) return allAccounts.value

    const activeIds = new Set(
      allAccounts.value
        .filter((a: any) => a.is_postable && (
          a.closing_debit || a.closing_credit ||
          a.opening_debit || a.opening_credit ||
          a.period_debit  || a.period_credit
        ))
        .map((a: any) => a.id),
    )

    const filtered: any[] = []
    let pendingHeader: any = null

    for (const account of allAccounts.value) {
      if (!account.is_postable) {
        pendingHeader = account
      } else if (activeIds.has(account.id)) {
        if (pendingHeader) { filtered.push(pendingHeader); pendingHeader = null }
        filtered.push(account)
      }
    }
    return filtered
  })

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function generate() {
    loading.value = true
    result.value  = null
    error.value   = null
    try {
      result.value = mode.value === 'period'
        ? await trialBalanceApi.getTrialBalance({ from: periodFrom.value, to: periodTo.value })
        : await trialBalanceApi.getTrialBalance({ date: asOfDate.value })
    } catch (e: unknown) {
      error.value = errorMessage(e, 'Failed to load trial balance.')
    } finally {
      loading.value = false
    }
  }

  function openDrillDown(account: any, side: 'debit' | 'credit') {
    if (!account.is_postable) return
    const amount = side === 'debit'
      ? (mode.value === 'period' ? account.period_debit : account.closing_debit)
      : (mode.value === 'period' ? account.period_credit : account.closing_credit)
    if (!amount) return
    drawerAccount.value = account
    drawerOpen.value = true
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function fmt(v: number)     { return formatMoneyValue(v ?? 0) }
  function fmtCell(v: number) { return v ? formatMoneyValue(v) : '—' }
  function fmtNum(v: number)  {
    return v
      ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—'
  }

  function typeColor(type: string) {
    const map: Record<string, string> = {
      ASSET:     'text-blue-600',
      LIABILITY: 'text-orange-600',
      EQUITY:    'text-purple-600',
      INCOME:    'text-green-600',
      EXPENSE:   'text-red-600',
    }
    return map[type] ?? 'text-neutral-500'
  }

  function dateLabel() {
    return mode.value === 'period'
      ? `${periodFrom.value}-to-${periodTo.value}`
      : asOfDate.value
  }


  // ── Export helpers ──────────────────────────────────────────────────────────
  function buildExportRows(): { isPeriod: boolean; dataRows: (string | number)[][]; totalsRow: (string | number)[] | null } {
    const isPeriod = mode.value === 'period'
    const t        = totals.value

    const dataRows: (string | number)[][] = accounts.value
      .filter((a: any) => a.is_postable)
      .map((a: any) => isPeriod
        ? [a.code, a.name, a.account_type, a.account_subtype ?? '',
           a.opening_debit, a.opening_credit, a.period_debit, a.period_credit,
           a.closing_debit, a.closing_credit]
        : [a.code, a.name, a.account_type, a.account_subtype ?? '',
           a.closing_debit, a.closing_credit],
      )

    const totalsRow: (string | number)[] | null = t
      ? isPeriod
        ? ['', 'TOTAL', '', '', t.total_opening_debit, t.total_opening_credit,
           t.total_period_debit, t.total_period_credit,
           t.total_closing_debit, t.total_closing_credit]
        : ['', 'TOTAL', '', '', t.total_closing_debit, t.total_closing_credit]
      : null

    return { isPeriod, dataRows, totalsRow }
  }

  function exportCsv() {
    if (!result.value) return
    exporting.value = true
    try {
      const { isPeriod, dataRows, totalsRow } = buildExportRows()

      const header = isPeriod
        ? ['GL Code', 'Account Name', 'Type', 'Subtype', 'Opening DR', 'Opening CR',
           'Period DR', 'Period CR', 'Closing DR', 'Closing CR']
        : ['GL Code', 'Account Name', 'Type', 'Subtype', 'Closing DR', 'Closing CR']

      const allRows = [header, ...dataRows, ...(totalsRow ? [totalsRow] : [])]
      const csv = allRows
        .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href  = url
      link.download = `trial-balance-${dateLabel()}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      exporting.value = false
    }
  }

  function exportExcel() {
    if (!result.value) return
    exporting.value = true
    try {
      const { isPeriod, dataRows, totalsRow } = buildExportRows()

      const header = isPeriod
        ? ['GL Code', 'Account Name', 'Type', 'Subtype', 'Opening DR', 'Opening CR',
           'Period DR', 'Period CR', 'Closing DR', 'Closing CR']
        : ['GL Code', 'Account Name', 'Type', 'Subtype', 'Closing DR', 'Closing CR']

      const allRows = [header, ...dataRows, ...(totalsRow ? [totalsRow] : [])]
      const ws = XLSX.utils.aoa_to_sheet(allRows)

      // Bold header row + light grey fill
      const headerStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'F0F0F0' } },
        alignment: { horizontal: 'center' as const },
      }
      for (let c = 0; c < header.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c })
        if (ws[cellRef]) ws[cellRef].s = headerStyle
      }

      // Bold TOTAL row
      if (totalsRow) {
        const totalRowIdx = allRows.length - 1
        const totalStyle = { font: { bold: true, sz: 11 } }
        for (let c = 0; c < header.length; c++) {
          const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c })
          if (ws[cellRef]) ws[cellRef].s = totalStyle
        }
      }

      // Auto-fit column widths
      ws['!cols'] = header.map((h, i) => {
        const maxLen = Math.max(h.length, ...dataRows.map(r => String(r[i] ?? '').length))
        return { wch: Math.min(maxLen + 4, 30) }
      })

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance')
      XLSX.writeFile(wb, `trial-balance-${dateLabel()}.xlsx`)
    } finally {
      exporting.value = false
    }
  }

  function exportPdf() {
    if (!result.value) return
    exporting.value = true
    try {
      const isPeriod  = mode.value === 'period'
      const saccoName = REPORT_ENTITY
      const colSpan   = isPeriod ? 9 : 5

      const doc = new jsPDF({
        orientation: isPeriod ? 'landscape' : 'portrait',
        unit:        'mm',
        format:      'a4',
      })

      const pageW = (doc.internal.pageSize as any).width ?? (isPeriod ? 297 : 210)

      let y = 15
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(saccoName, 14, y)

      y += 7
      doc.setFontSize(11)
      doc.text('Trial Balance', 14, y)

      y += 5
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      const periodLabel = isPeriod
        ? `Period: ${periodFrom.value} to ${periodTo.value}`
        : `As at: ${asOfDate.value}`
      doc.text(periodLabel, 14, y)
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 14, y, { align: 'right' })
      doc.setTextColor(0)
      y += 4

      const head = isPeriod
        ? [['GL Code', 'Account Name', 'Type', 'Opening DR', 'Opening CR',
            'Period DR', 'Period CR', 'Closing DR', 'Closing CR']]
        : [['GL Code', 'Account Name', 'Type', 'Closing DR', 'Closing CR']]

      const body: any[][] = []
      for (const a of accounts.value) {
        if (!a.is_postable) {
          body.push([{
            content:   `${a.code}  ${a.name}`,
            colSpan,
            styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [60, 60, 60] },
          }])
          continue
        }
        if (isPeriod) {
          body.push([
            a.code, a.name, a.account_type,
            fmtNum(a.opening_debit),  fmtNum(a.opening_credit),
            fmtNum(a.period_debit),   fmtNum(a.period_credit),
            fmtNum(a.closing_debit),  fmtNum(a.closing_credit),
          ])
        } else {
          body.push([
            a.code, a.name, a.account_type,
            fmtNum(a.closing_debit), fmtNum(a.closing_credit),
          ])
        }
      }

      const t = totals.value
      if (t) {
        const totalsStyle = { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [245, 247, 250] } }
        body.push(
          isPeriod
            ? [totalsStyle, fmtNum(t.total_opening_debit), fmtNum(t.total_opening_credit),
               fmtNum(t.total_period_debit), fmtNum(t.total_period_credit),
               fmtNum(t.total_closing_debit), fmtNum(t.total_closing_credit)]
            : [totalsStyle, fmtNum(t.total_closing_debit), fmtNum(t.total_closing_credit)],
        )
      }

      autoTable(doc, {
        startY:             y,
        head,
        body,
        headStyles:         { fillColor: [30, 100, 60], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        bodyStyles:         { fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 250, 248] },
        styles:             { cellPadding: 2 },
        columnStyles: isPeriod
          ? { 0: { cellWidth: 18 }, 1: { cellWidth: 55 }, 2: { cellWidth: 18 } }
          : { 0: { cellWidth: 18 }, 1: { cellWidth: 80 }, 2: { cellWidth: 22 } },
      })

      doc.save(`trial-balance-${dateLabel()}.pdf`)
    } finally {
      exporting.value = false
    }
  }


  // ── Auto-load ────────────────────────────────────────────────────────────────
  onMounted(() => generate())

  return {
    mode, asOfDate, periodFrom, periodTo, hideZero, loading, result, exporting, error,
    accounts, totals, isBalanced, drFrom, drTo,
    drawerOpen, drawerAccount,
    generate, openDrillDown,
    exportCsv, exportExcel, exportPdf,
    fmt, fmtCell, fmtNum, typeColor, dateLabel,
  }
}
