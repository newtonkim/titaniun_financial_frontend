<script setup lang="ts">
import type { PageParams } from '@/core/api/resource'
import { reactive, ref } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import { Button } from '@/core/components/ui/button'
import { formatDate, formatMoney } from '@/core/utils/format'
import { INVOICE_STATUS, invoiceNumber, loanInvoicesApi, printLoanInvoice, type LoanInvoice } from '../invoices'

const filters = reactive({ search: '' })
const failure = ref<string | null>(null)

const columns: Column<LoanInvoice>[] = [
  { key: 'number', label: 'Invoice', tone: 'strong', value: (invoice) => invoiceNumber(invoice.number) },
  { key: 'issued_on', label: 'Issued', value: (invoice) => formatDate(invoice.issued_on) },
  { key: 'borrower', label: 'Borrower', value: (invoice) => invoice.loan.borrower },
  { key: 'loan', label: 'Loan', tone: 'muted', value: (invoice) => invoice.loan.loan_number },
  { key: 'due_on', label: 'Due', value: (invoice) => formatDate(invoice.due_on) },
  { key: 'status', label: 'Status' },
  { key: 'total_due', label: 'Amount due', align: 'right', value: (invoice) => formatMoney(invoice.total_due) },
]

const fetchPage = (params: PageParams) => loanInvoicesApi.list({ ...filters, ...params })

async function print(id: number) {
  failure.value = null
  try {
    await printLoanInvoice(id)
  } catch (error) {
    failure.value = error instanceof Error ? error.message : 'The invoice could not be printed.'
  }
}
</script>

<template>
  <div class="tw-scope">
    <ResourceTable title="Loan invoices" description="What borrowers owe and when. One is issued at disbursement; issue more from a loan's Invoices tab." :columns="columns" :filters="filters" :fetch="fetchPage">
      <template #messages>
        <p v-if="failure" role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ failure }}</p>
      </template>
      <template #filters>
        <input v-model="filters.search" type="search" placeholder="Borrower, loan or invoice number" aria-label="Search invoices" class="h-9 rounded-md border border-border bg-background px-3 text-sm" />
      </template>
      <template #cell-status="{ row }"><span class="badge" :class="`badge--${INVOICE_STATUS[row.status].badge}`">{{ INVOICE_STATUS[row.status].label }}</span></template>
      <template #row-actions="{ row }">
        <Button as-child variant="ghost" size="sm"><RouterLink :to="{ name: 'loans.show', params: { id: row.loan.id } }">Loan</RouterLink></Button>
        <Button variant="outline" size="sm" @click="print(row.id)">Print</Button>
      </template>
      <template #empty>
        <p class="font-medium">No invoices yet</p>
        <p class="mt-1 text-sm text-muted-foreground">An invoice is issued automatically when a loan is disbursed.</p>
      </template>
    </ResourceTable>
  </div>
</template>
