<script setup lang="ts">
import { Button } from '@/core/components/ui/button'

/** Confirm deleting a member. Only a member with no accounts or history can go; the server refuses the rest. */
defineProps<{ name: string | undefined; deleting: boolean; error: string | null }>()
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div
    class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-member-title"
    @click.self="$emit('cancel')"
    @keydown.escape="$emit('cancel')"
  >
    <div class="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl">
      <h2 id="delete-member-title" class="mb-2 text-section text-heading">Delete member</h2>
      <p class="text-sm text-muted-foreground">Delete <strong class="text-foreground">{{ name }}</strong>? This cannot be undone.</p>
      <p class="mt-2 text-sm text-muted-foreground">Only a member with no savings, shares or loans can be deleted. For anyone else, make them dormant or start a member exit.</p>
      <p v-if="error" role="alert" class="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <Button variant="outline" size="sm" :disabled="deleting" @click="$emit('cancel')">Cancel</Button>
        <Button variant="destructive" size="sm" :disabled="deleting || Boolean(error)" @click="$emit('confirm')">{{ deleting ? 'Deleting…' : 'Delete' }}</Button>
      </div>
    </div>
  </div>
</template>
