<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, Search, X } from 'lucide-vue-next'

/**
 * A select with a search box, for long option lists such as ledger accounts.
 */
const props = defineProps<{
  options: { id: number; name: string }[]
  placeholder?: string
  error?: string
  disabled?: boolean
}>()
const model = defineModel<number | null>({ required: true })

const open = ref(false)
const query = ref('')
const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const selected = computed(() => props.options.find((option) => option.id === model.value) ?? null)
const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  return term ? props.options.filter((option) => option.name.toLowerCase().includes(term)) : props.options
})

async function toggle() {
  if (props.disabled) return
  open.value = !open.value
  query.value = ''
  if (open.value) {
    await nextTick()
    searchInput.value?.focus()
  }
}

function choose(id: number | null) {
  model.value = id
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      class="flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm disabled:opacity-50 dark:bg-neutral-800"
      :class="error ? 'border-red-400 dark:border-red-500' : 'border-neutral-200 dark:border-neutral-700'"
      @click="toggle"
      @keydown.escape="open = false"
    >
      <span :class="selected ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'" class="truncate">
        {{ selected?.name ?? placeholder ?? 'Select…' }}
      </span>
      <span class="flex shrink-0 items-center gap-1 text-neutral-400">
        <X v-if="selected && !disabled" class="h-3.5 w-3.5 hover:text-neutral-700" aria-label="Clear" @click.stop="choose(null)" />
        <ChevronDown class="h-4 w-4" />
      </span>
    </button>
    <div
      v-if="open"
      class="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      <div class="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
        <Search class="h-3.5 w-3.5 text-neutral-400" />
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          placeholder="Search…"
          class="w-full border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:shadow-none dark:text-white"
          @keydown.escape="open = false"
        />
      </div>
      <ul role="listbox" class="max-h-60 overflow-y-auto py-1">
        <li
          v-for="option in filtered"
          :key="option.id"
          role="option"
          :aria-selected="option.id === model"
          class="cursor-pointer px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
          :class="option.id === model ? 'font-semibold text-brand' : 'text-neutral-700 dark:text-neutral-200'"
          @click="choose(option.id)"
        >
          {{ option.name }}
        </li>
        <li v-if="!filtered.length" class="px-3 py-3 text-center text-sm text-neutral-400">No matches.</li>
      </ul>
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>
  </div>
</template>
