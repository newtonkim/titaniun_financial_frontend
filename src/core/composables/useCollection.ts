import { ref, shallowRef, type Ref } from 'vue'
import type { Collection, PaginationMeta } from '@/core/api/types'

export function useCollection<T>(fetcher: (page: number) => Promise<Collection<T>>) {
  const rows = shallowRef<T[]>([]) as Ref<T[]>
  const meta = ref<PaginationMeta | null>(null)
  const page = ref(1)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let latestRequest = 0

  async function load(targetPage = page.value): Promise<void> {
    const requestId = ++latestRequest
    loading.value = true
    error.value = null

    try {
      const response = await fetcher(targetPage)
      if (requestId !== latestRequest) return
      rows.value = response.data
      meta.value = response.meta ?? null
      page.value = targetPage
    } catch (exception) {
      if (requestId !== latestRequest) return
      error.value = exception instanceof Error ? exception.message : 'Request failed.'
    } finally {
      if (requestId === latestRequest) loading.value = false
    }
  }

  return { rows, meta, page, loading, error, load, reload: () => load(page.value) }
}
