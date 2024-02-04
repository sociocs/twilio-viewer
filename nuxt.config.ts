// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    app: {
        head: {
            title: "Twilio Viewer",
            meta: [
                { name: "description", content: "Easy viewing of Twilio account, message & voice call logs, alerts, events, and billing. Free & open source. No third-party servers involved." },
            ],
            link: [
                { rel: "icon", type: "image/png", href: "/icon.png" },
            ],
        },
    },

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
        "@nuxtjs/sitemap",
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
