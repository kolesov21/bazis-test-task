<script setup lang="ts">
import type { Todo } from '../domain/notes'
defineProps<{ todo: Todo; index: number; invalid?: boolean; disabled?: boolean }>()
defineEmits<{ text: [value: string]; toggle: []; remove: []; blur: [] }>()
</script>

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
    <input
      :id="`todo-${todo.id}`"
      class="todo-input"
      :value="todo.text"
      :disabled="disabled"
      :aria-label="`Текст задачи ${index + 1}`"
      :aria-invalid="invalid || undefined"
      :aria-describedby="invalid ? 'validation-error' : undefined"
      placeholder="Что нужно сделать?"
      autocomplete="off"
      @input="$emit('text', ($event.target as HTMLInputElement).value)"
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
