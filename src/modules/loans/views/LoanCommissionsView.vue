<script setup lang="ts">
import PageHeader from '@/core/components/PageHeader.vue'
import LoanCommissionLedger from '../components/LoanCommissionLedger.vue'
import '../loan-workflow.css'
</script>
<template>
  <div class="loan-workflow flex flex-col gap-4">
    <PageHeader title="Loan commissions" description="Collected interest, clearance holds, carried-forward commissions, quarterly payouts, and accounting history." />
    <LoanCommissionLedger />
  </div>
</template>
