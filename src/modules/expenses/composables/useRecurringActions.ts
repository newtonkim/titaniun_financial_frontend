import { ref } from 'vue'
import { recurringExpensesApi } from '../api'
import type { RecurringExpense } from '../types'

/** Pay or skip a due date, for the dialogs on both the expenses page and the recurring page. */
export function useRecurringActions(done: () => void | Promise<void>) {
  const paying = ref<RecurringExpense | null>(null)
  const skipping = ref<RecurringExpense | null>(null)
  const busy = ref(false)
  const error = ref<string | null>(null)

  async function run(action: () => Promise<unknown>) {
    busy.value = true
    error.value = null
    try {
      await action()
      paying.value = null
      skipping.value = null
      await done()
    } catch (exception) {
      error.value = exception instanceof Error ? exception.message : 'That could not be saved.'
    } finally {
      busy.value = false
    }
  }

  const pay = (amount: string, date: string, accountId: number) => {
    const item = paying.value
    if (item) void run(() => recurringExpensesApi.pay(item.id, amount, date, accountId))
  }

  const skip = (reason: string) => {
    const item = skipping.value
    if (item) void run(() => recurringExpensesApi.skip(item.id, reason))
  }

  function close() {
    paying.value = null
    skipping.value = null
    error.value = null
  }

  return { paying, skipping, busy, error, pay, skip, close }
}
