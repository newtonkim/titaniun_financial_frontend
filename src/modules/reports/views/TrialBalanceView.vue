<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatEnum, formatMoney, today } from '@/core/utils/format'
import { reportsApi } from '../api'
import type { TrialBalance } from '../types'

const asOf = ref(today())
const report = ref<TrialBalance | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const isBalanced = computed(() => report.value !== null && report.value.total_debit === report.value.total_credit)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    report.value = await reportsApi.trialBalance(asOf.value || undefined)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Request failed.'
  } finally {
    loading.value = false
  }
}

watch(asOf, load, { immediate: true })
</script>

<template>
  <section class="panel">
    <header class="panel__header">
      <h1>Trial balance</h1>
      <label class="inline">As of <input v-model="asOf" type="date" /></label>
    </header>

    <p v-if="error" class="alert alert--error">{{ error }}</p>
    <p v-if="report && !isBalanced" class="alert alert--error">Debits and credits do not balance.</p>

    <div class="table-wrap" :aria-busy="loading">
      <table v-if="report">
        <thead>
          <tr><th>Code</th><th>Account</th><th>Type</th><th class="num">Debit</th><th class="num">Credit</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in report.rows" :key="row.code">
            <td>{{ row.code }}</td>
            <td>{{ row.name }}</td>
            <td>{{ formatEnum(row.type) }}</td>
            <td class="num">{{ formatMoney(row.debit) }}</td>
            <td class="num">{{ formatMoney(row.credit) }}</td>
          </tr>
          <tr v-if="report.rows.length === 0"><td colspan="5" class="empty">No postings up to this date.</td></tr>
        </tbody>
        <tfoot>
          <tr><th colspan="3">Total</th><th class="num">{{ formatMoney(report.total_debit) }}</th><th class="num">{{ formatMoney(report.total_credit) }}</th></tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>
