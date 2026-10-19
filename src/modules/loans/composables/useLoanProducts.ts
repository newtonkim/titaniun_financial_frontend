import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/core/api/http'
import { loanProductsApi } from '../api'
import type { LoanProduct } from '../types'

/** The loan product list: search, pages, and delete with confirmation. */
export function useLoanProducts() {
  const router = useRouter()

  const products = ref<LoanProduct[]>([])
  const loading = ref(false)
  const error = ref('')
  const search = ref('')
  const meta = ref({ current_page: 1, last_page: 1, total: 0 })
  const pages = computed(() => Array.from({ length: meta.value.last_page }, (_, i) => i + 1))
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  async function fetch(page = 1) {
    loading.value = true
    error.value = ''
    try {
      const response = await loanProductsApi.list({ search: search.value || undefined, page, per_page: 15 })
      products.value = response.data
      meta.value = response.meta
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Failed to load loan products.'
    } finally {
      loading.value = false
    }
  }

  watch(search, () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => fetch(1), 400)
  })

  onMounted(() => fetch(1))

  function openCreate() {
    void router.push({ name: 'loans.products.create' })
  }

  function openEdit(product: LoanProduct) {
    void router.push({ name: 'loans.products.edit', params: { id: product.id } })
  }

  const showDeleteDialog = ref(false)
  const deleteTarget = ref<LoanProduct | null>(null)
  const deleting = ref(false)

  function openDeleteDialog(product: LoanProduct) {
    deleteTarget.value = product
    showDeleteDialog.value = true
  }

  async function confirmDelete() {
    if (!deleteTarget.value) return
    deleting.value = true
    try {
      await loanProductsApi.remove(deleteTarget.value.id)
      await fetch(meta.value.current_page)
    } catch (e) {
      error.value = e instanceof ApiError && e.status === 409
        ? `${deleteTarget.value.name} has loans issued under it, so it cannot be deleted. Deactivate it instead.`
        : 'Failed to delete loan product.'
    } finally {
      deleting.value = false
      showDeleteDialog.value = false
      deleteTarget.value = null
    }
  }

  return {
    products, loading, error, search, meta, pages,
    fetch,
    openCreate, openEdit,
    showDeleteDialog, deleteTarget, deleting,
    openDeleteDialog, confirmDelete,
    interestMethodLabel,
  }
}

export function interestMethodLabel(method: string | null | undefined): string {
  if (method === 'flat') return 'Flat Rate'
  if (method === 'reducing_balance') return 'Reducing Balance'
  return '—'
}

export function interestPeriodLabel(period: string | null | undefined): string {
  if (period === 'per_month') return 'per month'
  if (period === 'per_year') return 'per year'
  return ''
}
