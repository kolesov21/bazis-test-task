<template>
  <div class="todo-row" :class="{ completed: todo.done }">
    <input
      :id="`check-${todo.id}`"
      class="todo-checkbox"
      type="checkbox"
      :checked="todo.done"
      :disabled="disabled"
      :aria-label="`Отметить задачу ${index + 1}: ${todo.text || 'без текста'}`"
      @change="$emit('toggle')"
    />
    <AutoTextarea
      :id="`todo-${todo.id}`"
      class="todo-input"
      :value="todo.text"
      :disabled="disabled"
      :aria-label="`Текст задачи ${index + 1}`"
      :aria-invalid="invalid || undefined"
      :aria-describedby="invalid ? 'validation-error' : undefined"
      placeholder="Что нужно сделать?"
      autocomplete="off"
      @input="$emit('text', ($event.target as HTMLTextAreaElement).value)"
      @blur="$emit('blur')"
    />
    <button
      class="icon-button remove-todo"
      type="button"
      :disabled="disabled"
      :aria-label="`Удалить задачу ${index + 1}`"
      @click="$emit('remove')"
    >
      <AppIcon name="close" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '../domain/notes'
defineProps<{ todo: Todo; index: number; invalid?: boolean; disabled?: boolean }>()
defineEmits<{ text: [value: string]; toggle: []; remove: []; blur: [] }>()
</script>

<style scoped lang="scss">
@use '~/assets/styles/tokens' as *;

.todo-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-height: 42px;
  border-radius: 4px;
  &:focus-within {
    background: #fafaf9;
  }
}
.todo-checkbox {
  appearance: none;
  position: relative;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  margin: 12px 0 0 2px;
  border: 1px solid #a6a49f;
  border-radius: 3px;
  cursor: pointer;
  &:checked {
    background: $ink;
    border-color: $ink;
    &::after {
      content: '';
      width: 8px;
      height: 4px;
      border-left: 1.5px solid white;
      border-bottom: 1.5px solid white;
      transform: translateY(-1px) rotate(-45deg);
    }
  }
}
.todo-input {
  display: block;
  flex: 1;
  min-width: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 8px 2px;
  font-size: 14px;
  line-height: 1.5;
  &::placeholder {
    color: $muted;
  }
}
.completed .todo-input {
  color: $muted;
  text-decoration: line-through;
}
.remove-todo {
  margin-top: 4px;
  &:hover:not(:disabled) {
    color: #b13e36;
  }
}
@media (max-width: 700px) {
  .todo-row {
    min-height: 46px;
  }
  .todo-input {
    font-size: 16px;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .todo-row {
    transition: background-color 140ms ease;
  }
  .todo-checkbox {
    transition:
      background-color 140ms ease,
      border-color 140ms ease;
  }
}
</style>
