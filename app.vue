<template>
    <NuxtLayout>
        <template v-if="state.criticalDataLoading">
            <v-main>
                <v-container fluid>
                    <LoadingIndicatorRow></LoadingIndicatorRow>
                </v-container>
            </v-main>
        </template>
        <NuxtPage v-else />
    </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
    titleTemplate: (pageTitle) => {
        return pageTitle ? `${pageTitle} - Twilio Viewer` : "Twilio Viewer";
    },
});

// critical data points for all the routes needs to be loaded upfront
const store = useMainStore();

const state = ref({
    criticalDataLoading: true,
});

store.savedConnectionsFill().then(() => {
    state.value.criticalDataLoading = false;
});
</script>

<style>
table,
table .v-list-item-subtitle {
    font-size: 0.85rem;
}

table .v-list-item-title {
    font-size: 0.9rem;
}

.v-autocomplete__selection {
    max-width: 100% !important;
}
</style>