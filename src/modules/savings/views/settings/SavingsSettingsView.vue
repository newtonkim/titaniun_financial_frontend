<script setup lang="ts">
import { Landmark } from 'lucide-vue-next'

const settingsCards = [
  {
    title: 'Savings Product Creation',
    description: 'Define savings products and attach charges.',
    route: { name: 'savings.products' },
    action: 'Manage Products →',
  },
]
</script>

<template>
  <div class="tw-scope flex h-full flex-1 flex-col gap-6">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <Landmark class="h-5 w-5 text-brand" />
      </div>
      <div>
        <h1 class="text-page-title text-heading">Savings Products</h1>
        <p class="text-sm text-muted-foreground">Manage savings accounts, fixed deposits, and rules</p>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <div
        v-for="card in settingsCards"
        :key="card.title"
        class="rounded-lg border border-border bg-background p-6"
      >
        <h3 class="mb-4 text-subsection text-heading">{{ card.title }}</h3>
        <p class="mb-4 text-sm text-muted-foreground">{{ card.description }}</p>
        <div class="mt-4 flex flex-wrap gap-3">
          <RouterLink
            :to="card.route"
            class="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brand-dark"
          >
            {{ card.action }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
