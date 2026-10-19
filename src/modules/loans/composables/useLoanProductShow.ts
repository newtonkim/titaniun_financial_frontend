import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loanProductsApi } from '../api'
import type { LoanProduct } from '../types'

export function useLoanProductShow() {
  const route = useRoute()
  const router = useRouter()

  const product = ref<LoanProduct | null>(null)
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      product.value = await loanProductsApi.show(Number(route.params.id))
    } catch {
      void router.push({ name: 'loans.products' })
    } finally {
      loading.value = false
    }
  }

  function orDash(value: unknown): string {
    return value !== null && value !== undefined && value !== '' ? String(value) : '—'
  }

  return { product, loading, fetch, orDash }
}
