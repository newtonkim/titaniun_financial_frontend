<script setup lang="ts">
export type IconName =
  | 'dashboard' | 'members' | 'wallet' | 'loan' | 'shares' | 'receipt' | 'ledger' | 'journal' | 'report'
  | 'layers' | 'tag' | 'logout' | 'search' | 'arrow-left' | 'arrow-right' | 'chevron-right' | 'chevron-down'
  | 'plus' | 'refresh' | 'more' | 'arrow-in' | 'arrow-out' | 'menu' | 'close' | 'clock' | 'user' | 'lock'
  | 'settings' | 'sun' | 'moon' | 'sidebar' | 'home'

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'dashboard'"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></template>
    <template v-else-if="name === 'members'"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.7 2.6 3 5.2" /></template>
    <template v-else-if="name === 'wallet'"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="3.5" y="7.5" width="17" height="12" rx="2.5" /><path d="M16 13.5h.01" /></template>
    <template v-else-if="name === 'loan'"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v5M18 9.5v5" /></template>
    <template v-else-if="name === 'shares'"><path d="M12 3.5v8.5h8.5" /><path d="M20.4 13.4A8.5 8.5 0 1 1 10.6 3.6" /></template>
    <template v-else-if="name === 'receipt'"><path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5z" /><path d="M9 8h6M9 11.5h6M9 15h3" /></template>
    <template v-else-if="name === 'ledger'"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7.5h6M9 11h6" /></template>
    <template v-else-if="name === 'journal'"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></template>
    <template v-else-if="name === 'report'"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></template>
    <template v-else-if="name === 'layers'"><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></template>
    <template v-else-if="name === 'tag'"><path d="M3.5 12.1V4.5a1 1 0 0 1 1-1h7.6l8.4 8.4-8.6 8.6z" /><circle cx="8" cy="8" r="1.2" /></template>
    <template v-else-if="name === 'logout'"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9.5 16.5 5 12l4.5-4.5M5 12h11" /></template>
    <template v-else-if="name === 'search'"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></template>
    <template v-else-if="name === 'arrow-left'"><path d="M19 12H5M11 6l-6 6 6 6" /></template>
    <template v-else-if="name === 'arrow-right'"><path d="M5 12h14M13 6l6 6-6 6" /></template>
    <template v-else-if="name === 'chevron-right'"><path d="m9 6 6 6-6 6" /></template>
    <template v-else-if="name === 'chevron-down'"><path d="m6 9 6 6 6-6" /></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14" /></template>
    <template v-else-if="name === 'refresh'"><path d="M20 11.5A8 8 0 1 0 17.7 17" /><path d="M20 5v6.5h-6.5" /></template>
    <template v-else-if="name === 'more'"><circle cx="5.5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18.5" cy="12" r="1" /></template>
    <template v-else-if="name === 'arrow-in'"><path d="M17 7 7 17M15 17H7V9" /></template>
    <template v-else-if="name === 'arrow-out'"><path d="M7 17 17 7M9 7h8v8" /></template>
    <template v-else-if="name === 'menu'"><path d="M4 7h16M4 12h16M4 17h16" /></template>
    <template v-else-if="name === 'close'"><path d="M6 6l12 12M18 6 6 18" /></template>
    <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6" /></template>
    <template v-else-if="name === 'lock'"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2" /></template>
    <template v-else-if="name === 'settings'"><path d="M10.3 3.6a1.7 1.7 0 0 1 3.4 0l.2.9a1.7 1.7 0 0 0 2.5 1l.8-.4a1.7 1.7 0 0 1 2.3 2.4l-.5.8a1.7 1.7 0 0 0 1 2.5l.9.2a1.7 1.7 0 0 1 0 3.4l-.9.2a1.7 1.7 0 0 0-1 2.5l.5.8a1.7 1.7 0 0 1-2.3 2.4l-.8-.4a1.7 1.7 0 0 0-2.5 1l-.2.9a1.7 1.7 0 0 1-3.4 0l-.2-.9a1.7 1.7 0 0 0-2.5-1l-.8.4a1.7 1.7 0 0 1-2.3-2.4l.5-.8a1.7 1.7 0 0 0-1-2.5l-.9-.2a1.7 1.7 0 0 1 0-3.4l.9-.2a1.7 1.7 0 0 0 1-2.5l-.5-.8A1.7 1.7 0 0 1 6.5 5.1l.8.4a1.7 1.7 0 0 0 2.5-1z" /><circle cx="12" cy="12" r="3" /></template>
    <template v-else-if="name === 'sun'"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></template>
    <template v-else-if="name === 'moon'"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></template>
    <template v-else-if="name === 'sidebar'"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9.5 4.5v15" /></template>
    <template v-else-if="name === 'home'"><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z" /></template>
    <template v-else-if="name === 'clock'"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></template>
  </svg>
</template>
