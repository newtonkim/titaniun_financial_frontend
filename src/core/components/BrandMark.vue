<script setup lang="ts">
/** Titanium's periodic-table cell: atomic number 22, symbol Ti, standard atomic weight 47.867. */
withDefaults(defineProps<{ size?: number }>(), { size: 44 })
</script>

<template>
  <span class="mark" :style="{ '--size': `${size}px` }" aria-hidden="true">
    <span class="mark__number">22</span>
    <span class="mark__symbol">Ti</span>
    <span class="mark__weight">47.867</span>
  </span>
</template>

<style scoped>
.mark {
  --size: 44px;
  display: inline-grid;
  grid-template-rows: auto 1fr auto;
  width: var(--size);
  height: var(--size);
  padding: calc(var(--size) * 0.08) calc(var(--size) * 0.1);
  border: 1.5px solid currentColor;
  border-radius: calc(var(--size) * 0.12);
  line-height: 1;
  flex: none;
}
.mark__number,
.mark__weight {
  font-size: calc(var(--size) * 0.17);
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}
.mark__symbol {
  align-self: center;
  justify-self: center;
  font-size: calc(var(--size) * 0.42);
  font-weight: 600;
  letter-spacing: -0.02em;
}
.mark__weight {
  justify-self: end;
}
</style>
