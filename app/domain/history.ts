import type { Note, Todo } from './notes'

type TextTarget = { field: 'title' } | { field: 'todo'; id: string }
type Change =
  | { kind: 'text'; target: TextTarget; before: string; after: string }
  | { kind: 'toggle'; id: string; before: boolean; after: boolean }
  | { kind: 'insert' | 'remove'; todo: Todo; index: number }

// History stores reversible operations, never snapshots of entire notes.
export class NoteHistory {
  private past: Change[] = []
  private future: Change[] = []
  private pending: Extract<Change, { kind: 'text' }> | null = null
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    readonly note: Note,
    private readonly changed: () => void = () => {},
    private readonly pause = 600,
  ) {}

  get canUndo(): boolean {
    return this.past.length > 0 || this.pending !== null
  }
  get canRedo(): boolean {
    return this.future.length > 0 && this.pending === null
  }
  get size(): number {
    return this.past.length
  }

  private record(change: Change): void {
    this.past.push(change)
    if (this.past.length > 50) this.past.shift()
    this.future = []
  }

  text(target: TextTarget, value: string): void {
    const todo =
      target.field === 'todo' ? this.note.todos.find((t) => t.id === target.id) : undefined
    if (target.field === 'todo' && !todo) return
    const before = target.field === 'title' ? this.note.title : todo!.text
    if (before === value) return
    if (this.pending && JSON.stringify(this.pending.target) !== JSON.stringify(target)) this.flush()
    if (!this.pending) this.pending = { kind: 'text', target, before, after: value }
    else this.pending.after = value
    this.future = []
    if (target.field === 'title') this.note.title = value
    else todo!.text = value
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.flush()
      this.changed()
    }, this.pause)
    this.changed()
  }

  flush(): void {
    clearTimeout(this.timer)
    if (this.pending && this.pending.before !== this.pending.after) this.record(this.pending)
    this.pending = null
  }

  insert(todo: Todo, index = this.note.todos.length): void {
    this.flush()
    const change: Change = { kind: 'insert', todo: { ...todo }, index }
    this.apply(change, true)
    this.record(change)
    this.changed()
  }

  remove(id: string): void {
    this.flush()
    const index = this.note.todos.findIndex((todo) => todo.id === id)
    const todo = this.note.todos[index]
    if (!todo) return
    const change: Change = { kind: 'remove', todo: { ...todo }, index }
    this.apply(change, true)
    this.record(change)
    this.changed()
  }

  toggle(id: string): void {
    this.flush()
    const todo = this.note.todos.find((t) => t.id === id)
    if (!todo) return
    const change: Change = { kind: 'toggle', id, before: todo.done, after: !todo.done }
    this.apply(change, true)
    this.record(change)
    this.changed()
  }

  undo(): void {
    this.flush()
    const change = this.past.pop()
    if (change) {
      this.apply(change, false)
      this.future.push(change)
    }
    this.changed()
  }

  redo(): void {
    this.flush()
    const change = this.future.pop()
    if (change) {
      this.apply(change, true)
      this.past.push(change)
    }
    this.changed()
  }

  clear(): void {
    clearTimeout(this.timer)
    this.pending = null
    this.past = []
    this.future = []
  }

  private apply(change: Change, forward: boolean): void {
    if (change.kind === 'text') {
      const value = forward ? change.after : change.before
      if (change.target.field === 'title') this.note.title = value
      else {
        const id = change.target.id
        const todo = this.note.todos.find((t) => t.id === id)
        if (todo) todo.text = value
      }
    } else if (change.kind === 'toggle') {
      const todo = this.note.todos.find((t) => t.id === change.id)
      if (todo) todo.done = forward ? change.after : change.before
    } else if ((change.kind === 'insert') === forward) {
      this.note.todos.splice(change.index, 0, { ...change.todo })
    } else {
      const index = this.note.todos.findIndex((t) => t.id === change.todo.id)
      if (index >= 0) this.note.todos.splice(index, 1)
    }
  }
}
