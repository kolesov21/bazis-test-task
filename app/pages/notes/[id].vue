<template>
  <section class="document editor-page" aria-label="Редактор заметки" :aria-busy="saving">
    <div v-if="draftError" class="notice notice-error" role="alert">{{ draftError }}</div>
    <div v-if="recovery" class="notice" role="status">
      Есть несохранённый черновик.
      <button class="text-button" @click="restore">Выбрать действие</button>
    </div>
    <div v-if="missing" class="empty-state not-found">
      <h1>Заметка не найдена</h1>
      <p>Возможно, её удалили или в ссылке есть ошибка.</p>
      <NuxtLink to="/" class="button"><AppIcon name="arrow" />К заметкам</NuxtLink>
    </div>
    <template v-else>
      <div class="editor-topline">
        <NuxtLink to="/" class="back-link"><AppIcon name="arrow" />Все заметки</NuxtLink
        ><span class="editing-status" role="status"
          ><span :class="['status-dot', { unsaved: dirty }]" />{{
            saving
              ? 'Сохранение…'
              : dirty
                ? 'Есть изменения'
                : isNew
                  ? 'Новая заметка'
                  : 'Сохранено'
          }}</span
        >
        <div class="history-actions">
          <button
            class="icon-button"
            :disabled="!canUndo || blocked"
            aria-label="Отменить изменение"
            title="Отменить (Ctrl / ⌘ Z)"
            @click="undo"
          >
            <AppIcon name="undo" /></button
          ><button
            class="icon-button"
            :disabled="!canRedo || blocked"
            aria-label="Повторить изменение"
            title="Повторить (Ctrl / ⌘ Shift Z)"
            @click="redo"
          >
            <AppIcon name="redo" />
          </button>
        </div>
      </div>
      <h1 class="sr-only">{{ isNew ? 'Новая заметка' : 'Редактирование заметки' }}</h1>
      <label class="sr-only" for="note-title">Название заметки</label>
      <AutoTextarea
        id="note-title"
        class="title-input"
        :value="note.title"
        :disabled="blocked"
        placeholder="Без названия"
        autocomplete="off"
        :aria-invalid="(!!validation && !note.title.trim()) || undefined"
        :aria-describedby="validation ? 'validation-error' : undefined"
        @input="history.text({ field: 'title' }, ($event.target as HTMLTextAreaElement).value)"
        @blur="blur"
      />
      <div v-if="conflict" class="notice notice-warning" role="alert">
        <strong>{{
          deleted ? 'Заметка удалена в другой вкладке.' : 'Заметка изменена в другой вкладке.'
        }}</strong>
        <p>
          Ваш текст остался здесь. Сохраните его отдельной заметкой, чтобы не потерять изменения.
        </p>
        <button class="button" :disabled="blocked" @click="save(true)">Сохранить как новую</button>
      </div>
      <div class="todo-list">
        <TodoRow
          v-for="(todo, index) in note.todos"
          :key="todo.id"
          :todo="todo"
          :index="index"
          :disabled="blocked"
          :invalid="!!validation && !todo.text.trim()"
          @text="history.text({ field: 'todo', id: todo.id }, $event)"
          @toggle="history.toggle(todo.id)"
          @remove="removeTodo(todo.id)"
          @blur="blur"
        />
      </div>
      <button id="add-todo" class="add-todo" :disabled="blocked" @click="addTodo">
        <AppIcon name="plus" />Добавить задачу
      </button>
      <p v-if="!note.todos.length" class="todo-hint">Разбейте большую идею на небольшие шаги.</p>
      <p v-if="validation" id="validation-error" class="validation-error" role="alert">
        {{ validation }}
      </p>
      <div class="editor-actions">
        <button class="button button-primary" :disabled="blocked || conflict" @click="save(false)">
          Сохранить изменения</button
        ><button class="button button-quiet" :disabled="saving" @click="cancel">Отменить</button
        ><button
          v-if="!isNew && !conflict"
          class="icon-button editor-delete"
          :disabled="blocked"
          aria-label="Удалить заметку"
          title="Удалить заметку"
          @click="remove"
        >
          <AppIcon name="trash" />
        </button>
      </div>
      <p class="save-message" role="status">{{ message }}</p>
      <footer class="document-footer editor-footer">
        <AppIcon name="clock" /><span
          >Черновик сохраняется в этой вкладке. Заметка — по кнопке «Сохранить».</span
        >
      </footer>
    </template>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()
const {
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
} = useNoteEditor(String(route.params.id))
useHead({ title: () => `${note.title || (isNew ? 'Новая заметка' : 'Заметка')} — Базис` })
</script>

<style scoped lang="scss">
@use '~/assets/styles/tokens' as *;

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #929a8c;
  margin-right: 6px;
  vertical-align: middle;
}
.document-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-top: 1px solid $line;
  margin-top: 24px;
  padding-top: 20px;
  color: $muted;
  font-size: 11px;
  .icon {
    width: 13px;
    height: 13px;
  }
}
.editor-page {
  margin-top: 32px;
  max-width: 740px;
}
.editor-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 34px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: $muted;
  &:hover {
    color: $ink;
  }
  .icon {
    width: 14px;
    height: 14px;
  }
}
.editing-status {
  margin-left: auto;
  font-size: 11px;
  color: $muted;
}
.status-dot.unsaved {
  background: #b79043;
}
.title-input {
  display: block;
  width: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.9px;
  padding: 4px 0;
  margin: 0 0 16px;
  &::placeholder {
    color: #86847d;
    opacity: 1;
  }
}
.history-actions {
  display: flex;
  gap: 3px;
  .icon {
    width: 16px;
    height: 16px;
  }
}
.add-todo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 2px;
  margin-top: 8px;
  font-size: 13px;
  color: $muted;
  border: 0;
  background: transparent;
  &:hover:not(:disabled) {
    color: $ink;
  }
  .icon {
    width: 17px;
    height: 17px;
  }
}
.todo-hint {
  color: $muted;
  font-size: 12px;
  margin-top: 10px;
}
.editor-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid $line;
}
.editor-delete {
  margin-left: auto;
  &:hover:not(:disabled) {
    color: #b13e36;
  }
}
.save-message {
  min-height: 18px;
  margin-top: 12px;
  color: #587250;
  font-size: 12px;
}
.editor-footer {
  justify-content: flex-start;
  border-top: 0;
  padding-top: 8px;
  margin-top: 14px;
  align-items: flex-start;
  .icon {
    margin-top: 2px;
  }
}
.validation-error {
  color: #ac3b33;
  font-size: 13px;
  margin-top: 18px;
}
.not-found {
  padding-top: 70px;
  h1 {
    font-size: 28px;
    margin-bottom: 14px;
  }
}

@media (min-width: 1500px) {
  .editor-page {
    margin-top: 48px;
  }
}
@media (max-width: 700px) {
  .editor-page {
    margin-top: 24px;
  }
  .editor-topline {
    margin-bottom: 24px;
  }
  .editor-actions {
    flex-wrap: wrap;
    gap: 6px;
  }
  .title-input {
    font-size: 30px;
  }
  .document-footer {
    text-align: left;
    font-size: 10px;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .add-todo {
    transition:
      background-color 140ms ease,
      color 140ms ease,
      opacity 140ms ease,
      transform 120ms ease;
  }
  .add-todo:active:not(:disabled) {
    transform: translateY(1px);
  }
  .back-link {
    transition:
      color 140ms ease,
      text-decoration-color 140ms ease;
  }
}

.button-quiet {
  border-color: transparent;
  box-shadow: none;
  color: #6a6863;
}

.notice-warning {
  background: #fbf8ef;
  border-color: #e8e0c9;
  color: #75602f;
}
</style>
