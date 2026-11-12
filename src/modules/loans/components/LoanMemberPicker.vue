<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Check, Search, X } from 'lucide-vue-next'
import { membersApi } from '@/modules/members/api'
import type { Member, MemberCategory } from '@/modules/members/types'

const props = withDefaults(defineProps<{ label?: string; disabled?: boolean; excludeId?: number | null; category?: MemberCategory }>(), {
  label: 'Member',
})
const selected = defineModel<Member | null>({ required: true })
const uid = useId()
const query = ref('')
const options = ref<Member[]>([])
const loading = ref(false)
const error = ref('')
const open = ref(false)
const highlighted = ref(0)
const root = ref<HTMLElement>()
const input = ref<HTMLInputElement>()
const filtered = computed(() => options.value.filter((member) => member.id !== props.excludeId))
let timer: ReturnType<typeof setTimeout> | undefined
let sequence = 0

async function search(): Promise<void> {
  const request = ++sequence
  loading.value = true
  error.value = ''
  try {
    const result = await membersApi.list({ search: query.value.trim(), status: 'active', category: props.category, per_page: 30 })
    if (request === sequence) {
      options.value = result.data
      highlighted.value = 0
    }
  } catch (exception) {
    if (request === sequence) error.value = exception instanceof Error ? exception.message : 'Could not load members.'
  } finally {
    if (request === sequence) loading.value = false
  }
}
watch(query, () => {
  ++sequence
  clearTimeout(timer)
  loading.value = true
  timer = setTimeout(search, 250)
})
function choose(member: Member): void {
  selected.value = member
  open.value = false
  query.value = ''
}
function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    open.value = false
    return
  }
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault()
    open.value = true
    highlighted.value = Math.max(
      0,
      Math.min(filtered.value.length - 1, highlighted.value + (event.key === 'ArrowDown' ? 1 : -1)),
    )
  }
  if (event.key === 'Enter' && open.value) {
    event.preventDefault()
    const member = filtered.value[highlighted.value]
    if (member) choose(member)
  }
}
function outside(event: MouseEvent): void {
  if (!root.value?.contains(event.target as Node)) open.value = false
}
onMounted(() => {
  void search()
  document.addEventListener('click', outside)
})
onBeforeUnmount(() => {
  ++sequence
  clearTimeout(timer)
  document.removeEventListener('click', outside)
})
</script>

<template>
  <div ref="root" class="loan-member-picker">
    <div v-if="selected" class="loan-selected-member">
      <span class="loan-member-initials" aria-hidden="true">{{
        selected.name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase()
      }}</span>
      <div>
        <strong>{{ selected.name }}</strong
        ><span
          >{{ selected.member_number }}<template v-if="selected.phone"> · {{ selected.phone }}</template></span
        >
      </div>
      <button
        type="button"
        class="loan-icon-button"
        :aria-label="`Clear ${label.toLowerCase()}`"
        :disabled="disabled"
        @click="selected = null"
      >
        <X :size="17" />
      </button>
    </div>
    <div v-else class="loan-member-search">
      <Search :size="17" aria-hidden="true" />
      <input
        :id="uid"
        ref="input"
        v-model="query"
        type="text"
        role="combobox"
        :aria-label="`Search ${label.toLowerCase()}`"
        :aria-expanded="open"
        :aria-controls="`${uid}-list`"
        :aria-activedescendant="open && filtered[highlighted] ? `${uid}-option-${highlighted}` : undefined"
        aria-autocomplete="list"
        autocomplete="off"
        :disabled="disabled"
        placeholder="Search active members by name or number…"
        @focus="open = true"
        @keydown="onKey"
      />
      <div v-if="open" class="loan-member-results">
        <p v-if="loading" role="status">Searching members…</p>
        <div v-else-if="error" role="alert">
          <p>{{ error }}</p>
          <button type="button" class="loan-link" @click="search">Try again</button>
        </div>
        <ul v-else :id="`${uid}-list`" role="listbox" :aria-label="`${label} results`">
          <li
            v-for="(member, index) in filtered"
            :id="`${uid}-option-${index}`"
            :key="member.id"
            role="option"
            :aria-selected="index === highlighted"
            :class="{ 'is-highlighted': index === highlighted }"
            @mousedown.prevent
            @click="choose(member)"
          >
            <strong>{{ member.name }}</strong
            ><span>{{ member.member_number }} · {{ member.phone }}</span
            ><Check v-if="index === highlighted" :size="16" aria-hidden="true" />
          </li>
          <li v-if="!filtered.length" class="loan-member-empty" role="presentation">
            No active members found. Try another name or member number.
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
