<script setup lang="ts">
import { reactive } from 'vue'
import ResourceTable, { type Column } from '@/core/components/ResourceTable.vue'
import StatusBadge from '@/core/components/StatusBadge.vue'
import { formatDate, formatEnum } from '@/core/utils/format'
import { membersApi } from '../api'
import { MEMBER_STATUSES, type Member, type MemberFilters } from '../types'

const filters = reactive<MemberFilters>({ search: '', status: '' })

const columns: Column<Member>[] = [
  { key: 'member_number', label: 'Member #' },
  { key: 'name', label: 'Name', value: (member) => `${member.first_name} ${member.last_name}` },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'joined_at', label: 'Joined', value: (member) => formatDate(member.joined_at) },
]

const fetchPage = (page: number) => membersApi.list({ ...filters, page })
</script>

<template>
  <ResourceTable title="Members" :columns="columns" :filters="filters" :fetch="fetchPage">
    <template #actions>
      <RouterLink class="btn btn--primary" :to="{ name: 'members.create' }">New member</RouterLink>
    </template>
    <template #filters>
      <input v-model.lazy="filters.search" type="search" placeholder="Search name, number, phone…" />
      <select v-model="filters.status">
        <option value="">All statuses</option>
        <option v-for="status in MEMBER_STATUSES" :key="status" :value="status">{{ formatEnum(status) }}</option>
      </select>
    </template>
    <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
  </ResourceTable>
</template>
