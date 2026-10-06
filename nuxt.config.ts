import tailwindcss from '@tailwindcss/vite'

/**
 * The PlayChale admin desk: a separate app from the one players use, so none of its code or routes
 * exist there at all. A static single-page app — no server, nothing to keep running — published to
 * Cloudflare Pages at admin.playchale.com.
 *
 * It must live on a playchale.com subdomain. The API's session cookie is SameSite=Lax, which a
 * browser only sends between same-site addresses: admin.playchale.com → api.playchale.com works,
 * a *.pages.dev address would sign in and then be signed out on every request.
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: false,
  modules: ['@nuxt/fonts', '@nuxt/icon'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  runtimeConfig: { public: { apiBase: 'http://localhost:8080' } },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'PlayChale Admin',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        // Never indexed, never previewed: nothing here is for anyone who isn't staff.
        { name: 'robots', content: 'noindex, nofollow, noarchive' },
        { name: 'referrer', content: 'no-referrer' },
        { name: 'theme-color', content: '#0c3a3a' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  fonts: { families: [{ name: 'Onest', provider: 'google', weights: [300, 400, 500, 600] }] },

  icon: {
    serverBundle: 'local',
    cssLayer: 'base',
    clientBundle: { scan: { globInclude: ['app/**/*.{vue,ts}'], globExclude: ['node_modules', '.nuxt', '.output'] } },
  },
})
