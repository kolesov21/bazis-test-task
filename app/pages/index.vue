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
    <div class="page-symbol"><AppIcon name="note" /></div>
    <div class="page-title-row">
      <h1 id="page-heading">Мои заметки</h1>
      <NuxtLink to="/notes/new" class="button button-primary"
        ><AppIcon name="plus" />Новая заметка</NuxtLink
      >
    </div>
    <p class="page-description">Мысли, планы и дела. Всё на своих местах.</p>
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
      <div class="empty-sheet" aria-hidden="true">
        <AppIcon name="note" />
        <div class="sheet-line" />
        <div class="sheet-line short" />
        <div class="sheet-task"><span /><i /></div>
        <div class="sheet-task"><span /><i /></div>
      </div>
      <h2>Большие планы начинаются с заметки</h2>
      <p>Запишите идею, составьте список дел<br />или освободите голову от мелочей.</p>
      <NuxtLink to="/notes/new" class="button"
        ><AppIcon name="plus" />Создать первую заметку</NuxtLink
      >
    </div>
    <footer class="document-footer">
      <AppIcon name="note" /><span
        >Заметки хранятся в этом браузере и доступны после перезагрузки.</span
      >
    </footer>
  </section>
</template>
