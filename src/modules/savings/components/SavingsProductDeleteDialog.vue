<script setup lang="ts">
defineProps<{
  show: boolean
  productName: string | undefined
  deleting: boolean
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div
    v-if="show"
    class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-savings-product-title"
    @click.self="$emit('cancel')"
    @keydown.escape="$emit('cancel')"
  >
    <div class="mx-4 w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
      <h3 id="delete-savings-product-title" class="mb-2 text-base font-semibold text-neutral-900 dark:text-white">Delete Savings Product</h3>
      <p class="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        Are you sure you want to delete
        <strong class="text-neutral-800 dark:text-neutral-200">{{ productName }}</strong>?
        This action cannot be undone.
      </p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          :disabled="deleting"
          @click="$emit('confirm')"
        >
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>
  </div>
</template>
