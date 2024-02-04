<template>
    <v-app-bar :title="state.title">
        <template v-slot:prepend>
            <v-btn icon class="hidden-xs-only" @click="$router.back">
                <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
        </template>
        <template v-slot:append>
            <v-btn
                icon="mdi-cached"
                :loading="state.loading"
                :disabled="state.loading"
                @click="refresh"
                title="Refresh subaccounts from Twilio."
            >
            </v-btn>
        </template>
    </v-app-bar>

    <v-main>
        <template v-if="state.loading">
            <LoadingIndicatorRow></LoadingIndicatorRow>
        </template>
        <template v-else-if="state.error">
            <ErrorAlertBox :text="state.error"></ErrorAlertBox>
        </template>
        <template v-else-if="!state.records?.length">
            <NoRecordsAlertBox></NoRecordsAlertBox>
        </template>
        <v-sheet v-else>
            <table is="vue:v-table">
                <thead>
                    <tr>
                        <th>SID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Created at</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="r in state.records" :key="r.sid">
                        <td>{{ r.sid }}</td>
                        <td>{{ r.name }}</td>
                        <td>{{ r.status }}</td>
                        <td>{{ localDate(r.created_at) }}</td>
                    </tr>
                </tbody>
            </table>
        </v-sheet>
    </v-main>
</template>

<script setup lang="ts">
useSeoMeta({
    title: "Twilio Subaccounts",
    description: "Your Twilio subaccounts in an easy to view format.",
});

const route = useRoute();
const store = useMainStore();

const state = ref({
    loading: true,
    title: "Subaccounts",
    error: "",
    records: [] as Array<any>,
});

function loadingOn() {
    state.value.loading = true;
}

function loadingOff() {
    state.value.loading = false;
}

async function loadData(refreshCache: boolean) {
    loadingOn();

    state.value.records = await dbGetSubaccounts(
        route.params.account_sid as string
    );

    loadingOff();
}

// load initial data
onMounted(async () => {
    // get account to add more info to the page title
    const account = await dbGetConnection(route.params.account_sid as string);
    if (account) {
        state.value.title += ` for ${account.name}`;
    }

    loadData(false);
});

async function refresh() {
    loadingOn();

    // fetch and persist subaccounts to db
    await store.fetchAndSaveSubaccounts();

    loadingOff();
}
</script>