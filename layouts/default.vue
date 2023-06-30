<template>
    <v-app>
        <v-navigation-drawer theme="dark" permanent>
            <v-list>
                <v-list-item @click="reloadWebsite">
                    <template v-slot:prepend>
                        <v-img src="/icon.svg" height="32" width="32" class="me-2"></v-img>
                        <v-list-item-title style="font-size: 1.25rem;">
                            Twilio Viewer
                        </v-list-item-title>
                    </template>
                </v-list-item>
            </v-list>
            <v-divider></v-divider>
            <v-list :lines="false" color="primary">
                <v-list-item prepend-icon="mdi-key-variant" title="Auth" to="/"></v-list-item>
                <v-list-item prepend-icon="mdi-information" title="Account info" to="/account-info"></v-list-item>
                <v-list-item prepend-icon="mdi-phone" title="Phone numbers" to="/phone-numbers"></v-list-item>
                <v-list-item prepend-icon="mdi-message-text-fast" title="Messaging services"
                    to="/messaging-services"></v-list-item>
                <v-list-item prepend-icon="mdi-message-bulleted" title="Message history"
                    to="/message-history"></v-list-item>
                <v-list-item prepend-icon="mdi-microphone-settings" title="Voice call history"
                    to="/voice-call-history"></v-list-item>
                <v-list-item prepend-icon="mdi-alert" title="Alerts" to="/alerts"></v-list-item>
                <v-list-item prepend-icon="mdi-delta" title="Events" to="/events"></v-list-item>
                <v-list-item prepend-icon="mdi-receipt-text" title="Billing" to="/billing"></v-list-item>
            </v-list>
            <template v-slot:append>
                <v-divider></v-divider>
                <div class="text-center pa-2">
                    <a href="https://github.com/sociocs/twilio-viewer" target="_blank"
                        class="text-white text-decoration-none mx-1" title="Code on GitHub.">
                        <v-icon icon="mdi-github"></v-icon>
                    </a>
                    <a href="https://github.com/sociocs/twilio-viewer#twilio-viewer" target="_blank"
                        class="text-white text-decoration-none mx-1" title="Informtion about the tool.">
                        <v-icon icon="mdi-information-outline"></v-icon>
                    </a>
                </div>
            </template>
        </v-navigation-drawer>
        <slot />
    </v-app>
</template>

<script setup lang="ts">
function reloadWebsite() {
    location.replace("/");
}
</script>