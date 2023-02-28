<template>
    <v-app>
        <v-navigation-drawer theme="dark" permanent>
            <v-list>
                <v-list-item @click="reloadWebsite">
                    <template v-slot:prepend>
                        <v-img src="/icon.svg" height="32" width="32" class="me-2"></v-img>
                        <v-list-item-title style="font-size: 1.25rem">
                            Twilio Viewer
                        </v-list-item-title>
                    </template>
                </v-list-item>
            </v-list>
            <v-divider></v-divider>
            <v-list :lines="false">
                <v-list-item v-for="(route, i) in routes" :key="i" :value="route" active-color="primary" :to="route.path">
                    <template v-slot:prepend>
                        <span class="material-icons v-icon notranslate v-theme--dark v-icon--size-default">{{
                            route.meta.icon }}</span>
                    </template>

                    <v-list-item-title v-text="route.name"></v-list-item-title>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>
        <slot></slot>
    </v-app>
</template>
  
<script setup>
useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} | Twilio Viewer` : "Twilio Viewer";
    },
    meta: [
        { name: "description", content: "Easy viewing of Twilio accounts, subaccounts, and related resources (such as message, and voice call logs)." }
    ],
    link: [
        {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
        },
        {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: "",
        },
        {
            rel: "icon",
            type: "image/png",
            href: "/icon.png",
        },
        {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Roboto&display=swap",
        },
        {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css?family=Material+Icons",
        },
    ],
});

const routes = [
    { path: "/", name: "Auth", meta: { icon: "key" } },
    {
        path: "/phone-numbers",
        name: "Phone numbers",
        meta: { icon: "phone" },
    },
    {
        path: "/message-history",
        name: "Message history",
        meta: { icon: "speaker_notes" },
    },
    {
        path: "/voice-call-history",
        name: "Voice call history",
        meta: { icon: "settings_voice" },
    },
    {
        path: "/alerts",
        name: "Alerts",
        meta: { icon: "error" },
    },
    {
        path: "/events",
        name: "Events",
        meta: { icon: "change_history" },
    },
];

function reloadWebsite() {
    location.replace("/");
}
</script>
  