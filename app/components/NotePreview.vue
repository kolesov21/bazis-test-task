<script setup lang="ts">
import type { Note } from '../domain/notes'
defineProps<{ note: Note }>()
defineEmits<{ remove: [] }>()
const date = (value: string) =>
  new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(value))
</script>

<template>
  <article class="note-preview">
    <div class="note-preview-body">
      <h2>
        <NuxtLink :to="`/notes/${note.id}`">{{ note.title }}</NuxtLink>
      </h2>
      <ul class="preview-todos" :aria-label="`Задачи: ${note.title}`">
        <li v-for="todo in note.todos.slice(0, 3)" :key="todo.id" :class="{ completed: todo.done }">
          <span class="preview-checkbox" aria-hidden="true"
            ><AppIcon v-if="todo.done" name="check"
          /></span>
          <span class="sr-only">{{ todo.done ? 'Выполнено:' : 'Не выполнено:' }}</span
          ><span>{{ todo.text }}</span>
        </li>
      </ul>
      <span v-if="note.todos.length > 3" class="more-todos">Ещё {{ note.todos.length - 3 }}</span>
      <span v-if="!note.todos.length" class="more-todos">Пока без задач</span>
      <div class="note-meta">
        <span
          >{{ note.todos.filter((todo) => todo.done).length }} из
          {{ note.todos.length }} выполнено</span
        ><time :datetime="note.updatedAt">{{ date(note.updatedAt) }}</time>
      </div>
    </div>
    <button
      class="icon-button delete-note"
      :aria-label="`Удалить заметку «${note.title}»`"
      title="Удалить заметку"
      @click="$emit('remove')"
    >
      <AppIcon name="trash" />
    </button>
  </article>
</template>
