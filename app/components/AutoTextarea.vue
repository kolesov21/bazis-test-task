<template>
  <textarea class="auto-textarea" ref="field" :value="value" rows="1" />
</template>

<script setup lang="ts">
const props = defineProps<{ value: string }>()
const field = useTemplateRef('field')
let observer: ResizeObserver | undefined
let resizeFrame = 0

function resize(): void {
  const element = field.value
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

watch(() => props.value, resize, { flush: 'post' })
onMounted(() => {
  const element = field.value
  if (!element) return
  resize()
  let width = element.clientWidth
  observer = new ResizeObserver(() => {
    if (element.clientWidth === width) return
    width = element.clientWidth
    // Изменение высоты вне цикла ResizeObserver не вызывает повторных уведомлений WebKit.
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(resize)
  })
  observer.observe(element)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(resizeFrame)
})
</script>

<style scoped lang="scss">
@use '~/assets/styles/tokens' as *;

.auto-textarea {
  resize: none;
  overflow: hidden;
  overflow-wrap: anywhere;
}
:where(.auto-textarea):focus-visible {
  outline: none;
  box-shadow: inset 0 -2px $muted;
}
@media (forced-colors: active) {
  :where(.auto-textarea):focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
}
[aria-invalid='true'] {
  box-shadow: inset 0 -1px #b13e36;
}

@media (prefers-reduced-motion: no-preference) {
  .auto-textarea {
    transition:
      box-shadow 140ms ease,
      color 140ms ease;
  }
}
</style>
