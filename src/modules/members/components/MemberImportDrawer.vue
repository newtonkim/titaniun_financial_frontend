<script setup lang="ts">
import { ref, watch } from 'vue'
import { CheckCircle2, Download, FileSpreadsheet, TriangleAlert } from 'lucide-vue-next'
import { ApiError } from '@/core/api/http'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { membersApi } from '../api'
import type { MemberImportResult } from '../types'

/** Upload a filled-in member template; valid rows are registered and failed rows listed. */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ imported: [] }>()

const file = ref<File | null>(null)
const uploading = ref(false)
const downloading = ref(false)
const message = ref('')
const result = ref<MemberImportResult | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) return
  file.value = null
  message.value = ''
  result.value = null
})

function pick(event: Event): void {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  result.value = null
}

async function downloadTemplate(): Promise<void> {
  downloading.value = true
  try {
    await membersApi.downloadTemplate()
  } catch {
    message.value = 'Failed to download the template.'
  } finally {
    downloading.value = false
  }
}

async function upload(): Promise<void> {
  if (!file.value) {
    message.value = 'Choose a spreadsheet to import.'
    return
  }

  uploading.value = true
  message.value = ''
  try {
    result.value = await membersApi.import(file.value)
    if (result.value.imported > 0) emit('imported')
  } catch (e) {
    message.value = e instanceof ApiError ? (e.errors.file?.[0] ?? e.message) : 'Failed to import members.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <AppDrawer
    v-model:open="open"
    title="Import members"
    description="Register many members at once from the member template."
    :loading="uploading"
    save-button-text="Import"
    save-loading-text="Importing..."
    @save="upload"
  >
    <div class="flex flex-col gap-5">
      <p v-if="message" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
        {{ message }}
      </p>

      <div class="rounded-lg border border-border bg-background p-5">
        <p class="text-sm font-semibold text-foreground">1. Download the template</p>
        <p class="mt-1 text-xs text-muted-foreground">Fill one member per row. Name, gender, marital status, nationality, address and phone are required; member_type is new_member or existing_member.</p>
        <button
          type="button"
          :disabled="downloading"
          class="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          @click="downloadTemplate"
        >
          <Download class="h-4 w-4" />
          {{ downloading ? 'Downloading...' : 'Member Template' }}
        </button>
      </div>

      <div class="rounded-lg border border-border bg-background p-5">
        <p class="text-sm font-semibold text-foreground">2. Upload the completed sheet</p>
        <label class="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-brand">
          <FileSpreadsheet class="h-8 w-8 text-muted-foreground" />
          <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ file ? file.name : 'Choose an .xlsx, .xls or .csv file' }}</span>
          <input type="file" accept=".xlsx,.xls,.csv" class="sr-only" @change="pick" />
        </label>
      </div>

      <div v-if="result" class="rounded-lg border border-border bg-background p-5">
        <p class="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 class="h-4 w-4" /> {{ result.imported }} member{{ result.imported === 1 ? '' : 's' }} imported
        </p>
        <template v-if="result.failed">
          <p class="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <TriangleAlert class="h-4 w-4" /> {{ result.failed }} row{{ result.failed === 1 ? '' : 's' }} skipped
          </p>
          <ul class="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs">
            <li v-for="failure in result.failures" :key="failure.row" class="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
              <span class="font-semibold">Row {{ failure.row }}:</span>
              {{ Object.values(failure.errors).flat().join(' ') }}
            </li>
          </ul>
        </template>
      </div>
    </div>
  </AppDrawer>
</template>
