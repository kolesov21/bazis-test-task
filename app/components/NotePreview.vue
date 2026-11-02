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

<script setup lang="ts">
import type { Note } from '../domain/notes'
defineProps<{ note: Note }>()
defineEmits<{ remove: [] }>()
const date = (value: string) =>
  new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(new Date(value))
</script>

<style scoped lang="scss">
@use '~/assets/styles/tokens' as *;

.note-preview {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  position: relative;
  border-bottom: 1px solid $line;
  padding: 25px 2px 22px;
}
.note-preview-body {
  min-width: 0;
  flex: 1;
  h2 {
    margin: 0 0 11px;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    a {
      text-decoration: underline;
      text-decoration-color: transparent;
      text-underline-offset: 4px;
      &:hover {
        text-decoration-color: currentColor;
      }
    }
  }
}
.preview-todos {
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    color: #64625c;
    margin: 6px 0;
    > span:last-child {
      min-width: 0;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    &.completed > span:last-child {
      color: $muted;
      text-decoration: line-through;
    }
  }
}
.preview-checkbox {
  width: 13px;
  height: 13px;
  border: 1px solid #b7b6b2;
  border-radius: 2px;
  margin-top: 3px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  .icon {
    width: 11px;
    height: 11px;
  }
}
.completed .preview-checkbox {
  background: #f0f0ee;
}
.more-todos {
  display: inline-block;
  font-size: 12px;
  color: $muted;
  margin-top: 3px;
}
.note-meta {
  display: flex;
  gap: 20px;
  color: $muted;
  margin-top: 15px;
  font-size: 11px;
}
.delete-note {
  margin-top: -4px;
  &:hover:not(:disabled) {
    color: #b13e36;
  }
}
@media (max-width: 700px) {
  .note-preview {
    gap: 10px;
  }
  .note-preview-body h2 {
    font-size: 16px;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .note-preview-body h2 a {
    transition:
      color 140ms ease,
      text-decoration-color 140ms ease;
  }
}
</style>
