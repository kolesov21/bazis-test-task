import { isNote, type Note } from './notes'

export const NOTE_PREFIX = 'bazis:note:'
export const DELETED_PREFIX = 'bazis:deleted:'
export const DRAFT_PREFIX = 'bazis:draft:'
export interface StoredNote {
  version: 1
  revision: string
  note: Note | null
}
export interface Draft {
  version: 1
  note: Note
  baseRevision: string | null
  savedAt: string
}
export type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

export class StorageError extends Error {}
export class ConflictError extends Error {}

export function readRecord(storage: StoragePort, id: string): StoredNote | null {
  const deletion = storage.getItem(DELETED_PREFIX + id)
  const raw = deletion ?? storage.getItem(NOTE_PREFIX + id)
  if (raw === null) return null
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new StorageError('Некорректные данные заметки.')
  const record = value as Record<string, unknown>
  if (
    record.version !== 1 ||
    typeof record.revision !== 'string' ||
    !record.revision ||
    (deletion !== null && record.note !== null) ||
    (record.note !== null && (!isNote(record.note) || record.note.id !== id))
  ) {
    throw new StorageError(
      'Версия или формат сохранённых заметок не поддерживается. Данные не изменены.',
    )
  }
  return record as unknown as StoredNote
}

export function readAll(storage: StoragePort): Record<string, StoredNote> {
  const records: Record<string, StoredNote> = Object.create(null) as Record<string, StoredNote>
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (!key) continue
    const prefix = key.startsWith(NOTE_PREFIX)
      ? NOTE_PREFIX
      : key.startsWith(DELETED_PREFIX)
        ? DELETED_PREFIX
        : null
    if (!prefix) continue
    const id = key.slice(prefix.length)
    const record = readRecord(storage, id)
    if (record) records[id] = record
  }
  return records
}

export function writeRecord(
  storage: StoragePort,
  id: string,
  note: Note | null,
  expected: string | null,
): StoredNote {
  const current = readRecord(storage, id)
  if ((current?.revision ?? null) !== expected) {
    throw new ConflictError(
      'Заметка изменилась в другой вкладке. Ваши изменения остались в редакторе.',
    )
  }
  const record: StoredNote = { version: 1, revision: crypto.randomUUID(), note }
  // Отдельный маркер удаления защищает от поздних записей из устаревшей вкладки.
  storage.setItem((note === null ? DELETED_PREFIX : NOTE_PREFIX) + id, JSON.stringify(record))
  if (note === null) {
    try {
      storage.removeItem(NOTE_PREFIX + id)
    } catch {
      // Маркер уже записан: ошибка очистки не отменяет удаление.
    }
  }
  return record
}

export function readDraft(storage: StoragePort, routeId: string): Draft | null {
  const raw = storage.getItem(DRAFT_PREFIX + routeId)
  if (raw === null) return null
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object') throw new StorageError('Не удалось прочитать черновик.')
  const d = value as Record<string, unknown>
  if (
    d.version !== 1 ||
    !isNote(d.note) ||
    (routeId !== 'new' && d.note.id !== routeId) ||
    (d.baseRevision !== null && typeof d.baseRevision !== 'string') ||
    typeof d.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(d.savedAt))
  ) {
    throw new StorageError('Версия или формат черновика не поддерживается. Черновик не изменён.')
  }
  return d as unknown as Draft
}

export function storageMessage(error: unknown): string {
  if (error instanceof StorageError || error instanceof ConflictError) return error.message
  return 'Хранилище недоступно или содержит повреждённые данные. Проверьте настройки и свободное место в браузере. Ваши изменения не сохранены.'
}

export async function withNoteLock<T>(id: string, action: () => T): Promise<T> {
  if (typeof window !== 'undefined' && navigator.locks)
    return navigator.locks.request(NOTE_PREFIX + id, action)
  // shortcut: без Web Locks возможна гонка записей; для гарантии нужен браузер с Web Locks и HTTPS.
  return action()
}
