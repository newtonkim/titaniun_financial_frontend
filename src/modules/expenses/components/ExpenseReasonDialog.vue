<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Button } from '@/core/components/ui/button'

/** Ask for the reason a decision needs, which stays on the voucher's record. */
const props = defineProps<{ title: string; label: string; confirmLabel: string; destructive?: boolean; busy: boolean; error: string | null }>()
const emit = defineEmits<{ confirm: [reason: string]; cancel: [] }>()

const reason = ref('')
const field = ref<HTMLTextAreaElement | null>(null)

watch(() => props.title, () => { reason.value = '' })
void nextTick(() => field.value?.focus())
</script>

<template>
  <div class="tw-scope fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="expense-reason-title" @click.self="emit('cancel')" @keydown.escape="emit('cancel')">
    <form class="mx-4 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl" @submit.prevent="emit('confirm', reason.trim())">
      <h2 id="expense-reason-title" class="mb-3 text-section text-heading">{{ title }}</h2>
      <label class="flex flex-col gap-1 text-sm font-medium">
        {{ label }}
        <textarea ref="field" v-model="reason" rows="3" required maxlength="255" class="rounded-md border border-border bg-background px-3 py-2 text-sm font-normal" />
      </label>
      <p v-if="error" role="alert" class="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" :disabled="busy" @click="emit('cancel')">Back</Button>
        <Button type="submit" size="sm" :variant="destructive ? 'destructive' : 'default'" :disabled="busy || !reason.trim()">{{ busy ? 'Working…' : confirmLabel }}</Button>
      </div>
    </form>
  </div>
</template>
