<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { Input } from '@/core/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { formatDate, formatMoney, formatTime } from '@/core/utils/format'
import type { DashboardActivity } from '@/modules/reports/types'
import DashCard from './DashCard.vue'

const props = defineProps<{ activities: DashboardActivity[] }>()

const search = ref('')

const rows = computed(() => {
  const term = search.value.trim().toLowerCase()
  return props.activities.filter((activity) => !term || [activity.label, activity.party, activity.reference].some((value) => value?.toLowerCase().includes(term)))
})
</script>

<template>
  <DashCard title="Recent activity">
    <template #tools>
      <div class="relative w-52 max-w-full">
        <Search class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input v-model="search" type="search" placeholder="Search activity" aria-label="Search activity" class="h-7 pl-7 text-xs" />
      </div>
    </template>
    <Table class="tabular-nums">
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead>Activity</TableHead>
          <TableHead>Member or category</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>When</TableHead>
          <TableHead class="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="activity in rows" :key="`${activity.type}-${activity.occurred_at}-${activity.reference}`">
          <TableCell class="font-medium">{{ activity.label }}</TableCell>
          <TableCell class="text-muted-foreground">{{ activity.party ?? '—' }}</TableCell>
          <TableCell class="text-muted-foreground">{{ activity.reference ?? '—' }}</TableCell>
          <TableCell class="text-muted-foreground">{{ formatDate(activity.occurred_at) }}<template v-if="activity.type !== 'expense'">, {{ formatTime(activity.occurred_at) }}</template></TableCell>
          <TableCell class="text-right font-medium">
            <span class="sr-only">{{ activity.direction === 'in' ? 'Money in' : 'Money out' }}</span>
            {{ activity.direction === 'in' ? '+' : '−' }}{{ formatMoney(activity.amount) }}
          </TableCell>
        </TableRow>
        <TableRow v-if="rows.length === 0" class="hover:bg-transparent">
          <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">
            {{ activities.length === 0 ? 'No activity yet. Deposits, repayments, share trades and expenses will show up here.' : 'No activity matches your search.' }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </DashCard>
</template>
