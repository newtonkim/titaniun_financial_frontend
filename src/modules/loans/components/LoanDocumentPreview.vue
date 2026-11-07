<script setup lang="ts">
import { ref, watch } from 'vue'
import { Download, ExternalLink, FileText } from 'lucide-vue-next'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { Button } from '@/core/components/ui/button'
import { loansApi } from '../api'
import type { LoanDocument } from '../types'

const props = defineProps<{ loanId: number; document: LoanDocument }>()
const emit = defineEmits<{ close: [] }>()
const open = ref(true)
const loading = ref(true)
const error = ref('')
const previewUrl = ref('')
const previewType = ref<'pdf' | 'image' | null>(null)
const downloading = ref(false)
const downloadError = ref('')
const attempt = ref(0)

watch(open, (value) => {
  if (!value) emit('close')
})

watch(
  () => [props.loanId, props.document.id, attempt.value],
  async (_, __, onCleanup) => {
    const controller = new AbortController()
    let objectUrl = ''
    loading.value = true
    error.value = ''
    previewUrl.value = ''
    previewType.value = null
    onCleanup(() => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    })

    try {
      const file = await loansApi.documentFile(props.loanId, props.document.id, controller.signal)
      if (controller.signal.aborted) return
      const mimeType = file.type.split(';')[0]?.trim().toLowerCase()
      if (mimeType === 'application/pdf') {
        previewType.value = 'pdf'
      } else if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType ?? '')) {
        previewType.value = 'image'
      } else {
        error.value = 'Preview is unavailable for this file type. Download the document to view it.'
        return
      }
      objectUrl = URL.createObjectURL(file)
      previewUrl.value = objectUrl
    } catch (failure) {
      if (!controller.signal.aborted) {
        error.value = failure instanceof Error ? failure.message : 'The document could not be loaded.'
      }
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  },
  { immediate: true },
)

async function downloadDocument(): Promise<void> {
  downloading.value = true
  downloadError.value = ''
  try {
    await loansApi.downloadDocument(props.loanId, props.document.id, props.document.original_name)
  } catch (failure) {
    downloadError.value = failure instanceof Error ? failure.message : 'The document could not be downloaded.'
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <AppDrawer v-model:open="open" :title="`Preview · ${document.title}`" width="w-full sm:max-w-5xl">
    <div class="flex h-full min-h-0 flex-col gap-3">
      <p class="shrink-0 wrap-anywhere text-sm text-muted-foreground">{{ document.original_name }}</p>
      <div v-if="loading" class="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
        <span class="spinner" aria-hidden="true" />Loading document…
      </div>
      <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <FileText :size="32" class="text-muted-foreground" aria-hidden="true" />
        <p role="alert" class="text-sm text-muted-foreground">{{ error }}</p>
        <Button type="button" variant="outline" size="sm" @click="attempt++">Try again</Button>
      </div>
      <iframe
        v-else-if="previewType === 'pdf'"
        :src="previewUrl"
        :title="`PDF preview: ${document.title}`"
        class="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
      />
      <div v-else-if="previewType === 'image'" class="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg bg-muted/40 p-3">
        <img
          :src="previewUrl"
          :alt="document.title"
          class="max-h-full max-w-full object-contain"
          @error="error = 'The image could not be displayed. Download the document to view it.'"
        />
      </div>
      <p v-if="downloadError" role="alert" class="shrink-0 text-sm text-destructive">{{ downloadError }}</p>
    </div>
    <template #actions>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" @click="open = false">Close</Button>
        <Button v-if="previewUrl" as-child variant="outline" size="sm">
          <a :href="previewUrl" target="_blank" rel="noopener noreferrer"><ExternalLink :size="15" />Open in new tab</a>
        </Button>
        <Button type="button" size="sm" :disabled="downloading" @click="downloadDocument">
          <Download :size="15" />{{ downloading ? 'Downloading…' : 'Download' }}
        </Button>
      </div>
    </template>
  </AppDrawer>
</template>
