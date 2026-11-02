import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NoteHistory } from '../../app/domain/history'
import { note } from './helpers'

describe('operation history', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('groups continuous typing into one step on blur', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.text({ field: 'title' }, 'П')
    h.text({ field: 'title' }, 'Планы')
    expect(h.canUndo).toBe(true)
    h.flush()
    expect(h.size).toBe(1)
    h.undo()
    expect(n.title).toBe('План')
    h.redo()
    expect(n.title).toBe('Планы')
  })
  it('commits after a pause and separates subsequent typing', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.text({ field: 'title' }, 'Первый')
    vi.advanceTimersByTime(600)
    h.text({ field: 'title' }, 'Второй')
    vi.advanceTimersByTime(600)
    expect(h.size).toBe(2)
    h.undo()
    expect(n.title).toBe('Первый')
    h.undo()
    expect(n.title).toBe('План')
  })
  it('separates edits to different text fields', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.text({ field: 'title' }, 'Название')
    h.text({ field: 'todo', id: 'a' }, 'Новый текст')
    h.undo()
    expect(n.todos[0]?.text).toBe('Первая задача')
    expect(n.title).toBe('Название')
    h.undo()
    expect(n.title).toBe('План')
  })
  it('undo flushes typing immediately without waiting for the timer', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.text({ field: 'title' }, 'Ввод')
    h.undo()
    vi.runAllTimers()
    expect(n.title).toBe('План')
    expect(h.canRedo).toBe(true)
    expect(h.size).toBe(0)
  })
  it('keeps checkbox, insert, delete atomic and restores ordering', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.insert({ id: 'b', text: 'Вторая', done: false })
    h.toggle('a')
    h.remove('a')
    expect(n.todos.map((t) => t.id)).toEqual(['b'])
    h.undo()
    expect(n.todos.map((t) => t.id)).toEqual(['a', 'b'])
    expect(n.todos[0]?.done).toBe(true)
    h.undo()
    expect(n.todos[0]?.done).toBe(false)
    h.undo()
    expect(n.todos.map((t) => t.id)).toEqual(['a'])
    h.redo()
    h.redo()
    h.redo()
    expect(n.todos.map((t) => t.id)).toEqual(['b'])
  })
  it('flushes pending text before an atomic operation', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.text({ field: 'todo', id: 'a' }, 'Изменено')
    h.toggle('a')
    h.undo()
    expect(n.todos[0]?.done).toBe(false)
    expect(n.todos[0]?.text).toBe('Изменено')
    h.undo()
    expect(n.todos[0]?.text).toBe('Первая задача')
  })
  it('new text immediately clears the redo branch', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.toggle('a')
    h.undo()
    expect(h.canRedo).toBe(true)
    h.text({ field: 'title' }, 'Другая ветка')
    expect(h.canRedo).toBe(false)
    h.flush()
    h.redo()
    expect(n.todos[0]?.done).toBe(false)
  })
  it('an atomic change clears the redo branch', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.toggle('a')
    h.undo()
    h.insert({ id: 'b', text: 'Задача', done: false })
    expect(h.canRedo).toBe(false)
  })
  it('caps history at 50 reversible deltas, not full note copies', () => {
    const n = note(),
      h = new NoteHistory(n)
    for (let i = 1; i <= 60; i++) {
      h.text({ field: 'title' }, String(i))
      h.flush()
    }
    expect(h.size).toBe(50)
    expect(JSON.stringify(h).match(/"todos":/g)).toHaveLength(1)
    for (let i = 0; i < 51; i++) h.undo()
    expect(n.title).toBe('10')
    for (let i = 0; i < 51; i++) h.redo()
    expect(n.title).toBe('60')
    expect(h.size).toBe(50)
  })
  it('does not create entries for unchanged text or a round trip', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.text({ field: 'title' }, 'План')
    expect(h.canUndo).toBe(false)
    h.text({ field: 'title' }, 'Другой')
    h.text({ field: 'title' }, 'План')
    h.flush()
    expect(h.size).toBe(0)
  })
  it('clears pending history and timers at a session boundary', () => {
    const n = note(),
      changed = vi.fn(),
      h = new NoteHistory(n, changed)
    h.toggle('a')
    h.text({ field: 'title' }, 'Сохранено')
    h.clear()
    changed.mockClear()
    vi.runAllTimers()
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)
    expect(changed).not.toHaveBeenCalled()
  })
  it('ignores deleted task identifiers', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.remove('missing')
    h.toggle('missing')
    h.text({ field: 'todo', id: 'missing' }, 'Текст')
    expect(h.size).toBe(0)
    expect(n.todos).toHaveLength(1)
  })
  it('restores inserted task data without sharing command objects', () => {
    const n = note(),
      h = new NoteHistory(n)
    h.insert({ id: 'b', text: 'Исходный', done: false })
    h.text({ field: 'todo', id: 'b' }, 'Другой')
    h.flush()
    h.undo()
    h.undo()
    h.redo()
    expect(n.todos[1]?.text).toBe('Исходный')
  })
})
