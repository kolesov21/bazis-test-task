export default defineNuxtConfig({
  compatibilityDate: '2026-11-02',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/styles/main.scss'],
  typescript: { strict: true, tsConfig: { compilerOptions: { noUncheckedIndexedAccess: true } } },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'Базис — заметки и задачи',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { name: 'description', content: 'Простое пространство для ваших заметок и списков задач.' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
