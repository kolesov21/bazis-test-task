export interface Todo {
  id: string
  text: string
  done: boolean
}

export interface Note {
  id: string
  title: string
  todos: Todo[]
  updatedAt: string
}

export function copyNote(note: Note): Note {
  return { ...note, todos: note.todos.map((todo) => ({ ...todo })) }
}

export function sameContent(a: Note, b: Note): boolean {
  return a.title === b.title && JSON.stringify(a.todos) === JSON.stringify(b.todos)
}

export function validateNote(note: Note): string | null {
  if (!note.title.trim()) return 'Добавьте название заметки.'
  if (note.todos.some((todo) => !todo.text.trim()))
    return 'Заполните текст каждой задачи или удалите пустые строки.'
  return null
}

export function isNote(value: unknown): value is Note {
  if (!value || typeof value !== 'object') return false
  const n = value as Record<string, unknown>
  if (
    typeof n.id !== 'string' ||
    !/^[a-zA-Z0-9-]+$/.test(n.id) ||
    n.id === 'new' ||
    typeof n.title !== 'string' ||
    typeof n.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(n.updatedAt)) ||
    !Array.isArray(n.todos)
  )
    return false
  const ids = new Set<string>()
  return n.todos.every((todo: unknown) => {
    if (!todo || typeof todo !== 'object') return false
    const t = todo as Record<string, unknown>
    if (
      typeof t.id !== 'string' ||
      !t.id ||
      ids.has(t.id) ||
      typeof t.text !== 'string' ||
      typeof t.done !== 'boolean'
    )
      return false
    ids.add(t.id)
    return true
  })
}
