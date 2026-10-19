<script setup lang="ts">
import { CreditCard } from 'lucide-vue-next'

const loanProductCards = [
  {
    title: 'Loan Types',
    description: 'Define different categories of loan products.',
    route: { name: 'loans.products' },
    action: 'Manage Types →',
  },
]
</script>

<template>
  <div class="tw-scope flex flex-col gap-8">
    <div>
      <div class="mb-5 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <CreditCard class="h-5 w-5 text-brand" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Loan Products</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Configure loan types and charges</p>
        </div>
      </div>
      <div class="grid gap-5 lg:grid-cols-2">
        <div
          v-for="card in loanProductCards"
          :key="card.title"
          class="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <h3 class="mb-4 text-base font-semibold text-neutral-900 dark:text-white">{{ card.title }}</h3>
          <p class="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{{ card.description }}</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <RouterLink
              :to="card.route"
              class="inline-flex items-center justify-center rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy/90"
            >
              {{ card.action }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
