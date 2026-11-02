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
      <input
        id="note-title"
        class="title-input"
        :value="note.title"
        :disabled="blocked"
        placeholder="Без названия"
        autocomplete="off"
        :aria-invalid="(!!validation && !note.title.trim()) || undefined"
        :aria-describedby="validation ? 'validation-error' : undefined"
        @input="history.text({ field: 'title' }, ($event.target as HTMLInputElement).value)"
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
