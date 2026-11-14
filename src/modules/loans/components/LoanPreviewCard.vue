<script setup lang="ts">
import { Calculator, RefreshCw } from 'lucide-vue-next'
import { formatMoney, formatPercent } from '@/core/utils/format'
import type { LoanProductPreview } from '../types'
defineProps<{ preview: LoanProductPreview | null; loading?: boolean; error?: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <section class="loan-card loan-preview" aria-labelledby="repayment-preview-title" :aria-busy="loading">
    <div class="loan-card-heading">
      <Calculator :size="18" aria-hidden="true" />
      <h2 id="repayment-preview-title">Repayment preview</h2>
    </div>
    <p v-if="loading" class="loan-empty" role="status">
      <span class="spinner" aria-hidden="true" /> Calculating your schedule…
    </p>
    <div v-else-if="error" class="loan-empty" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="loan-link" @click="$emit('retry')"><RefreshCw :size="14" />Try again</button>
    </div>
    <template v-else-if="preview">
      <dl class="loan-summary-list">
        <div>
          <dt>Installment</dt>
          <dd>{{ formatMoney(preview.installment_amount) }}</dd>
        </div>
        <div>
          <dt>Total interest</dt>
          <dd>{{ formatMoney(preview.total_interest) }}</dd>
        </div>
        <div v-if="preview.company_interest !== undefined">
          <dt>Company interest share</dt>
          <dd>{{ formatMoney(preview.company_interest) }}</dd>
        </div>
        <div v-if="preview.commission_amount !== undefined">
          <dt>Commission ({{ formatPercent(preview.commission_rate) }}% of interest)</dt>
          <dd>{{ formatMoney(preview.commission_amount) }}</dd>
        </div>
        <div v-if="preview.charges_with_repayment"><dt>Charges with repayment</dt><dd>{{ formatMoney(preview.charges_with_repayment) }}</dd></div>
        <div v-if="preview.upfront_charges"><dt>Upfront charges</dt><dd>{{ formatMoney(preview.upfront_charges) }}</dd></div>
        <div v-if="preview.processing_fee !== undefined">
          <dt>Processing fee</dt>
          <dd>{{ formatMoney(preview.processing_fee) }}</dd>
        </div>
        <div v-if="preview.net_disbursement !== undefined">
          <dt>Net disbursement</dt>
          <dd>{{ formatMoney(preview.net_disbursement) }}</dd>
        </div>
        <div class="loan-summary-total">
          <dt>Total repayment</dt>
          <dd>{{ formatMoney(preview.total_repayment) }}</dd>
        </div>
      </dl>
      <div class="loan-mini-schedule">
        <div v-for="row in preview.schedule_preview.slice(0, 4)" :key="row.period">
          <span>Period {{ row.period }}</span
          ><strong>{{ formatMoney(row.installment) }}</strong>
        </div>
        <p v-if="preview.schedule_preview.length > 4">+ {{ preview.schedule_preview.length - 4 }} more installments</p>
      </div>
      <p class="loan-hint">
        The processing fee is deducted from the disbursement. Scheduled repayments cover principal and interest; any
        late penalties are separate. Commission is earned as interest is collected and held for quarter-end payout until the client fully clears the loan.
      </p>
    </template>
    <p v-else class="loan-empty">Enter a loan amount and term to preview repayments.</p>
  </section>
</template>
