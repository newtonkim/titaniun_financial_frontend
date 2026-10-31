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
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
          <CreditCard class="h-5 w-5 text-brand" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-foreground">Loan Products</h1>
          <p class="text-sm text-muted-foreground">Configure loan types and charges</p>
        </div>
      </div>
      <div class="grid gap-5 lg:grid-cols-2">
        <div
          v-for="card in loanProductCards"
          :key="card.title"
          class="rounded-lg border border-border bg-background p-6"
        >
          <h3 class="mb-4 text-base font-semibold text-foreground">{{ card.title }}</h3>
          <p class="mb-4 text-sm text-muted-foreground">{{ card.description }}</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <RouterLink
              :to="card.route"
              class="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              {{ card.action }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
