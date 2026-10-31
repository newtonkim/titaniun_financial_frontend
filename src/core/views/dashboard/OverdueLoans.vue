<script setup lang="ts">
import { Button } from '@/core/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table'
import { formatMoney } from '@/core/utils/format'
import type { DashboardOverdueLoan } from '@/modules/reports/types'
import DashCard from './DashCard.vue'

defineProps<{ loans: DashboardOverdueLoan[]; total: number }>()
</script>

<template>
  <DashCard title="Most overdue loans" :lede="total > loans.length ? `Oldest ${loans.length} of ${total}` : undefined">
    <template #tools>
      <Button as-child variant="ghost" size="xs"><RouterLink :to="{ name: 'loans.index' }">All loans</RouterLink></Button>
    </template>
    <Table v-if="loans.length" class="text-[0.8125rem] tabular-nums">
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead>Loan</TableHead>
          <TableHead>Borrower</TableHead>
          <TableHead class="text-right">Days late</TableHead>
          <TableHead class="text-right">Arrears</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="loan in loans" :key="loan.id">
          <TableCell><RouterLink class="font-semibold text-navy underline-offset-2 hover:underline dark:text-white" :to="{ name: 'loans.show', params: { id: loan.id } }">{{ loan.loan_number }}</RouterLink></TableCell>
          <TableCell class="max-w-44 truncate">{{ loan.borrower ?? '—' }}</TableCell>
          <TableCell class="text-right font-medium" :class="{ 'text-destructive': loan.days_overdue > 30 }">{{ loan.days_overdue }}</TableCell>
          <TableCell class="text-right font-medium">{{ formatMoney(loan.arrears) }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <p v-else class="p-6 text-center text-sm text-muted-foreground">No loans are overdue.</p>
  </DashCard>
</template>
