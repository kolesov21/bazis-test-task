import { NOTE_PREFIX, DELETED_PREFIX, storageMessage } from '../domain/storage'

export default defineNuxtPlugin(() => {
  const store = useNotesStore()
  try {
    store.init(window.localStorage)
  } catch (error) {
    store.error = storageMessage(error)
    store.ready = true
  }
  const sync = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key.startsWith(NOTE_PREFIX) ||
      event.key.startsWith(DELETED_PREFIX)
    )
      store.sync()
  }
  window.addEventListener('storage', sync)
  if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener('storage', sync))
})
