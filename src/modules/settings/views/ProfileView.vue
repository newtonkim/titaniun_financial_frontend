<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { CalendarDays, Camera, Check, Clock3, LockKeyhole, Mail, MapPin, Monitor, Pencil, Phone, ShieldCheck } from 'lucide-vue-next'
import { formatEnum } from '@/core/utils/format'
import { useForm } from '@/core/composables/useForm'
import { useAuth } from '@/modules/auth/store'
import { settingsApi } from '../api'
import { useProfileDetails } from '../composables/useProfileDetails'
import SecurityView from './SecurityView.vue'

const auth = useAuth()
const { details, saveDetails } = useProfileDetails(auth.user.value!.id)
const activeTab = ref('overview')
const status = ref('')
const photoError = ref('')
const uploadingPhoto = ref(false)
const photoInput = ref<HTMLInputElement>()
const nameInput = ref<HTMLInputElement>()
const tabPanel = ref<HTMLElement>()
const fullName = computed(() => auth.user.value?.name.trim() || 'Your profile')
const email = computed(() => auth.user.value?.email ?? '')
const role = computed(() => auth.user.value?.roles?.map(formatEnum).join(', ') || 'No role assigned')
const accountStatus = computed(() => auth.user.value?.approved_at ? 'Active' : 'Pending')
const initials = computed(() => fullName.value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join(''))
const location = computed(() => details.value.officeLocation)
const timeZone = details.value.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const timeZones = [...new Set([timeZone, 'Africa/Kampala', 'Africa/Nairobi', 'Africa/Kigali', 'Africa/Johannesburg', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'UTC'])]

function timeZoneLabel(zone: string): string {
  const offset = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'shortOffset' })
    .formatToParts().find(part => part.type === 'timeZoneName')?.value.replace('GMT', 'UTC')
  return `${zone.replaceAll('_', ' ')} (${zone === 'Africa/Kampala' ? 'EAT, ' : ''}${offset})`
}

function formatDate(value: string | null | undefined, monthOnly = false): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en-GB', {
    ...(monthOnly ? {} : { day: 'numeric' }), month: monthOnly ? 'long' : 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value))
}

const milestones = computed(() => [
  { title: 'Account created', date: auth.user.value?.created_at, description: 'Your Titanium Financial account was created.' },
  { title: 'Staff access approved', date: auth.user.value?.approved_at, description: 'Your account was approved for staff access.' },
].filter((item): item is typeof item & { date: string } => !!item.date && !Number.isNaN(new Date(item.date).getTime()))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))

const stats = [
  { label: 'Approvals this month', icon: Check, value: '—', description: 'Approval totals are not available.' },
  { label: 'Last sign-in', icon: Clock3, value: '—', description: 'Sign-in history is not available.' },
  { label: 'Active sessions', icon: Monitor, value: '—', description: 'Session details are not available.' },
  { label: 'Security score', icon: ShieldCheck, value: '— / 100', description: 'Security scoring is not available.' },
]

function savedFields() {
  return {
    name: fullName.value, email: email.value, jobTitle: details.value.jobTitle,
    phone: details.value.phone, department: details.value.department,
    timeZone: details.value.timeZone || timeZone, officeLocation: location.value,
  }
}

const form = useForm(savedFields(), async (payload) => {
  status.value = ''
  const name = payload.name.trim()
  const updatedEmail = payload.email.trim()
  if (!name) throw new Error('Please enter your full name.')
  if (!updatedEmail) throw new Error('Please enter your email address.')

  const localChanges = {
    jobTitle: payload.jobTitle.trim(), phone: payload.phone.trim(), department: payload.department.trim(),
    timeZone: payload.timeZone, officeLocation: payload.officeLocation.trim(),
  }
  const changedDetails = Object.entries(localChanges).some(([key, value]) => details.value[key as keyof typeof localChanges] !== value)
  const changedAccount = name !== fullName.value || updatedEmail !== email.value
  if (changedAccount) auth.setUser(await settingsApi.updateProfile({ name, email: updatedEmail }))
  if (changedDetails) {
    try {
      saveDetails(localChanges)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Additional details could not be saved.'
      throw new Error(changedAccount ? `Your name and email were saved. ${message}` : message)
    }
  }
  Object.assign(form.data, savedFields())
  status.value = 'Profile changes saved.'
})

async function submitProfile(): Promise<void> {
  if (!form.processing.value) await form.submit()
}

function cancelChanges(): void {
  Object.assign(form.data, savedFields())
  form.errors.value = {}
  form.message.value = null
  status.value = ''
}

async function editProfile(): Promise<void> {
  activeTab.value = 'overview'
  await nextTick()
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  if (activeTab.value !== 'overview') return
  nameInput.value?.focus({ preventScroll: true })
  nameInput.value?.scrollIntoView({ block: 'center', behavior: 'instant' })
}

async function showSecurity(): Promise<void> {
  activeTab.value = 'security'
  await nextTick()
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  if (activeTab.value !== 'security') return
  const input = tabPanel.value?.querySelector<HTMLInputElement>('input[autocomplete="current-password"]')
  input?.focus({ preventScroll: true })
  tabPanel.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
}

async function changePhoto(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || uploadingPhoto.value) return
  photoError.value = ''
  status.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    photoError.value = 'Choose a JPG, PNG, or WebP photo.'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    photoError.value = 'Choose a photo smaller than 2 MB.'
    return
  }
  uploadingPhoto.value = true
  try {
    const photo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('The photo could not be read. Please try again.'))
      reader.readAsDataURL(file)
    })
    const image = new Image()
    image.src = photo
    await image.decode()
    saveDetails({ photo })
    status.value = 'Profile photo saved on this browser.'
  } catch (error) {
    photoError.value = error instanceof Error ? error.message : 'The photo could not be saved. Please try again.'
  } finally {
    uploadingPhoto.value = false
  }
}

function removePhoto(): void {
  try {
    saveDetails({ photo: '' })
    photoError.value = ''
    status.value = 'Profile photo removed from this browser.'
  } catch (error) {
    photoError.value = error instanceof Error ? error.message : 'The photo could not be removed.'
  }
}
</script>

<template>
  <div class="profile-page">
    <header class="profile-heading">
      <nav class="profile-breadcrumb" aria-label="Profile breadcrumb">
        <RouterLink :to="{ name: 'settings.index' }">Settings</RouterLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">My profile</span>
      </nav>
      <h1>My profile</h1>
    </header>

    <section class="profile-summary profile-card" aria-label="Profile summary">
      <div class="profile-banner" aria-hidden="true">
        <span class="profile-banner__block" />
        <span class="profile-banner__accent" />
        <span class="profile-banner__circle" />
      </div>
      <div class="profile-summary__body">
        <div class="profile-photo">
          <div class="profile-avatar">
            <img v-if="details.photo" :src="details.photo" :alt="`${fullName}'s profile photo`" />
            <span v-else aria-label="Profile initials">{{ initials }}</span>
          </div>
          <button
            class="profile-photo__camera" type="button" aria-label="Change profile photo"
            title="Upload a photo · JPG, PNG or WebP, up to 2 MB · Saved on this browser"
            :disabled="uploadingPhoto" @click="photoInput?.click()"
          >
            <span v-if="uploadingPhoto" class="spinner" aria-hidden="true" />
            <Camera v-else :size="15" aria-hidden="true" />
          </button>
          <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Upload profile photo" @change="changePhoto" />
        </div>
        <div class="profile-identity">
          <div class="profile-identity__heading">
            <h2>{{ fullName }}</h2>
            <span class="profile-badge">{{ role }}</span>
            <span class="profile-badge" :class="accountStatus === 'Active' ? 'profile-badge--success' : 'profile-badge--warning'">
              <span class="profile-status-dot" aria-hidden="true" />{{ accountStatus }}
            </span>
          </div>
          <div class="profile-summary__details">
            <span><Mail :size="15" aria-hidden="true" />{{ email }}</span>
            <span><MapPin :size="15" aria-hidden="true" />{{ location || 'Location not added' }}</span>
            <span><CalendarDays :size="15" aria-hidden="true" />{{ auth.user.value?.created_at ? `Joined ${formatDate(auth.user.value.created_at, true)}` : 'Join date not available' }}</span>
          </div>
          <button v-if="details.photo" type="button" class="profile-text-button profile-photo__remove" :disabled="uploadingPhoto" @click="removePhoto">Remove photo</button>
        </div>
        <div class="profile-summary__actions">
          <button type="button" class="profile-button profile-button--outline" @click="showSecurity"><LockKeyhole :size="16" aria-hidden="true" />Reset password</button>
          <button type="button" class="profile-button profile-button--primary" @click="editProfile"><Pencil :size="16" aria-hidden="true" />Edit profile</button>
        </div>
      </div>
    </section>

    <p v-if="photoError" class="profile-notice profile-notice--error" role="alert">{{ photoError }}</p>
    <p v-if="status" class="profile-notice profile-notice--success" role="status"><Check :size="17" aria-hidden="true" />{{ status }}</p>

    <div class="profile-stats" aria-label="Account statistics">
      <section v-for="stat in stats" :key="stat.label" class="profile-stat profile-card" :aria-label="stat.label">
        <div class="profile-stat__heading"><span class="profile-stat__icon"><component :is="stat.icon" :size="17" :stroke-width="1.8" aria-hidden="true" /></span><h2>{{ stat.label }}</h2></div>
        <p class="profile-stat__value">{{ stat.value }}</p>
        <p class="profile-stat__description">{{ stat.description }}</p>
      </section>
    </div>

    <TabsRoot v-model="activeTab" class="profile-tabs">
      <TabsList class="profile-tabs__list" aria-label="Profile sections">
        <TabsTrigger value="overview" class="profile-tabs__trigger">Overview</TabsTrigger>
        <TabsTrigger value="security" class="profile-tabs__trigger">Security</TabsTrigger>
        <TabsTrigger value="activity" class="profile-tabs__trigger">Activity<span v-if="milestones.length" class="profile-tabs__count">{{ milestones.length }}</span></TabsTrigger>
        <TabsTrigger value="permissions" class="profile-tabs__trigger">Permissions</TabsTrigger>
      </TabsList>

      <div ref="tabPanel" class="profile-tabs__panels">
        <TabsContent value="overview" class="profile-overview">
          <section class="profile-personal profile-card" aria-labelledby="personal-information-title">
            <header class="profile-section-heading">
              <h2 id="personal-information-title">Personal information</h2>
              <p>Manage your personal and contact details.</p>
            </header>
            <form @submit.prevent="submitProfile">
              <p v-if="form.message.value" class="profile-notice profile-notice--error profile-form-error" role="alert">{{ form.message.value }}</p>
              <fieldset class="profile-fields" :disabled="form.processing.value">
                <legend class="profile-sr-only">Personal information</legend>
                <div class="profile-field">
                  <label for="profile-name">Full name</label>
                  <input id="profile-name" ref="nameInput" v-model="form.data.name" autocomplete="name" required maxlength="255" :aria-invalid="!!form.error('name')" :aria-describedby="form.error('name') ? 'profile-name-error' : undefined" />
                  <span v-if="form.error('name')" id="profile-name-error" class="profile-field__error">{{ form.error('name') }}</span>
                </div>
                <div class="profile-field">
                  <label for="profile-job-title">Job title</label>
                  <input id="profile-job-title" v-model="form.data.jobTitle" autocomplete="organization-title" placeholder="Add your job title" maxlength="120" />
                </div>
                <div class="profile-field">
                  <label for="profile-email">Email address</label>
                  <div class="profile-input-icon"><Mail :size="17" aria-hidden="true" /><input id="profile-email" v-model="form.data.email" type="email" autocomplete="email" required maxlength="255" :aria-invalid="!!form.error('email')" :aria-describedby="form.error('email') ? 'profile-email-error profile-email-help' : 'profile-email-help'" /></div>
                  <span v-if="form.error('email')" id="profile-email-error" class="profile-field__error">{{ form.error('email') }}</span>
                  <span id="profile-email-help" class="profile-field__hint">{{ form.data.email.trim() !== email ? 'You’ll sign in with the new address from now on.' : 'Used for sign-in and alerts.' }}</span>
                </div>
                <div class="profile-field">
                  <label for="profile-phone">Phone number</label>
                  <div class="profile-input-icon"><Phone :size="17" aria-hidden="true" /><input id="profile-phone" v-model="form.data.phone" type="tel" autocomplete="tel" placeholder="Add a phone number" maxlength="40" /></div>
                </div>
                <div class="profile-field">
                  <label for="profile-department">Department</label>
                  <input id="profile-department" v-model="form.data.department" class="profile-input--subtle" autocomplete="organization" placeholder="Add your department" maxlength="120" />
                </div>
                <div class="profile-field">
                  <label for="profile-time-zone">Time zone</label>
                  <select id="profile-time-zone" v-model="form.data.timeZone" class="profile-input--subtle"><option v-for="zone in timeZones" :key="zone" :value="zone">{{ timeZoneLabel(zone) }}</option></select>
                </div>
                <div class="profile-field profile-field--wide">
                  <label for="profile-location">Office location</label>
                  <div class="profile-input-icon"><MapPin :size="17" aria-hidden="true" /><input id="profile-location" v-model="form.data.officeLocation" autocomplete="street-address" placeholder="Add your office location" maxlength="255" /></div>
                </div>
              </fieldset>
              <footer class="profile-form-footer">
                <p>Name and email sync to your account. Other details are saved on this browser.</p>
                <div class="profile-form-actions">
                  <button type="button" class="profile-button profile-button--text" :disabled="form.processing.value" @click="cancelChanges">Cancel</button>
                  <button type="submit" class="profile-button profile-button--primary" :disabled="form.processing.value"><span v-if="form.processing.value" class="spinner" aria-hidden="true" /><Check v-else :size="17" aria-hidden="true" />{{ form.processing.value ? 'Saving…' : 'Save changes' }}</button>
                </div>
              </footer>
            </form>
          </section>

          <aside class="profile-account profile-card" aria-labelledby="account-title">
            <header class="profile-section-heading"><h2 id="account-title">Account</h2></header>
            <dl class="profile-account__rows">
              <div><dt>Status</dt><dd><span class="profile-badge" :class="accountStatus === 'Active' ? 'profile-badge--success' : 'profile-badge--warning'"><span class="profile-status-dot" aria-hidden="true" />{{ accountStatus }}</span></dd></div>
              <div><dt>Role</dt><dd><span class="profile-badge">{{ role }}</span></dd></div>
              <div><dt>Account ID</dt><dd class="profile-account__id">#{{ String(auth.user.value?.id).padStart(5, '0') }}</dd></div>
              <div><dt>Two-factor</dt><dd class="profile-account__unavailable">Not available</dd></div>
              <div><dt>Password</dt><dd><button type="button" class="profile-text-button" @click="showSecurity">Change password</button></dd></div>
              <div><dt>Member since</dt><dd>{{ formatDate(auth.user.value?.created_at) }}</dd></div>
            </dl>
          </aside>
        </TabsContent>

        <TabsContent value="security" class="profile-security">
          <SecurityView />
        </TabsContent>

        <TabsContent value="activity" class="profile-card profile-activity" aria-labelledby="profile-activity-title">
          <header class="profile-section-heading"><h2 id="profile-activity-title">Account activity</h2><p>Key milestones for your account. A detailed activity log is not available yet.</p></header>
          <ol v-if="milestones.length" class="profile-activity__list">
            <li v-for="item in milestones" :key="item.title"><span class="profile-stat__icon"><CalendarDays :size="18" aria-hidden="true" /></span><div><h3>{{ item.title }}</h3><p>{{ item.description }}</p></div><time :datetime="item.date">{{ formatDate(item.date) }}</time></li>
          </ol>
          <p v-else class="profile-empty">No account activity is available.</p>
        </TabsContent>

        <TabsContent value="permissions" class="profile-card profile-permissions" aria-labelledby="profile-permissions-title">
          <header class="profile-section-heading"><h2 id="profile-permissions-title">Permissions</h2><p>Your account access is managed by an administrator.</p></header>
          <dl class="profile-account__rows"><div><dt>Current role</dt><dd><span class="profile-badge">{{ role }}</span></dd></div><div><dt>Staff access</dt><dd>{{ auth.user.value?.approved_at ? 'Approved' : 'Awaiting approval' }}</dd></div></dl>
          <div class="profile-permissions__note">
            <h3>Granted permissions</h3>
            <ul v-if="auth.user.value?.permissions?.length" class="profile-permission-list"><li v-for="permission in auth.user.value.permissions" :key="permission">{{ formatEnum(permission.replaceAll('.', ' · ')) }}</li></ul>
            <p v-else>No business permissions have been assigned. Contact your administrator to arrange access.</p>
            <RouterLink v-if="auth.can('access.manage')" :to="{ name: 'settings.roles' }" class="profile-link">Manage roles & permissions</RouterLink>
            <p v-else>Contact your administrator to review or change your access.</p>
          </div>
        </TabsContent>
      </div>
    </TabsRoot>
  </div>
</template>

<style scoped>
.profile-page {
  --profile-bg: light-dark(#f7f6f2, #111113);
  --profile-surface: var(--surface);
  --profile-text: light-dark(#202023, #ededf0);
  --profile-muted: light-dark(#66666c, #b0b0b8);
  --profile-border: light-dark(#dedbd3, #35353b);
  --profile-input-border: light-dark(#929297, #707078);
  --profile-accent-solid: #141416;
  --profile-accent: light-dark(var(--profile-accent-solid), #e6e6e9);
  --profile-accent-hover: #29292d;
  --profile-accent-soft: light-dark(#ededf0, #2b2b30);
  --profile-success: var(--profile-accent);
  flex: 1;
  container: profile / inline-size;
  min-width: 0;
  padding: 36px clamp(20px, 3.1vw, 40px) 82px;
  background: var(--profile-bg);
  color: var(--profile-text);
  font-size: 15px;
  line-height: 1.45;
}
.profile-page h1, .profile-page h2, .profile-page h3, .profile-page p { margin: 0; }
.profile-page h2 { color: var(--profile-text); font-size: 18px; font-weight: 500; letter-spacing: -0.35px; line-height: 1.4; text-transform: none; }
.profile-page button { cursor: pointer; }
.profile-page button:disabled { cursor: wait; opacity: 0.6; }
.profile-page :focus-visible { outline: 2px solid var(--profile-accent); outline-offset: 4px; }
.profile-breadcrumb { display: flex; align-items: center; gap: 11px; margin-bottom: 5px; font-size: 14px; }
.profile-breadcrumb a, .profile-breadcrumb > span:nth-child(2) { color: var(--profile-muted); }
.profile-breadcrumb a:hover { color: var(--profile-accent); text-decoration: underline; }
.profile-heading h1 { color: var(--profile-text); font-size: 23px; font-weight: 600; letter-spacing: -0.5px; }
.profile-heading { margin-bottom: 26px; }
.profile-card { overflow: hidden; border: 1px solid var(--profile-border); border-radius: 18px; background: var(--profile-surface); box-shadow: 0 1px 2px rgb(20 20 22 / 7%); }
.profile-banner { position: relative; height: 125px; overflow: hidden; background: var(--profile-accent-solid); }
.profile-banner > span { position: absolute; display: block; }
.profile-banner__block { right: 20.5%; bottom: 0; width: 98px; height: 71px; border-radius: 20px 20px 0 0; background: #0c0c0e; }
.profile-banner__accent { top: 0; right: 6.5%; width: 134px; height: 81px; border-radius: 0 0 19px 19px; background: #c78315; }
.profile-banner__circle { right: -17px; bottom: -10px; width: 71px; height: 71px; border-radius: 50%; background: #ededf0; }
.profile-summary__body { display: grid; grid-template-columns: 116px minmax(0, 1fr) auto; align-items: start; column-gap: 24px; padding: 0 27px 27px; }
.profile-photo { position: relative; width: 116px; margin-top: -16px; }
.profile-avatar { display: grid; place-items: center; width: 116px; height: 116px; overflow: hidden; border: 5px solid var(--profile-surface); border-radius: 50%; background: var(--profile-accent-soft); color: var(--profile-accent); font-size: 36px; font-weight: 600; letter-spacing: -1px; }
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
.profile-photo__camera { position: absolute; right: -1px; bottom: 7px; display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 2px solid var(--profile-surface); border-radius: 50%; background: #202023; color: #fff; }
.profile-photo__camera:hover { background: var(--profile-accent-solid); }
.profile-identity { min-width: 0; padding-top: 0; }
.profile-identity__heading { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 13px; }
.profile-identity__heading h2 { min-width: 0; overflow-wrap: anywhere; font-size: 31px; font-weight: 600; letter-spacing: -1.1px; line-height: 1.4; }
.profile-badge { display: inline-flex; align-items: center; gap: 6px; flex: none; padding: 3px 9px; border-radius: 6px; background: var(--profile-accent-soft); color: var(--profile-accent); font-size: 13px; font-weight: 500; line-height: 1.45; }
.profile-badge--success { background: var(--profile-accent-soft); color: var(--profile-success); }
.profile-badge--warning { background: light-dark(#fcf0dc, #43331b); color: light-dark(#955600, #efc37a); }
.profile-status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.profile-summary__details { display: flex; align-items: center; flex-wrap: wrap; gap: 9px 26px; margin-top: 7px; color: var(--profile-muted); font-size: 14px; }
.profile-summary__details > span { display: flex; align-items: center; gap: 8px; min-width: 0; overflow-wrap: anywhere; }
.profile-summary__details svg { flex: none; }
.profile-summary__details > span:last-child { flex-basis: 100%; }
.profile-summary__actions { display: flex; align-self: end; flex-wrap: wrap; justify-content: flex-end; gap: 9px; padding-top: 58px; }
.profile-button { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 43px; padding: 9px 18px; border: 1px solid transparent; border-radius: 11px; font-weight: 500; line-height: 1.4; white-space: nowrap; transition: background-color 150ms ease, border-color 150ms ease; }
.profile-button svg { flex: none; }
.profile-button--primary { border-color: var(--profile-accent-solid); background: var(--profile-accent-solid); color: #fff; }
.profile-button--primary:not(:disabled):hover { border-color: var(--profile-accent-hover); background: var(--profile-accent-hover); }
.profile-button--outline { border-color: var(--profile-input-border); background: var(--profile-surface); color: var(--profile-text); }
.profile-button--outline:hover, .profile-button--text:hover { background: var(--profile-accent-soft); }
.profile-button--text { background: transparent; color: var(--profile-text); }
.profile-text-button { padding: 0; border: 0; background: transparent; color: var(--profile-accent); font: inherit; text-decoration: underline; text-underline-offset: 3px; }
.profile-photo__remove { margin-top: 6px; font-size: 12px; }
.profile-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; margin: 26px 0 25px; }
.profile-stat { min-width: 0; min-height: 147px; padding: 19px 18px 16px; }
.profile-stat__heading { display: flex; align-items: center; gap: 9px; }
.profile-stat__heading h2 { color: var(--profile-muted); font-size: 14px; letter-spacing: -0.15px; font-weight: 400; }
.profile-stat__icon { display: inline-grid; flex: none; place-items: center; width: 32px; height: 32px; border-radius: 7px; background: var(--profile-accent-soft); color: var(--profile-accent); }
.profile-stat .profile-stat__value { margin: 8px 0 10px; font-size: 25px; font-weight: 600; line-height: 1.2; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
.profile-stat .profile-stat__description { color: var(--profile-muted); font-size: 13px; line-height: 1.4; }
.profile-tabs__list { display: flex; gap: 5px; overflow-x: auto; border-bottom: 1px solid var(--profile-border); }
.profile-tabs__trigger { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: none; min-height: 48px; padding: 10px 14px 13px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--profile-muted); font-size: 15px; font-weight: 500; }
.profile-tabs__trigger:hover { color: var(--profile-accent); }
.profile-tabs__trigger[data-state='active'] { border-bottom-color: var(--profile-accent); color: var(--profile-accent); }
.profile-tabs__count { display: grid; place-items: center; min-width: 20px; height: 20px; padding-inline: 5px; border-radius: 50%; background: light-dark(#eeeee8, #303035); color: var(--profile-muted); font-size: 12px; }
.profile-tabs__panels { margin-top: 27px; scroll-margin-top: 90px; }
.profile-overview { display: grid; grid-template-columns: minmax(0, 2fr) minmax(290px, 1fr); align-items: start; gap: 27px; }
.profile-section-heading { padding: 19px 27px; border-bottom: 1px solid var(--profile-border); }
.profile-section-heading p { margin-top: 4px; color: var(--profile-muted); font-size: 14px; }
.profile-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px 18px; min-width: 0; margin: 0; padding: 26px 27px; border: 0; }
.profile-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.profile-field--wide { grid-column: 1 / -1; }
.profile-field label { color: var(--profile-text); font-size: 14px; font-weight: 500; }
.profile-field input, .profile-field select { width: 100%; height: 45px; padding: 10px 13px; border: 1px solid var(--profile-input-border); border-radius: 11px; background: var(--profile-surface); color: var(--profile-text); font-size: 15px; line-height: 1.4; }
.profile-field input::placeholder { color: var(--profile-muted); opacity: 0.85; }
.profile-field input:hover, .profile-field select:hover { border-color: var(--profile-accent); }
.profile-field input:focus, .profile-field select:focus { outline: none; border-color: var(--profile-accent); box-shadow: 0 0 0 3px light-dark(rgb(20 20 22 / 12%), rgb(230 230 233 / 16%)); }
.profile-field input[aria-invalid='true'] { border-color: var(--danger); }
.profile-field .profile-input--subtle { background: var(--profile-bg); color: var(--profile-muted); }
.profile-input-icon { position: relative; }
.profile-input-icon > svg { position: absolute; top: 14px; left: 14px; pointer-events: none; color: var(--profile-muted); }
.profile-input-icon input { padding-left: 40px; }
.profile-field__hint { color: var(--profile-muted); font-size: 13px; line-height: 1.45; }
.profile-field__error { color: var(--danger); font-size: 13px; }
.profile-form-footer { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 12px 20px; padding: 18px 27px; border-top: 1px solid var(--profile-border); }
.profile-form-footer > p { flex: 1 1 180px; color: var(--profile-muted); font-size: 11px; line-height: 1.5; }
.profile-form-actions { display: flex; gap: 8px; }
.profile-account__rows { margin: 0; padding: 15px 27px 12px; }
.profile-account__rows > div { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 52px; padding-block: 12px; border-bottom: 1px solid var(--profile-border); }
.profile-account__rows > div:last-child { border-bottom: 0; }
.profile-account__rows dt { flex: none; color: var(--profile-muted); }
.profile-account__rows dd { min-width: 0; margin: 0; text-align: right; overflow-wrap: anywhere; font-size: 14px; font-weight: 500; }
.profile-account__rows .profile-account__id { font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 600; }
.profile-account__rows .profile-account__unavailable { color: var(--profile-muted); font-size: 13px; font-weight: 400; }
.profile-notice { display: flex; align-items: center; gap: 8px; margin-top: 16px !important; padding: 12px 16px; border: 1px solid; border-radius: 10px; font-size: 14px; }
.profile-notice svg { flex: none; }
.profile-notice--success { border-color: var(--profile-border); background: var(--profile-accent-soft); color: var(--profile-success); }
.profile-notice--error { border-color: oklch(from var(--danger) l c h / 0.35); background: oklch(from var(--danger) l c h / 0.07); color: var(--danger); }
.profile-form-error { margin: 20px 27px 0 !important; }
.profile-activity__list { display: flex; flex-direction: column; gap: 22px; margin: 0; padding: 27px; list-style: none; }
.profile-activity__list li { display: flex; align-items: flex-start; gap: 14px; }
.profile-activity__list h3 { font-size: 15px; font-weight: 500; }
.profile-activity__list p, .profile-activity__list time { margin-top: 4px; color: var(--profile-muted); font-size: 13px; }
.profile-activity__list time { margin-left: auto; white-space: nowrap; }
.profile-empty, .profile-permissions__note { padding: 27px; color: var(--profile-muted); font-size: 14px; }
.profile-permissions { max-width: 710px; }
.profile-security :deep(.settings) { max-width: 710px; }
.profile-security :deep(.settings__header) { gap: 12px; }
.profile-security :deep(.settings__title) { color: var(--profile-text); font-size: 22px; }
.profile-security :deep(.settings__lede), .profile-security :deep(.settings__panel) { color: var(--profile-text); }
.profile-security :deep(.settings__icon) { background: var(--profile-accent-soft); color: var(--profile-accent); }
.profile-security :deep(.settings__panel) { border-color: var(--profile-border); border-radius: 18px; }
.profile-security :deep(.settings__panel input) { border-color: var(--profile-input-border); }
.profile-security :deep(.btn--primary) { border-color: var(--profile-accent-solid); background: var(--profile-accent-solid); color: #fff; }
.profile-security :deep(.btn--primary:hover) { background: var(--profile-accent-hover); }
.profile-security :deep(.saved) { color: var(--profile-success); }
.profile-security :deep(.form-actions) { flex-wrap: wrap; }
.profile-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; padding: 0; clip-path: inset(50%); white-space: nowrap; }

@container profile (max-width: 900px) {
  .profile-summary__body { grid-template-columns: 105px minmax(0, 1fr); column-gap: 18px; }
  .profile-summary__actions { grid-column: 2; padding-top: 18px; }
  .profile-photo, .profile-avatar { width: 105px; }
  .profile-avatar { height: 105px; }
  .profile-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; }
  .profile-overview { grid-template-columns: minmax(0, 1fr); }
  .profile-identity__heading h2 { font-size: 28px; }
}
@media (max-width: 560px) {
  .profile-page { padding: 24px 16px 40px; }
  .profile-heading { margin-bottom: 22px; }
  .profile-banner { height: 105px; }
  .profile-banner__block { right: 42%; width: 70px; height: 56px; }
  .profile-banner__accent { right: 13%; width: 90px; height: 64px; }
  .profile-summary__body { grid-template-columns: minmax(0, 1fr); padding: 0 20px 22px; }
  .profile-photo { margin-top: -28px; }
  .profile-photo, .profile-avatar { width: 92px; }
  .profile-avatar { height: 92px; font-size: 29px; }
  .profile-photo__camera { right: -2px; bottom: 3px; }
  .profile-identity { padding-top: 9px; }
  .profile-identity__heading { gap: 7px 10px; }
  .profile-identity__heading h2 { flex-basis: 100%; font-size: 27px; }
  .profile-summary__details { gap: 10px; margin-top: 14px; font-size: 13px; }
  .profile-summary__details > span { flex-basis: 100%; }
  .profile-summary__actions { grid-column: 1; justify-content: flex-start; gap: 8px; padding-top: 20px; }
  .profile-summary__actions .profile-button { flex: 1; padding-inline: 10px; font-size: 13px; }
  .profile-stats { gap: 12px; margin-block: 20px; }
  .profile-stat { min-height: 156px; padding: 14px 12px; border-radius: 15px; }
  .profile-stat__heading { align-items: flex-start; gap: 7px; }
  .profile-stat__heading h2 { align-self: center; font-size: 12px; }
  .profile-stat__icon { width: 28px; height: 28px; border-radius: 6px; }
  .profile-stat .profile-stat__value { margin-top: 12px; font-size: 24px; }
  .profile-stat .profile-stat__description { font-size: 12px; }
  .profile-tabs__list { gap: 0; }
  .profile-tabs__trigger { padding-inline: 11px; font-size: 14px; }
  .profile-tabs__panels { margin-top: 22px; }
  .profile-overview { gap: 22px; }
  .profile-section-heading { padding: 19px 20px; }
  .profile-fields { grid-template-columns: minmax(0, 1fr); gap: 18px; padding: 22px 20px; }
  .profile-form-footer { padding: 17px 20px; }
  .profile-form-footer > p { flex-basis: 100%; font-size: 12px; }
  .profile-form-actions { width: 100%; justify-content: flex-end; }
  .profile-account__rows { padding-inline: 20px; }
  .profile-activity__list { padding: 22px 20px; }
  .profile-activity__list li { flex-wrap: wrap; }
  .profile-activity__list li > div { flex: 1; }
  .profile-activity__list time { flex-basis: 100%; margin-left: 42px; }
  .profile-form-error { margin-inline: 20px !important; }
}
</style>

<style scoped>
.profile-permission-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 22px; padding:0; margin:18px 0; list-style:none; }
.profile-permission-list li { overflow-wrap:anywhere; font-size:12px; }
@media(max-width:560px) { .profile-permission-list { grid-template-columns:1fr; } }
</style>
