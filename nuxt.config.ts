// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  googleFonts: {
    download: false,
    families: {
      Roboto: true,
    }
  },

  modules: [
    "@invictus.codes/nuxt-vuetify",
    "@nuxtjs/google-fonts",
    "@pinia/nuxt",
  ],

  ssr: false,

  vite: {
    define: {
      "process.env.DEBUG": false,
    },
  },

  vuetify: {
    moduleOptions: {
      treeshaking: true,
    },
  },
});
