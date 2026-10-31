import { reactive, watch } from 'vue'

export type TableDensity = 'compact' | 'comfortable'

export interface TablePreferences {
  density: TableDensity
  hidden: string[]
  perPage: number
}

const DEFAULTS: TablePreferences = { density: 'comfortable', hidden: [], perPage: 15 }

/** One table's density, hidden columns and page size, remembered in this browser. */
export function useTablePreferences(name: string): TablePreferences {
  const key = `titaniun.table.v2.${name}`
  const preferences = reactive<TablePreferences>({ ...DEFAULTS, ...read(key) })

  watch(preferences, (value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be unavailable (private windows); the choice still holds for this visit.
    }
  })

  return preferences
}

function read(key: string): Partial<TablePreferences> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}')
  } catch {
    return {}
  }
}
