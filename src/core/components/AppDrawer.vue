<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { X } from 'lucide-vue-next'

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
      <DialogOverlay class="app-drawer-overlay fixed inset-0 z-50 bg-black/60" />
      <DialogContent
        v-bind="description ? {} : { 'aria-describedby': undefined }"
        :class="[
          'app-drawer-panel tw-scope fixed inset-y-0 right-0 z-50 flex h-full max-w-full flex-col border-l border-neutral-100 bg-gray-50 shadow-lg dark:border-neutral-800 dark:bg-neutral-900',
          width,
        ]"
      >
        <div class="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-100 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div class="min-w-0">
            <DialogTitle class="text-xl font-bold capitalize text-neutral-900 dark:text-white">{{ title.toLocaleLowerCase() }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ description }}</DialogDescription>
          </div>
          <DialogClose
            aria-label="Close"
            :disabled="loading"
            class="rounded-md p-1 text-neutral-500 opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none"
          >
            <X class="h-4 w-4" />
          </DialogClose>
        </div>

        <form class="flex min-h-0 w-full min-w-0 flex-1 flex-col" novalidate @submit.prevent="handleSave">
          <div class="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
            <slot />
          </div>

          <div v-if="showFooter" class="z-10 shrink-0 border-t border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <slot name="actions">
              <div class="flex w-full items-center justify-between gap-3">
                <button
                  type="button"
                  :disabled="loading"
                  class="h-10 w-36 rounded-lg border border-neutral-200 bg-white text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  @click="handleCancel"
                >
                  {{ cancelButtonText }}
                </button>
                <button
                  type="submit"
                  :disabled="loading || saveDisabled"
                  class="flex h-10 w-36 items-center justify-center gap-2 rounded-lg bg-navy text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy/90 disabled:opacity-50"
                >
                  <span v-if="loading" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
                  {{ loading ? saveLoadingText : saveButtonText }}
                </button>
              </div>
            </slot>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.app-drawer-overlay[data-state='open'] { animation: app-drawer-fade-in 300ms ease-out; }
.app-drawer-overlay[data-state='closed'] { animation: app-drawer-fade-out 300ms ease-in; }
.app-drawer-panel[data-state='open'] { animation: app-drawer-slide-in 500ms cubic-bezier(0.32, 0.72, 0, 1); }
.app-drawer-panel[data-state='closed'] { animation: app-drawer-slide-out 300ms ease-in; }

@keyframes app-drawer-fade-in { from { opacity: 0; } }
@keyframes app-drawer-fade-out { to { opacity: 0; } }
@keyframes app-drawer-slide-in { from { transform: translateX(100%); } }
@keyframes app-drawer-slide-out { to { transform: translateX(100%); } }

@media (prefers-reduced-motion: reduce) {
  .app-drawer-overlay, .app-drawer-panel { animation-duration: 1ms !important; }
}
</style>
