<script setup lang="ts">
import LoanCommissionLedger from '../components/LoanCommissionLedger.vue'
import '../loan-workflow.css'
</script>
<template>
  <div class="loan-workflow">
    <header class="loan-page-header">
      <div>
        <h1>Loan commissions</h1>
        <p>Collected interest, clearance holds, carried-forward commissions, quarterly payouts, and accounting history.</p>
      </div>
    </header>
    <LoanCommissionLedger />
  </div>
</template>
