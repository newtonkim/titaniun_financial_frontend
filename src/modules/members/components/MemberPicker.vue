<script setup lang="ts">
import { ref, watch } from 'vue'
import { membersApi } from '../api'
import type { Member } from '../types'

const memberId = defineModel<number | null>({ required: true })

const search = ref('')
const options = ref<Member[]>([])
let debounce: ReturnType<typeof setTimeout> | undefined

async function find(): Promise<void> {
  const response = await membersApi.list({ search: search.value, status: 'active' })
  options.value = response.data
}

watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(find, 250)
})

find()
</script>

<template>
  <div class="picker">
    <input v-model="search" type="search" placeholder="Search active members…" />
    <select v-model="memberId" required>
      <option :value="null" disabled>Select a member</option>
      <option v-for="member in options" :key="member.id" :value="member.id">
        {{ member.member_number }} · {{ member.name }}
      </option>
    </select>
  </div>
</template>
