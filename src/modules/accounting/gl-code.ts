import type { AccountType, ChartOfAccount } from './types'

const TYPE_PREFIX: Record<AccountType, string> = { asset: '1', liability: '2', equity: '3', income: '4', expense: '5' }

/** Number of trailing zeros: 11000 → 3, 11100 → 2, 11101 → 0. */
function trailingZeros(code: number): number {
  let count = 0
  while (code > 0 && code % 10 === 0) {
    count++
    code = Math.floor(code / 10)
  }
  return count
}

/** Accounts whose codes fall inside the parent's block, e.g. 11100 → 11101…11199. */
export function accountsInBlock(parent: ChartOfAccount, accounts: ChartOfAccount[]): ChartOfAccount[] {
  const start = Number(parent.code)
  const zeros = trailingZeros(start)
  if (Number.isNaN(start) || zeros < 1) return []
  const end = start + 10 ** zeros
  return accounts.filter((account) => Number(account.code) > start && Number(account.code) < end)
}

/**
 * The next free code in the five-digit hierarchy: under 10000 children step by 1000, under 11000 by 100,
 * under 11100 by 1. When those slots are all taken the code stays inside the parent's range (11000 →
 * the next free code below 12000), so a new account never lands under another parent's block. Without
 * a parent, the next code for the type.
 */
export function nextGlCode(type: AccountType, parent: ChartOfAccount | null, accounts: ChartOfAccount[]): string {
  if (parent) {
    const start = Number(parent.code)
    const zeros = trailingZeros(start)
    if (!Number.isNaN(start) && zeros >= 2) {
      const step = zeros === 2 ? 1 : 10 ** (zeros - 1)
      const end = start + 10 ** zeros
      const children = accounts.map((account) => Number(account.code)).filter((code) => code > start && code < end)
      const candidate = children.length ? Math.max(...children) + step : start + step
      if (candidate < end) return String(candidate).padStart(5, '0')
      const taken = new Set(children)
      for (let code = Math.max(...children) + 1; code < end; code++) {
        if (!taken.has(code)) return String(code).padStart(5, '0')
      }
      for (let code = start + 1; code < end; code++) {
        if (!taken.has(code)) return String(code).padStart(5, '0')
      }
    }
  }

  const prefix = TYPE_PREFIX[type]
  const codes = accounts.map((account) => Number(account.code)).filter((code) => !Number.isNaN(code) && String(code).startsWith(prefix))
  return codes.length ? String(Math.max(...codes) + 1) : `${prefix}0000`
}

/** The subtype most of the parent's existing sub-accounts use, else the parent's own. */
export function siblingSubtype(parent: ChartOfAccount | null, accounts: ChartOfAccount[]): string {
  if (!parent) return ''
  const counts = new Map<string, number>()
  for (const account of accountsInBlock(parent, accounts)) {
    if (account.subtype) counts.set(account.subtype, (counts.get(account.subtype) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [subtype, count] of counts) {
    if (count > bestCount) {
      best = subtype
      bestCount = count
    }
  }
  return best || parent.subtype || ''
}
