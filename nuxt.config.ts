// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    css: [
        "vuetify/lib/styles/main.sass",
        "@/assets/css/app.scss"
    ],
    build: {
        transpile: ["vuetify"],
    },
});
