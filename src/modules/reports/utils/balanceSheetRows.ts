import type { BalanceSheetLine, BalanceSheetResponse } from '../api'

export type StatementRowKind = 'section' | 'line' | 'subtotal' | 'section-total' | 'grand-total'

export interface StatementRow {
  key: string
  kind: StatementRowKind
  label: string
  glCode: string | null
  depth: number
  /** null = intentionally blank (section headings, expanded group headers) */
  amount: number | null
  compareAmount: number | null
  hasChildren: boolean
  expanded: boolean
  line: BalanceSheetLine | null
}

export function lineKey(line: BalanceSheetLine): string {
  return line.id !== null ? String(line.id) : `computed:${line.name}`
}

function totalRow(key: string, kind: StatementRowKind, label: string, amount: number, compareAmount: number, depth = 0): StatementRow {
  return { key, kind, label, glCode: null, depth, amount, compareAmount, hasChildren: false, expanded: false, line: null }
}

/** Top-level group lines start expanded, so subsections show their groups. */
export function defaultExpandedKeys(result: BalanceSheetResponse): Set<string> {
  const keys = new Set<string>()
  for (const section of result.sections) {
    for (const line of section.lines) {
      if (line.children.length) keys.add(lineKey(line))
    }
  }
  return keys
}

export function allExpandableKeys(result: BalanceSheetResponse): Set<string> {
  const keys = new Set<string>()
  const walk = (line: BalanceSheetLine) => {
    if (!line.children.length) return
    keys.add(lineKey(line))
    line.children.forEach(walk)
  }
  result.sections.forEach(s => s.lines.forEach(walk))
  return keys
}

export function buildStatementRows(result: BalanceSheetResponse, expanded: Set<string>): StatementRow[] {
  const rows: StatementRow[] = []

  const walk = (line: BalanceSheetLine, depth: number) => {
    const key = lineKey(line)
    const hasChildren = line.children.length > 0
    const isOpen = hasChildren && expanded.has(key)

    rows.push({
      key, kind: 'line', label: line.name, glCode: line.code, depth,
      amount: isOpen ? null : line.amount,
      compareAmount: isOpen ? null : line.compare_amount,
      hasChildren, expanded: isOpen, line,
    })

    if (isOpen) {
      line.children.forEach(child => walk(child, depth + 1))
      rows.push(totalRow(`${key}:subtotal`, 'subtotal', `Total ${line.name}`, line.amount, line.compare_amount, depth))
    }
  }

  for (const section of result.sections) {
    rows.push({
      key: `section:${section.key}`, kind: 'section', label: section.label, glCode: null, depth: 0,
      amount: null, compareAmount: null, hasChildren: false, expanded: false, line: null,
    })
    section.lines.forEach(line => walk(line, 1))
    rows.push(totalRow(
      `section:${section.key}:total`,
      section.key === 'assets' ? 'grand-total' : 'section-total',
      `Total ${section.label}`,
      section.total,
      section.compare_total,
    ))
  }

  const { current, compare } = result.totals
  rows.push(totalRow('grand:liabilities-equity', 'grand-total', 'Total Liabilities & Equity',
    current.total_liabilities_and_equity, compare.total_liabilities_and_equity))

  return rows
}
