// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },

    googleFonts: {
        download: false,
        families: {
            Roboto: true,
        }
    },

    gtag: {
        id: "G-3EZVFZYBLT",
    },

    imports: {
        dirs: [
            "stores",
        ],
    },

    modules: [
        "@invictus.codes/nuxt-vuetify",
        "@nuxtjs/google-fonts",
        "@pinia/nuxt",
        "nuxt-gtag",
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
