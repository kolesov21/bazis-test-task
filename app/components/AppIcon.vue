<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  name:
    | 'note'
    | 'plus'
    | 'trash'
    | 'arrow'
    | 'undo'
    | 'redo'
    | 'grid'
    | 'check'
    | 'close'
    | 'menu'
    | 'clock'
}>()
const paths = {
  note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8M8 17h5',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  arrow: 'm12 5-7 7 7 7M5 12h14',
  undo: 'M3 10h11a6 6 0 0 1 0 12M3 10l6-6M3 10l6 6',
  redo: 'M21 10H10a6 6 0 0 0 0 12M21 10l-6-6M21 10l-6 6',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
}
</script>

<style scoped lang="scss">
:where(.icon) {
  display: inline-block;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
