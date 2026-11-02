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

<style scoped lang="scss">
@use '~/assets/styles/tokens' as *;

.skip-link {
  position: fixed;
  top: -60px;
  left: 16px;
  background: $ink;
  color: #fff;
  padding: 10px 16px;
  z-index: 10;
  &:focus {
    top: 10px;
  }
}
.workspace {
  min-height: 100dvh;
}
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 240px;
  padding: 23px 12px;
  background: $sidebar;
  border-right: 1px solid $line;
  display: flex;
  flex-direction: column;
}
.workspace-brand {
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 12px;
  margin-bottom: 30px;
}
.sidebar-panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow-y: auto;
}
.brand-link {
  font-size: 17px;
  font-weight: 650;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 7px 10px;
  border-radius: 5px;
  color: #66645f;
  margin-bottom: 3px;
  &:hover {
    background: #ececea;
  }
  &.active {
    background: #ebebe8;
    color: $ink;
    font-weight: 550;
  }
  .icon {
    color: $muted;
    width: 17px;
    height: 17px;
  }
}
.nav-count {
  margin-left: auto;
  font-size: 12px;
  color: $muted;
  font-weight: 400;
}
.nav-section-title {
  color: $muted;
  font-size: 12px;
  margin: 31px 10px 8px;
}
.recent-note span {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.sidebar-hint {
  margin: auto 10px 0;
  padding-top: 24px;
  color: $muted;
  font-size: 12px;
}
.workspace-content {
  display: flow-root;
  margin-left: 240px;
}
main:focus {
  outline: none;
}
.global-notice {
  margin: 20px 36px;
}
.mobile-menu,
.mobile-menu-backdrop {
  display: none;
}
@media (max-width: 1050px) {
  .sidebar {
    width: 210px;
  }
  .workspace-content {
    margin-left: 210px;
  }
}
@media (max-width: 700px) {
  .mobile-menu-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 4;
    background: #18181840;
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    &.is-open {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
    }
  }
  .sidebar {
    position: sticky;
    inset: 0 0 auto;
    z-index: 5;
    width: 100%;
    padding: 12px 16px;
    border-right: 0;
    border-bottom: 1px solid $line;
  }
  .workspace-brand {
    padding: 0;
    margin: 0;
  }
  .brand-link {
    font-size: 16px;
  }
  .mobile-menu {
    display: inline-grid;
    margin-left: auto;
  }
  .sidebar-panel {
    position: absolute;
    inset: 100% 0 auto;
    max-height: calc(100dvh - 61px);
    padding: 16px 16px 20px;
    background: $sidebar;
    border-bottom: 1px solid $line;
    box-shadow: 0 8px 16px #0000000d;
    overscroll-behavior: contain;
    visibility: hidden;
    opacity: 0;
    transform: translateY(-6px);
    pointer-events: none;
    &.is-open {
      visibility: visible;
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
  }
  .workspace-content {
    margin-left: 0;
  }
  .global-notice {
    margin-inline: 20px;
  }
}
@media (prefers-reduced-motion: no-preference) {
  @media (max-width: 700px) {
    .sidebar-panel,
    .mobile-menu-backdrop {
      transition:
        opacity 160ms ease,
        transform 160ms ease,
        visibility 0s linear 160ms;
      &.is-open {
        transition-delay: 0s;
      }
    }
  }
  .nav-item {
    transition:
      background-color 140ms ease,
      color 140ms ease,
      opacity 140ms ease,
      transform 120ms ease;
  }
}
</style>
