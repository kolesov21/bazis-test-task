<script setup lang="ts">
const { activeDialog, finish } = useConfirm()
const dialog = useTemplateRef('dialog')
const cancelButton = useTemplateRef('cancelButton')
let previousFocus: HTMLElement | null = null

watch(activeDialog, async (value) => {
  if (value) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    dialog.value?.showModal()
    cancelButton.value?.focus()
  } else {
    dialog.value?.close()
    previousFocus?.focus()
  }
})

function trapFocus(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return
  const buttons = dialog.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
  const first = buttons?.[0]
  const last = buttons?.[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    aria-labelledby="dialog-title"
    aria-describedby="dialog-description"
    @cancel.prevent="finish(null)"
    @keydown="trapFocus"
  >
    <template v-if="activeDialog">
      <div class="dialog-symbol" :class="{ danger: activeDialog.danger }">
        <AppIcon :name="activeDialog.danger ? 'trash' : 'note'" />
      </div>
      <h2 id="dialog-title">{{ activeDialog.title }}</h2>
      <p id="dialog-description">{{ activeDialog.description }}</p>
      <div class="dialog-actions">
        <button ref="cancelButton" class="button" @click="finish(false)">
          {{ activeDialog.cancel || 'Оставить' }}
        </button>
        <button
          class="button"
          :class="activeDialog.danger ? 'button-danger' : 'button-primary'"
          @click="finish(true)"
        >
          {{ activeDialog.confirm }}
        </button>
      </div>
    </template>
  </dialog>
</template>
