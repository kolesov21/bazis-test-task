import { copyNote, sameContent, validateNote, type Note } from '../domain/notes'
import { NoteHistory } from '../domain/history'
import { DRAFT_PREFIX, readDraft, storageMessage, type Draft } from '../domain/storage'

export function useNoteEditor(routeId: string) {
  const store = useNotesStore()
  const { ask, activeDialog } = useConfirm()
  const router = useRouter()
  const isNew = routeId === 'new'
  const initial = store.records[routeId]?.note
  const note = reactive<Note>(
    initial
      ? copyNote(initial)
      : {
          id: isNew ? crypto.randomUUID() : routeId,
          title: '',
          todos: [],
          updatedAt: new Date().toISOString(),
        },
  )
  const baseline = ref(copyNote(note))
  const baseRevision = ref<string | null>(store.records[routeId]?.revision ?? null)
  const missing = ref(!isNew && !initial)
  const dirty = computed(() => !sameContent(note, baseline.value))
  const saving = ref(false)
  const validation = ref('')
  const draftError = ref('')
  const message = ref('')
  const recovery = ref<Draft | null>(null)
  const draftBlocked = ref(false)
  const tick = ref(0)
  let timer: ReturnType<typeof setTimeout> | undefined
  let leaving = false
  let draftStorage: Storage | undefined
  const history = new NoteHistory(note, () => {
    tick.value++
    message.value = ''
    clearTimeout(timer)
    timer = setTimeout(persistDraft, 400)
  })
  const canUndo = computed(() => {
    void tick.value
    return history.canUndo
  })
  const canRedo = computed(() => {
    void tick.value
    return history.canRedo
  })
  const conflict = computed(
    () =>
      !isNew && !missing.value && (store.records[routeId]?.revision ?? null) !== baseRevision.value,
  )
  const deleted = computed(() => conflict.value && !store.records[routeId]?.note)
  const blocked = computed(() => recovery.value !== null || draftBlocked.value || saving.value)

  function clearDraft(): void {
    clearTimeout(timer)
    try {
      draftStorage?.removeItem(DRAFT_PREFIX + routeId)
      draftError.value = ''
    } catch (error) {
      draftError.value = storageMessage(error)
    }
  }

  function persistDraft(): void {
    clearTimeout(timer)
    if (recovery.value || draftBlocked.value || leaving) return
    if (!dirty.value) {
      clearDraft()
      return
    }
    try {
      if (!draftStorage) throw new Error('No session storage')
      const draft: Draft = {
        version: 1,
        note: copyNote(note),
        baseRevision: baseRevision.value,
        savedAt: new Date().toISOString(),
      }
      draftStorage.setItem(DRAFT_PREFIX + routeId, JSON.stringify(draft))
      draftError.value = ''
    } catch {
      draftError.value =
        'Не удалось сохранить черновик. Не закрывайте вкладку до сохранения заметки.'
    }
  }

  async function restore(): Promise<void> {
    const draft = recovery.value
    if (!draft) return
    const result = await ask({
      title: 'Восстановить черновик?',
      description:
        'В этой вкладке осталось незавершённое редактирование. Можно продолжить с того места, где вы остановились.',
      confirm: 'Восстановить',
      cancel: 'Удалить черновик',
    })
    if (result === null) return
    recovery.value = null
    if (result) {
      Object.assign(note, copyNote(draft.note))
      baseRevision.value = draft.baseRevision
      missing.value = false
      history.clear()
      tick.value++
      message.value = 'Черновик восстановлен'
    } else clearDraft()
  }

  function blur(): void {
    history.flush()
    tick.value++
  }
  function undo(): void {
    if (!blocked.value) history.undo()
  }
  function redo(): void {
    if (!blocked.value) history.redo()
  }
  async function addTodo(): Promise<void> {
    const id = crypto.randomUUID()
    history.insert({ id, text: '', done: false })
    await nextTick()
    document.getElementById(`todo-${id}`)?.focus()
  }
  async function removeTodo(id: string): Promise<void> {
    const index = note.todos.findIndex((todo) => todo.id === id)
    history.remove(id)
    await nextTick()
    const next = note.todos[index] ?? note.todos[index - 1]
    document.getElementById(next ? `todo-${next.id}` : 'add-todo')?.focus()
  }

  async function save(asCopy = false): Promise<void> {
    if (blocked.value || missing.value || (conflict.value && !asCopy)) return
    blur()
    validation.value = validateNote(note) ?? ''
    if (validation.value) {
      const empty = note.todos.find((todo) => !todo.text.trim())
      document.getElementById(!note.title.trim() ? 'note-title' : `todo-${empty?.id}`)?.focus()
      return
    }
    const candidate = copyNote(note)
    if (asCopy) candidate.id = crypto.randomUUID()
    saving.value = true
    const saved = await store.save(candidate, asCopy ? null : baseRevision.value)
    saving.value = false
    if (!saved?.note) return
    Object.assign(note, copyNote(saved.note))
    baseline.value = copyNote(saved.note)
    baseRevision.value = saved.revision
    history.clear()
    tick.value++
    clearDraft()
    message.value = 'Изменения сохранены'
    if (isNew || asCopy) {
      leaving = true
      await router.replace(`/notes/${saved.note.id}`)
    }
  }

  async function confirmDiscard(): Promise<boolean> {
    return (
      (await ask({
        title: 'Отменить редактирование?',
        description:
          'Несохранённые изменения и черновик будут удалены. Сохранённая версия заметки останется.',
        confirm: 'Отменить редактирование',
        cancel: 'Продолжить',
        danger: true,
      })) === true
    )
  }
  async function cancel(): Promise<void> {
    if (!(await confirmDiscard())) return
    clearDraft()
    history.clear()
    leaving = true
    await router.push('/')
  }
  async function remove(): Promise<void> {
    const revision = baseRevision.value
    if (!revision) return
    if (
      !(await ask({
        title: 'Удалить заметку?',
        description: 'Заметка и все её задачи будут удалены. Это действие нельзя отменить.',
        confirm: 'Удалить заметку',
        cancel: 'Оставить заметку',
        danger: true,
      }))
    )
      return
    saving.value = true
    const removed = await store.remove(routeId, revision)
    saving.value = false
    if (removed) {
      clearDraft()
      history.clear()
      leaving = true
      await router.push('/')
    }
  }

  function keyboard(event: KeyboardEvent): void {
    if (event.isComposing || missing.value || activeDialog.value || blocked.value || event.altKey)
      return
    if (!(event.ctrlKey || event.metaKey)) return
    if (event.code === 'KeyZ') {
      // One history owns both fields and page actions; native undo must not replay a second change.
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    } else if (event.code === 'KeyS') {
      event.preventDefault()
      if (!conflict.value) void save()
    }
  }
  function nativeHistory(event: InputEvent): void {
    if (activeDialog.value || blocked.value) return
    if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
      event.preventDefault()
      if (event.inputType === 'historyUndo') undo()
      else redo()
    }
  }
  function onHidden(): void {
    if (document.visibilityState === 'hidden') persistDraft()
  }

  onMounted(() => {
    try {
      draftStorage = window.sessionStorage
      recovery.value = readDraft(draftStorage, routeId)
    } catch (error) {
      draftError.value = storageMessage(error)
      draftBlocked.value = true
    }
    if (recovery.value) void restore()
    window.addEventListener('keydown', keyboard)
    document.addEventListener('beforeinput', nativeHistory)
    window.addEventListener('pagehide', persistDraft)
    document.addEventListener('visibilitychange', onHidden)
  })
  async function guardNavigation(to: { path: string }, from: { path: string }): Promise<boolean> {
    if (saving.value) return false
    if (to.path === from.path) return true
    if (leaving || !dirty.value) return true
    if (!(await confirmDiscard())) return false
    clearDraft()
    history.clear()
    leaving = true
    return true
  }
  onBeforeRouteLeave(guardNavigation)
  onBeforeRouteUpdate(guardNavigation)
  onBeforeUnmount(() => {
    persistDraft()
    clearTimeout(timer)
    history.clear()
    window.removeEventListener('keydown', keyboard)
    document.removeEventListener('beforeinput', nativeHistory)
    window.removeEventListener('pagehide', persistDraft)
    document.removeEventListener('visibilitychange', onHidden)
  })

  return {
    note,
    history,
    isNew,
    missing,
    dirty,
    validation,
    saving,
    draftError,
    message,
    recovery,
    blocked,
    canUndo,
    canRedo,
    conflict,
    deleted,
    restore,
    blur,
    undo,
    redo,
    addTodo,
    removeTodo,
    save,
    cancel,
    remove,
  }
}
