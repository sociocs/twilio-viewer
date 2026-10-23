// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    "@nuxt/ui",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxt/eslint",
  ],

  ssr: false,

  devtools: { enabled: false },

  app: {
    head: {
      title: "Twilio Viewer",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "Fast, secure client-side viewer for Twilio accounts, phone numbers, message history, voice calls, alerts, and billing.",
        },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      ],
      htmlAttrs: {
        lang: "en",
      },
    },
  },

  css: [
    "~/assets/css/main.css",
  ],

  runtimeConfig: {
    public: {
      version: "2.0.0",
    },
  },

  compatibilityDate: "2025-07-15",

  eslint: {
    config: {
      stylistic: true,
    },
  },
});
