import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { copyNote, validateNote, type Note } from '../domain/notes'
import {
  readAll,
  writeRecord,
  withNoteLock,
  storageMessage,
  type StoredNote,
  type StoragePort,
} from '../domain/storage'

export const useNotesStore = defineStore('notes', () => {
  const records = ref<Record<string, StoredNote>>({})
  const error = ref('')
  const ready = ref(false)
  let storage: StoragePort | undefined
  const notes = computed(() =>
    Object.values(records.value)
      .flatMap((record) => (record.note ? [record.note] : []))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )

  function sync(): boolean {
    if (!storage) return false
    try {
      records.value = readAll(storage)
      error.value = ''
      return true
    } catch (cause) {
      error.value = storageMessage(cause)
      return false
    }
  }

  function init(port: StoragePort): void {
    storage = port
    sync()
    ready.value = true
  }

  async function save(note: Note, expected: string | null): Promise<StoredNote | null> {
    const validation = validateNote(note)
    if (validation) {
      error.value = validation
      return null
    }
    try {
      return await withNoteLock(note.id, () => {
        if (!storage || !sync()) return null
        const saved = copyNote(note)
        saved.title = saved.title.trim()
        saved.todos = saved.todos.map((todo) => ({ ...todo, text: todo.text.trim() }))
        saved.updatedAt = new Date().toISOString()
        const record = writeRecord(storage, note.id, saved, expected)
        records.value[note.id] = record
        error.value = ''
        return record
      })
    } catch (cause) {
      error.value = storageMessage(cause)
      syncAfterFailure()
      return null
    }
  }

  async function remove(id: string, expected: string): Promise<boolean> {
    try {
      return await withNoteLock(id, () => {
        if (!storage || !sync()) return false
        records.value[id] = writeRecord(storage, id, null, expected)
        error.value = ''
        return true
      })
    } catch (cause) {
      error.value = storageMessage(cause)
      syncAfterFailure()
      return false
    }
  }

  function syncAfterFailure(): void {
    const message = error.value
    sync()
    error.value = message
  }

  return { records, notes, error, ready, init, sync, save, remove }
})
