<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Phone, Search } from 'lucide-vue-next'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import SegmentedControl from '@/core/components/SegmentedControl.vue'
import { Input } from '@/core/components/ui/input'
import { formatDate, formatMoney } from '@/core/utils/format'
import { loanCollectionsApi } from '../api'
import type { LoanCollectionRow, LoanCollectionSummary, LoanCollectionView } from '../types'

/** The call list: who owes what and when, so staff can remind members to pay. */
const route = useRoute()
const router = useRouter()

const LABELS: Record<LoanCollectionView, string> = { past_due: 'Past due', due_today: 'Due today', upcoming: 'Next 7 days' }
const EMPTY: Record<LoanCollectionView, string> = {
  past_due: 'No instalments are past due.',
  due_today: 'No instalments are due today.',
  upcoming: 'No instalments are due in the next 7 days.',
}

const asView = (value: unknown): LoanCollectionView => (value === 'due_today' || value === 'upcoming' ? value : 'past_due')

const view = ref<LoanCollectionView>(asView(route.query.view))
const filters = reactive({ search: '' })
const summary = ref<LoanCollectionSummary | null>(null)
const table = ref<{ load: (page: number) => Promise<void> } | null>(null)

const views = computed(() =>
  (Object.keys(LABELS) as LoanCollectionView[]).map((value) => ({
    value,
    label: summary.value ? `${LABELS[value]} (${summary.value[value].installments})` : LABELS[value],
  })),
)

const totals = computed(() => {
  const current = summary.value?.[view.value]
  if (!current || current.installments === 0) return null
  return `${formatMoney(current.amount)} across ${current.loans} ${current.loans === 1 ? 'loan' : 'loans'}`
})

const columns: Column<LoanCollectionRow>[] = [
  { key: 'member', label: 'Member', sortable: true },
  { key: 'phone', label: 'Phone', sortable: true },
  { key: 'loan_number', label: 'Loan', sortable: true },
  { key: 'period', label: 'Instalment', sortable: true, value: (row) => `#${row.period}` },
  { key: 'due_date', label: 'Due date', sortable: true, value: (row) => formatDate(row.due_date) },
  { key: 'days_late', label: 'Days late', align: 'right' },
  { key: 'amount_due', label: 'Amount due', align: 'right', sortable: true, value: (row) => formatMoney(row.amount_due) },
  { key: 'total_arrears', label: 'Total arrears', align: 'right', value: (row) => formatMoney(row.total_arrears) },
]

async function fetchPage(params: PageParams) {
  const response = await loanCollectionsApi.list({ ...filters, ...params, view: view.value })
  summary.value = response.summary
  return response
}

/** Phone numbers often hold spaces, which a tel: link cannot carry. */
const telLink = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`

watch(view, (value) => {
  void router.replace({ query: value === 'past_due' ? {} : { view: value } })
  void table.value?.load(1)
})
</script>

<template>
  <ResourceTable ref="table" title="Collections" description="Who to call about instalments that are late or coming up." :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #messages>
      <p v-if="totals" class="text-sm font-medium text-navy dark:text-white">{{ LABELS[view] }}: {{ totals }}</p>
    </template>

    <template #filters>
      <SegmentedControl v-model="view" :options="views" label="Which instalments" />
      <div class="relative min-w-52 flex-1 lg:max-w-72">
        <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="filters.search" type="search" aria-label="Search collections" placeholder="Member, phone or loan" class="h-8 pl-8 text-sm" />
      </div>
    </template>

    <template #cell-member="{ row }">
      <RouterLink v-if="row.member_id" class="font-semibold text-navy underline-offset-2 hover:underline dark:text-white" :to="{ name: 'members.show', params: { id: row.member_id } }">{{ row.member_name }}</RouterLink>
      <template v-else>—</template>
    </template>

    <template #cell-phone="{ row }">
      <a v-if="row.phone" :href="telLink(row.phone)" class="inline-flex items-center gap-1.5 font-medium text-navy underline-offset-2 hover:underline dark:text-white">
        <Phone class="size-3.5 text-muted-foreground" aria-hidden="true" />{{ row.phone }}
      </a>
      <span v-else class="text-muted-foreground">No phone</span>
    </template>

    <template #cell-loan_number="{ row }">
      <RouterLink class="underline-offset-2 hover:underline" :to="{ name: 'loans.show', params: { id: row.loan_id } }">{{ row.loan_number }}</RouterLink>
    </template>

    <template #cell-days_late="{ row }">
      <span v-if="row.days_late > 0" :class="{ 'text-destructive': row.days_late > 30 }">{{ row.days_late }}</span>
      <span v-else class="text-muted-foreground">—</span>
    </template>

    <template #empty>
      <p class="font-medium">{{ EMPTY[view] }}</p>
      <p class="mt-1 text-muted-foreground">Unpaid instalments on active loans appear here.</p>
    </template>
  </ResourceTable>
</template>
