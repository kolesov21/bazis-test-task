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

<style scoped lang="scss">
@use '~/assets/styles/tokens' as *;

.dialog {
  width: min(440px, calc(100% - 32px));
  padding: 28px;
  color: $ink;
  border: 1px solid $line;
  border-radius: 10px;
  box-shadow: 0 16px 70px #00000026;
  &::backdrop {
    background: #18181850;
  }
  h2 {
    font-size: 20px;
    line-height: 1.3;
    margin-bottom: 10px;
    letter-spacing: -0.4px;
  }
  p {
    font-size: 13px;
    line-height: 1.7;
    color: #6a6863;
    overflow-wrap: anywhere;
  }
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
@media (max-width: 700px) {
  .dialog {
    padding: 22px;
  }
  .dialog-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .dialog[open] {
    animation: dialog-appear 160ms ease-out;
  }
  @keyframes dialog-appear {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

.button-danger {
  color: #fff;
  background: #b13e36;
  border-color: #b13e36;
  &:hover:not(:disabled) {
    background: #993129;
  }
}
</style>
