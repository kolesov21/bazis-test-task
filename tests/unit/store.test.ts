import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '../../app/stores/notes'
import { DRAFT_PREFIX, NOTE_PREFIX, readDraft, readRecord } from '../../app/domain/storage'
import { isNote } from '../../app/domain/notes'
import { MemoryStorage, note } from './helpers'

describe('notes store and persistence', () => {
  let storage: MemoryStorage
  beforeEach(() => {
    setActivePinia(createPinia())
    storage = new MemoryStorage()
  })
  const makeStore = () => {
    const store = useNotesStore(createPinia())
    store.init(storage)
    return store
  }

  it('starts empty and ignores unrelated storage', async () => {
    storage.setItem('unrelated', 'bad json')
    const store = makeStore()
    expect(store.ready).toBe(true)
    expect(store.notes).toEqual([])
    expect(store.error).toBe('')
  })
  it('saves a versioned note and restores it in a fresh store', async () => {
    const store = makeStore(),
      n = note()
    const record = await store.save(n, null)
    expect(record?.version).toBe(1)
    expect(record?.revision).toBeTruthy()
    n.title = 'Only in memory'
    const fresh = makeStore()
    expect(fresh.notes[0]?.title).toBe('План')
    expect(readRecord(storage, 'one')?.note?.title).toBe('План')
  })
  it('writes only when saving or removing, never when editing a working copy', async () => {
    const write = vi.spyOn(storage, 'setItem'),
      store = makeStore(),
      n = note()
    n.title = '1'
    n.title = '2'
    n.todos[0]!.done = true
    expect(write).not.toHaveBeenCalled()
    const record = (await store.save(n, null))!
    expect(write).toHaveBeenCalledTimes(1)
    await store.remove(n.id, record.revision)
    expect(write).toHaveBeenCalledTimes(2)
  })
  it('normalizes whitespace and permits a note without tasks', async () => {
    const store = makeStore(),
      n = note()
    n.title = '  Название  '
    n.todos = []
    expect((await store.save(n, null))?.note?.title).toBe('Название')
  })
  it('rejects empty titles and empty task text before writing', async () => {
    const store = makeStore(),
      n = note()
    n.title = '  '
    expect(await store.save(n, null)).toBeNull()
    n.title = 'Название'
    n.todos[0]!.text = '  '
    expect(await store.save(n, null)).toBeNull()
    expect(storage.length).toBe(0)
  })
  it('uses per-note records so independent edits do not erase other notes', async () => {
    const first = makeStore(),
      second = makeStore()
    await first.save(note('first'), null)
    await second.save(note('second'), null)
    first.sync()
    expect(first.notes).toHaveLength(2)
  })
  it('detects a stale revision and preserves the other tab’s changes', async () => {
    const first = makeStore(),
      old = (await first.save(note(), null))!
    const second = makeStore(),
      edited = note()
    edited.title = 'Из второй вкладки'
    await second.save(edited, old.revision)
    expect(await first.save(note(), old.revision)).toBeNull()
    expect(first.error).toContain('другой вкладке')
    expect(first.notes[0]?.title).toBe('Из второй вкладки')
  })
  it('does not resurrect a note deleted in another tab', async () => {
    const first = makeStore(),
      saved = (await first.save(note(), null))!,
      second = makeStore()
    expect(await second.remove('one', saved.revision)).toBe(true)
    expect(await first.save(note(), saved.revision)).toBeNull()
    expect(first.notes).toEqual([])
    expect(readRecord(storage, 'one')?.note).toBeNull()
  })
  it('keeps deletion authoritative even if a stale browser overwrites the content key', async () => {
    const store = makeStore()
    const saved = (await store.save(note(), null))!
    await store.remove('one', saved.revision)
    storage.setItem(NOTE_PREFIX + 'one', JSON.stringify(saved))
    store.sync()
    expect(store.notes).toEqual([])
    expect(readRecord(storage, 'one')?.note).toBeNull()
    expect(await store.save(note(), saved.revision)).toBeNull()
  })

  it('does not delete a newer revision after a stale confirmation', async () => {
    const first = makeStore(),
      saved = (await first.save(note(), null))!,
      second = makeStore()
    await second.save({ ...note(), title: 'Новая версия' }, saved.revision)
    expect(await first.remove('one', saved.revision)).toBe(false)
    expect(first.notes[0]?.title).toBe('Новая версия')
  })
  it('handles blocked storage without mutating memory optimistically', async () => {
    const store = makeStore()
    storage.fail = true
    expect(await store.save(note(), null)).toBeNull()
    expect(store.notes).toEqual([])
    expect(store.error).toBeTruthy()
  })
  it('handles quota failure without reporting a successful save', async () => {
    const store = makeStore()
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('Quota')
    })
    expect(await store.save(note(), null)).toBeNull()
    expect(store.notes).toEqual([])
    expect(store.error).toBeTruthy()
  })
  it.each([
    '{bad',
    JSON.stringify({ version: 2, revision: 'r', note: note() }),
    JSON.stringify({ version: 1, revision: 'r', note: { ...note(), todos: [null] } }),
  ])('preserves malformed/unsupported records: %s', async (raw) => {
    storage.setItem(NOTE_PREFIX + 'one', raw)
    const store = makeStore()
    expect(store.error).toBeTruthy()
    expect(await store.save(note(), null)).toBeNull()
    expect(storage.getItem(NOTE_PREFIX + 'one')).toBe(raw)
  })
  it('rejects mismatched record identifiers', async () => {
    storage.setItem(
      NOTE_PREFIX + 'other',
      JSON.stringify({ version: 1, revision: 'r', note: note() }),
    )
    expect(makeStore().error).toBeTruthy()
  })
  it('retains the last readable state when sync fails', async () => {
    const store = makeStore()
    await store.save(note(), null)
    storage.fail = true
    store.sync()
    expect(store.notes[0]?.title).toBe('План')
    expect(store.error).toBeTruthy()
  })
})

describe('draft schema', () => {
  it('restores a versioned draft with unfinished input', async () => {
    const storage = new MemoryStorage(),
      n = note()
    n.title = ''
    n.todos[0]!.text = ''
    storage.setItem(
      DRAFT_PREFIX + 'new',
      JSON.stringify({ version: 1, note: n, baseRevision: null, savedAt: n.updatedAt }),
    )
    expect(readDraft(storage, 'new')?.note).toEqual(n)
  })
  it('rejects a draft for a different note without deleting it', async () => {
    const storage = new MemoryStorage()
    storage.setItem(
      DRAFT_PREFIX + 'other',
      JSON.stringify({ version: 1, note: note(), baseRevision: 'r', savedAt: note().updatedAt }),
    )
    expect(() => readDraft(storage, 'other')).toThrow()
    expect(storage.length).toBe(1)
  })
  it('treats no draft as an ordinary state', async () => {
    expect(readDraft(new MemoryStorage(), 'new')).toBeNull()
  })
  it('rejects duplicated task ids and invalid dates', async () => {
    const n = note()
    n.todos.push({ ...n.todos[0]! })
    expect(isNote(n)).toBe(false)
    expect(isNote({ ...note(), updatedAt: 'not-a-date' })).toBe(false)
  })
})
