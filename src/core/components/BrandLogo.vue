<script setup lang="ts">
/**
 * Titanium Financial mark: a red outer crescent with a blue band, a blue-to-red inner
 * crescent, and a stacked serif "T" and "i" in the centre.
 */
withDefaults(defineProps<{ size?: number; plate?: boolean }>(), { size: 56, plate: true })

const uid = `logo-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" role="img" aria-label="Titanium Financial logo">
    <defs>
      <linearGradient :id="`${uid}-outer`" gradientUnits="userSpaceOnUse" x1="0" y1="12" x2="0" y2="88">
        <stop offset="0" stop-color="#c62a30" />
        <stop offset="0.2" stop-color="#c62a30" />
        <stop offset="0.36" stop-color="#5a4a6e" />
        <stop offset="0.54" stop-color="#2f8ad8" />
        <stop offset="0.72" stop-color="#5a4a6e" />
        <stop offset="0.86" stop-color="#c62a30" />
        <stop offset="1" stop-color="#c62a30" />
      </linearGradient>
      <linearGradient :id="`${uid}-inner`" gradientUnits="userSpaceOnUse" x1="38" y1="0" x2="88" y2="0">
        <stop offset="0" stop-color="#2f8ad8" />
        <stop offset="0.3" stop-color="#1f2a5c" />
        <stop offset="0.6" stop-color="#c62a30" />
        <stop offset="1" stop-color="#c62a30" />
      </linearGradient>
    </defs>

    <circle v-if="plate" cx="50" cy="50" r="49.5" fill="#fff" />

    <!-- Outer crescent: open on the right, thickest on the left -->
    <path :fill="`url(#${uid}-outer)`" d="M75.8 13.1 A45 45 0 1 0 75.8 86.9 A42 42 0 1 1 75.8 13.1 Z" />
    <!-- Inner crescent: open on the left, thickest on the right -->
    <path :fill="`url(#${uid}-inner)`" d="M38.1 19 A34 34 0 1 1 38.1 79 A31.5 31.5 0 1 0 38.1 19 Z" />

    <!-- Stacked serif T and i -->
    <g fill="#c62a30">
      <path
        d="M38.5 29H67V38.5L65.6 37.6Q64.4 33.6 60.2 33.2H56.2V40.6Q55.6 44.2 52.6 44.6Q49.6 44.2 49 40.6V33.2H45Q40.8 33.6 39.8 37.6L38.5 38.5Z"
      />
      <ellipse cx="52.6" cy="49.4" rx="3.5" ry="3.9" />
      <path d="M52.6 54.4Q55.8 54.8 55.9 58.8V66.4L59.6 67.3V68.8H45.6V67.3L49.3 66.4V58.8Q49.4 54.8 52.6 54.4Z" />
    </g>
  </svg>
</template>
