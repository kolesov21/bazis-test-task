<script setup lang="ts">
import type { Note } from '../domain/notes'
const store = useNotesStore()
const { ask } = useConfirm()
useHead({ title: 'Мои заметки — Базис' })

async function remove(note: Note): Promise<void> {
  const revision = store.records[note.id]?.revision
  if (!revision) return
  if (
    await ask({
      title: 'Удалить заметку?',
      description: `«${note.title}» и все её задачи будут удалены. Это действие нельзя отменить.`,
      confirm: 'Удалить заметку',
      cancel: 'Оставить заметку',
      danger: true,
    })
  )
    await store.remove(note.id, revision)
}
</script>

<template>
  <section class="document notes-page" aria-labelledby="page-heading">
    <div class="page-title-row">
      <h1 id="page-heading">Мои заметки</h1>
      <NuxtLink to="/notes/new" class="button button-primary"
        ><AppIcon name="plus" />Новая заметка</NuxtLink
      >
    </div>
    <div class="collection-heading">
      <span
        ><AppIcon name="grid" />Все заметки
        <span class="collection-count">{{ store.notes.length }}</span></span
      >
    </div>
    <div v-if="store.notes.length" class="notes-list">
      <NotePreview v-for="note in store.notes" :key="note.id" :note="note" @remove="remove(note)" />
    </div>
    <div v-else class="empty-state">
      <h2>Большие планы начинаются с заметки</h2>
      <p>Запишите идею, составьте список дел<br />или освободите голову от мелочей.</p>
    </div>
  </section>
</template>
