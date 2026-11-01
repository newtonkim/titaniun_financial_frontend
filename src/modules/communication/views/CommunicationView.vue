<script setup lang="ts">
import AppIcon from '@/core/components/AppIcon.vue'
import PageHeader from '@/core/components/PageHeader.vue'
</script>

<template>
  <div class="tw-scope flex flex-col gap-6">
    <PageHeader title="Communication" />
    <div class="flex flex-col items-center rounded-lg border border-border bg-background px-6 py-20 text-center">
      <span class="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand"><AppIcon name="message" :size="24" /></span>
      <h2 class="mt-4 text-section text-heading">Coming soon</h2>
    </div>
  </div>
</template>
