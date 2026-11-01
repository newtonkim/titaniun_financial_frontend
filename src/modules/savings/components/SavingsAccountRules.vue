<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'

/** Rules no setting can change, listed so staff can see them instead of looking for a switch. */
const RULES = [
  'Closing an account needs a second person, and closing is final.',
  'An account closes only when empty, with no freeze, pending reversal, guarantee or loan arrears.',
  'Reactivating a dormant account needs two officers. A deposit does not reactivate it.',
  'A freeze stops withdrawals, and a second person must approve its release.',
  'An account becomes a dormancy candidate after 24 months with no member activity.',
  'Nobody can approve their own request, and savings accounts are never deleted.',
]
</script>

<template>
  <section class="rounded-lg border border-border bg-background p-5" aria-label="Savings account rules">
    <h2 class="flex items-center gap-2 text-section text-heading">
      <ShieldCheck class="size-4 text-brand" aria-hidden="true" />
      Savings account rules
    </h2>
    <p class="mt-1 text-sm text-muted-foreground">These protect members and the audit trail, so they cannot be switched off.</p>
    <ul class="mt-3 grid list-disc gap-x-8 gap-y-1.5 pl-4 text-sm text-foreground lg:grid-cols-2" style="list-style: disc">
      <li v-for="rule in RULES" :key="rule">{{ rule }}</li>
    </ul>
  </section>
</template>
