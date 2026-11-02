import { shallowRef } from 'vue'

interface DialogOptions {
  title: string
  description: string
  confirm: string
  cancel?: string
  danger?: boolean
}

const activeDialog = shallowRef<DialogOptions | null>(null)
let resolveDialog: ((result: boolean | null) => void) | undefined

export function useConfirm() {
  function ask(options: DialogOptions): Promise<boolean | null> {
    resolveDialog?.(null)
    activeDialog.value = options
    return new Promise((resolve) => {
      resolveDialog = resolve
    })
  }
  function finish(result: boolean | null): void {
    const resolve = resolveDialog
    resolveDialog = undefined
    activeDialog.value = null
    resolve?.(result)
  }
  return { activeDialog, ask, finish }
}
