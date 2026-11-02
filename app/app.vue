<script setup lang="ts">
const store = useNotesStore()
const route = useRoute()
const { activeDialog } = useConfirm()
const mobileOpen = ref(false)
const isMobile = ref(false)
const sidebar = useTemplateRef('sidebar')
const menuButton = useTemplateRef('menuButton')
let mobileQuery: MediaQueryList | undefined

function closeMobileMenu(restoreFocus = false): void {
  if (!mobileOpen.value) return
  mobileOpen.value = false
  if (restoreFocus) menuButton.value?.focus()
}

function updateMobile(): void {
  isMobile.value = mobileQuery?.matches ?? false
  closeMobileMenu()
}

function onOutsidePointer(event: PointerEvent): void {
  if (activeDialog.value) return
  if (event.target instanceof Node && !sidebar.value?.contains(event.target)) closeMobileMenu()
}

function onSidebarFocusOut(event: FocusEvent): void {
  if (activeDialog.value) return
  if (event.relatedTarget instanceof Node && !sidebar.value?.contains(event.relatedTarget))
    closeMobileMenu()
}

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 700px)')
  updateMobile()
  mobileQuery.addEventListener('change', updateMobile)
  document.addEventListener('pointerdown', onOutsidePointer)
})
onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', updateMobile)
  document.removeEventListener('pointerdown', onOutsidePointer)
})
watch(
  () => route.fullPath,
  () => closeMobileMenu(sidebar.value?.contains(document.activeElement)),
)
</script>

<template>
  <div class="workspace">
    <a class="skip-link" href="#main">Перейти к содержимому</a>
    <div
      class="mobile-menu-backdrop"
      :class="{ 'is-open': mobileOpen }"
      aria-hidden="true"
      @pointerdown.prevent="closeMobileMenu(true)"
    />
    <aside
      ref="sidebar"
      class="sidebar"
      aria-label="Рабочее пространство"
      @keydown.esc.stop.prevent="closeMobileMenu(true)"
      @focusout="onSidebarFocusOut"
    >
      <div class="workspace-brand">
        <NuxtLink to="/" class="brand-link">Базис</NuxtLink>
        <button
          ref="menuButton"
          class="icon-button mobile-menu"
          aria-controls="sidebar-panel"
          :aria-expanded="mobileOpen"
          aria-label="Открыть навигацию"
          @click="mobileOpen = !mobileOpen"
        >
          <AppIcon name="menu" />
        </button>
      </div>
      <div
        id="sidebar-panel"
        class="sidebar-panel"
        :class="{ 'is-open': mobileOpen }"
        :inert="isMobile && !mobileOpen"
      >
        <nav id="workspace-nav" class="sidebar-nav" aria-label="Заметки">
          <NuxtLink to="/" class="nav-item" :class="{ active: route.path === '/' }"
            ><AppIcon name="grid" /><span>Все заметки</span
            ><span class="nav-count">{{ store.notes.length }}</span></NuxtLink
          >
          <NuxtLink
            to="/notes/new"
            class="nav-item"
            :class="{ active: route.path === '/notes/new' }"
            ><AppIcon name="plus" /><span>Новая заметка</span></NuxtLink
          >
          <template v-if="store.notes.length"
            ><p class="nav-section-title">Недавние</p>
            <NuxtLink
              v-for="note in store.notes.slice(0, 6)"
              :key="note.id"
              :to="`/notes/${note.id}`"
              class="nav-item recent-note"
              :class="{ active: route.path === `/notes/${note.id}` }"
              ><AppIcon name="note" /><span>{{ note.title }}</span></NuxtLink
            >
          </template>
        </nav>
        <p id="storage-hint" class="sidebar-hint">
          Заметки хранятся в этом браузере и доступны после перезагрузки.
        </p>
      </div>
    </aside>
    <div class="workspace-content">
      <main id="main" tabindex="-1">
        <div v-if="store.error" class="notice notice-error global-notice" role="alert">
          {{ store.error }} <button class="text-button" @click="store.sync">Проверить снова</button>
        </div>
        <NuxtPage :page-key="(pageRoute) => pageRoute.path" />
      </main>
    </div>
    <AppDialog />
  </div>
</template>
