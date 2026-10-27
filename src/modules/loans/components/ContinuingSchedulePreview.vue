<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import { formatDate, formatMoney } from '@/core/utils/format'
import { createRepaymentSchedule } from '../continuing-agreement'
import type { LoanProductPreview } from '../types'

defineProps<{ preview: LoanProductPreview | null; borrower: string; loading: boolean; error: string }>()
</script>

<template>
  <section class="loan-card mt-6" aria-label="Continuing member repayment schedule" :aria-busy="loading">
    <div class="loan-card-heading"><h2>Monthly repayment schedule</h2></div>
    <p v-if="loading" class="loan-hint" role="status">Calculating your repayment schedule…</p>
    <p v-else-if="error" class="application-alert" role="alert">{{ error }}</p>
    <template v-else-if="preview?.schedule_preview.length">
      <p class="loan-hint">
        Generated from the entered loan terms. Complete approval and cash disbursement to start repayment
        tracking. The final payment clears rounding differences.
      </p>
      <button
        type="button"
        class="loan-button loan-button--outline my-4"
        @click="
          createRepaymentSchedule(preview, borrower, 'Continuing member application', true).save(
            'proposed-repayment-schedule.pdf',
          )
        "
      >
        <Download :size="16" />Download proposed schedule
      </button>
      <div class="loan-table-wrap max-h-96 overflow-auto">
        <table class="loan-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Due date</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Charges</th>
              <th>Payment</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in preview.schedule_preview" :key="row.period">
              <td>{{ row.period }}</td>
              <td>{{ row.due_date ? formatDate(row.due_date) : 'Enter first repayment date' }}</td>
              <td>{{ formatMoney(row.principal) }}</td>
              <td>{{ formatMoney(row.interest) }}</td>
              <td>{{ formatMoney(row.fees ?? 0) }}</td>
              <td>{{ formatMoney(row.installment) }}</td>
              <td>{{ formatMoney(row.balance) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="loan-hint mt-4">
        Total repayment: <strong>{{ formatMoney(preview.total_repayment) }}</strong>
      </p>
    </template>
    <p v-else class="loan-hint">
      Select a member, monthly loan product, amount and term to generate the schedule.
    </p>
  </section>
</template>
