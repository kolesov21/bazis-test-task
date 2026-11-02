import type { Note } from '../../app/domain/notes'
import type { StoragePort } from '../../app/domain/storage'

export function note(id = 'one'): Note {
  return {
    id,
    title: 'План',
    todos: [{ id: 'a', text: 'Первая задача', done: false }],
    updatedAt: '2026-11-02T10:00:00.000Z',
  }
}
export class MemoryStorage implements StoragePort {
  data = new Map<string, string>()
  fail = false
  get length() {
    return this.data.size
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null
  }
  getItem(key: string) {
    if (this.fail) throw new Error('Unavailable')
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.fail) throw new Error('Quota exceeded')
    this.data.set(key, value)
  }
  removeItem(key: string) {
    if (this.fail) throw new Error('Unavailable')
    this.data.delete(key)
  }
}
