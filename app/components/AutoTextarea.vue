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

<template>
  <textarea ref="field" :value="value" rows="1" />
</template>
