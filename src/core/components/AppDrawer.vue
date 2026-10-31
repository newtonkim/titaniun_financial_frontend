<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { X } from 'lucide-vue-next'
import { Button } from '@/core/components/ui/button'

/**
 * A right-hand sheet that hosts a form: title bar, scrolling body and a Cancel / Save footer.
 * Submitting the form (Enter or the Save button) emits `save`; closing is blocked while `loading`.
 */
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    width?: string
    showFooter?: boolean
    saveButtonText?: string
    cancelButtonText?: string
    saveLoadingText?: string
    loading?: boolean
    saveDisabled?: boolean
  }>(),
  {
    description: undefined,
    width: 'w-full sm:max-w-[520px]',
    showFooter: true,
    saveButtonText: 'Save',
    cancelButtonText: 'Cancel',
    saveLoadingText: 'Saving...',
    loading: false,
    saveDisabled: false,
  },
)
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ save: []; cancel: [] }>()

function setOpen(value: boolean) {
  if (!value && props.loading) return
  open.value = value
}

function handleSave() {
  if (props.loading || props.saveDisabled) return
  emit('save')
}

function handleCancel() {
  if (props.loading) return
  emit('cancel')
  open.value = false
}
</script>

<template>
  <DialogRoot :open="open" @update:open="setOpen">
    <DialogPortal>
      <DialogOverlay class="app-drawer-overlay fixed inset-0 z-50 bg-black/40" />
      <DialogContent
        v-bind="description ? {} : { 'aria-describedby': undefined }"
        :class="[
          'app-drawer-panel tw-scope fixed inset-y-0 right-0 z-50 flex h-full max-w-full flex-col border-l border-border bg-background text-foreground shadow-lg',
          width,
        ]"
      >
        <div class="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-3.5">
          <div class="min-w-0">
            <DialogTitle class="text-lg font-bold text-navy dark:text-white">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-0.5 text-sm text-muted-foreground">{{ description }}</DialogDescription>
          </div>
          <DialogClose as-child>
            <Button variant="ghost" size="icon-sm" aria-label="Close" :disabled="loading"><X /></Button>
          </DialogClose>
        </div>

        <form class="flex min-h-0 w-full min-w-0 flex-1 flex-col" novalidate @submit.prevent="handleSave">
          <div class="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
            <slot />
          </div>

          <div v-if="showFooter" class="z-10 shrink-0 border-t border-border px-5 py-3">
            <slot name="actions">
              <div class="flex w-full items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" :disabled="loading" @click="handleCancel">{{ cancelButtonText }}</Button>
                <Button type="submit" size="sm" :disabled="loading || saveDisabled">
                  <span v-if="loading" class="spinner" aria-hidden="true" />
                  {{ loading ? saveLoadingText : saveButtonText }}
                </Button>
              </div>
            </slot>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.app-drawer-overlay[data-state='open'] { animation: app-drawer-fade-in 200ms ease-out; }
.app-drawer-overlay[data-state='closed'] { animation: app-drawer-fade-out 150ms ease-in; }
.app-drawer-panel[data-state='open'] { animation: app-drawer-slide-in 240ms var(--ease-out); }
.app-drawer-panel[data-state='closed'] { animation: app-drawer-slide-out 160ms ease-in; }

@keyframes app-drawer-fade-in { from { opacity: 0; } }
@keyframes app-drawer-fade-out { to { opacity: 0; } }
@keyframes app-drawer-slide-in { from { transform: translateX(100%); } }
@keyframes app-drawer-slide-out { to { transform: translateX(100%); } }

@media (prefers-reduced-motion: reduce) {
  .app-drawer-overlay, .app-drawer-panel { animation-duration: 1ms !important; }
}
</style>
