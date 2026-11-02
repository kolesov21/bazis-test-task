<script setup lang="ts">
const store = useNotesStore()
const route = useRoute()
const mobileOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)
</script>

<template>
  <div class="workspace">
    <a class="skip-link" href="#main">Перейти к содержимому</a>
    <aside class="sidebar" aria-label="Рабочее пространство">
      <div class="workspace-brand">
        <NuxtLink to="/" class="brand-link"
          ><span class="brand-mark">Б</span><span>Базис</span></NuxtLink
        ><span class="personal-label">Личное</span>
        <button
          class="icon-button mobile-menu"
          aria-controls="workspace-nav"
          :aria-expanded="mobileOpen"
          aria-label="Открыть навигацию"
          @click="mobileOpen = !mobileOpen"
        >
          <AppIcon name="menu" />
        </button>
      </div>
      <nav
        id="workspace-nav"
        class="sidebar-nav"
        :class="{ 'is-open': mobileOpen }"
        aria-label="Заметки"
      >
        <NuxtLink to="/" class="nav-item" :class="{ active: route.path === '/' }"
          ><AppIcon name="grid" /><span>Все заметки</span
          ><span class="nav-count">{{ store.notes.length }}</span></NuxtLink
        >
        <NuxtLink to="/notes/new" class="nav-item" :class="{ active: route.path === '/notes/new' }"
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
      <div class="sidebar-bottom">
        <span class="local-dot" />Только в вашем браузере<span class="sidebar-bottom-hint"
          >Место для ясных мыслей.</span
        >
      </div>
    </aside>
    <div class="workspace-content">
      <header class="topbar">
        <div class="breadcrumbs">
          <AppIcon name="note" /><NuxtLink to="/">Мои заметки</NuxtLink
          ><template v-if="route.path !== '/'"
            ><span class="breadcrumb-divider">/</span
            ><span>{{
              route.params.id === 'new' ? 'Новая заметка' : 'Редактирование'
            }}</span></template
          >
        </div>
        <span class="topbar-caption">Ваше личное пространство</span>
      </header>
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
