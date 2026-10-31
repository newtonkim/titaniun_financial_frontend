<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import AppDrawer from '@/core/components/AppDrawer.vue'
import { ApiError } from '@/core/api/http'
import type { AccessRole } from '@/modules/settings/access-types'
import { staffApi } from '../api'
import type { StaffPayload, StaffUser } from '../types'

/** Create a staff account, or edit one's details, roles, password and sign-in access. */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ staff: StaffUser | null; roles: AccessRole[]; currentUserId?: number }>()
const emit = defineEmits<{ saved: [staff: StaffUser, created: boolean] }>()

const blank = (): StaffPayload => ({ name: '', email: '', password: '', roles: [], is_active: true })
const form = reactive({ ...blank(), processing: false, message: '', errors: {} as Record<string, string[]> })
const editing = computed(() => props.staff !== null)
const isSelf = computed(() => props.staff !== null && props.staff.id === props.currentUserId)

watch(open, (isOpen) => {
  if (!isOpen) return
  const staff = props.staff
  Object.assign(form, blank(), { message: '', errors: {} })
  if (staff) Object.assign(form, { name: staff.name, email: staff.email, roles: [...staff.roles], is_active: staff.approved_at !== null })
})

function toggleRole(name: string, checked: boolean) {
  form.roles = checked ? [...form.roles, name] : form.roles.filter((role) => role !== name)
}

function error(field: string): string | undefined {
  return form.errors[field]?.[0] ?? Object.entries(form.errors).find(([key]) => key.startsWith(`${field}.`))?.[1][0]
}

async function save() {
  form.processing = true
  form.message = ''
  form.errors = {}
  const payload: StaffPayload = { name: form.name, email: form.email, password: form.password, roles: form.roles, is_active: form.is_active }
  try {
    const staff = props.staff ? await staffApi.update(props.staff.id, payload) : await staffApi.create(payload)
    emit('saved', staff, !props.staff)
    open.value = false
  } catch (failure) {
    form.errors = failure instanceof ApiError ? failure.errors : {}
    form.message = form.errors.user?.[0] ?? (failure instanceof Error ? failure.message : 'Failed to save the staff member.')
  } finally {
    form.processing = false
  }
}

const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand dark:text-white'
const label = 'mb-1.5 block text-[13px] font-semibold text-neutral-700 dark:text-neutral-300'
</script>

<template>
  <AppDrawer
    v-model:open="open"
    :title="editing ? 'Edit staff member' : 'Add staff member'"
    :description="editing ? 'Update their details, roles and sign-in access.' : 'Create an account a colleague can sign in with.'"
    :save-button-text="editing ? 'Save changes' : 'Create staff member'"
    :loading="form.processing"
    @save="save"
  >
    <div class="tw-scope flex flex-col gap-5">
      <p v-if="form.message" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ form.message }}</p>

      <div>
        <label :class="label" for="staff-name">Full name</label>
        <input id="staff-name" v-model="form.name" type="text" autocomplete="off" required :class="input" />
        <p v-if="error('name')" class="mt-1 text-xs text-red-500">{{ error('name') }}</p>
      </div>
      <div>
        <label :class="label" for="staff-email">Email address</label>
        <input id="staff-email" v-model="form.email" type="email" autocomplete="off" required :class="input" />
        <p v-if="error('email')" class="mt-1 text-xs text-red-500">{{ error('email') }}</p>
      </div>
      <div>
        <label :class="label" for="staff-password">{{ editing ? 'New password' : 'Password' }}</label>
        <input id="staff-password" v-model="form.password" type="password" autocomplete="new-password" :required="!editing" :class="input" />
        <p v-if="error('password')" class="mt-1 text-xs text-red-500">{{ error('password') }}</p>
        <p v-else class="mt-1 text-xs text-muted-foreground">
          {{ editing ? 'Leave blank to keep the current password. Setting one signs them out of other devices.' : 'Share it with them securely; they can change it under Settings › Security.' }}
        </p>
      </div>

      <fieldset>
        <legend :class="label">Roles</legend>
        <div class="flex flex-col gap-2">
          <label
            v-for="role in roles"
            :key="role.id"
            class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"
            :class="{ 'border-brand bg-brand/5': form.roles.includes(role.name) }"
          >
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
              :checked="form.roles.includes(role.name)"
              @change="toggleRole(role.name, ($event.target as HTMLInputElement).checked)"
            />
            <span>
              <span class="block text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ role.label }}</span>
              <span v-if="role.description" class="text-xs text-muted-foreground">{{ role.description }}</span>
            </span>
          </label>
        </div>
        <p v-if="error('roles')" class="mt-1 text-xs text-red-500">{{ error('roles') }}</p>
      </fieldset>

      <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-4" :class="{ 'cursor-not-allowed opacity-60': isSelf }">
        <span>
          <span class="block text-sm font-semibold text-neutral-800 dark:text-neutral-100">Active</span>
          <span class="text-xs text-muted-foreground">{{ isSelf ? 'You cannot deactivate your own account.' : 'Inactive staff cannot sign in, and deactivating signs them out everywhere.' }}</span>
        </span>
        <input id="staff-active" v-model="form.is_active" type="checkbox" :disabled="isSelf" class="h-5 w-5 accent-[var(--color-brand)]" />
      </label>
    </div>
  </AppDrawer>
</template>
