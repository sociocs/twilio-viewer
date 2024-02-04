<template>
    <v-app-bar title="Messaging services">
        <template v-slot:append>
            <AccountPickList v-model="store.account_sid" :accounts_and_sub="store.accounts_and_sub" :disabled="true">
            </AccountPickList>
            <Refresh :loading="state.loading" @click="loadData(true)"></Refresh>
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
                        <th>Friendly name</th>
                        <th>Settings</th>
                        <th>Webhook URLs</th>
                        <th>Date created</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="r in state.records" :key="r.sid">
                        <td>
                            <div style="max-width: 100px;" class="text-truncate" :title="r.sid">
                                {{ r.sid }}
                            </div>
                        </td>
                        <td>{{ r.friendly_name }}</td>
                        <td>
                            <v-list lines="one" density="compact" variant="text" class="py-0">
                                <v-list-item v-for="c in settings(r)" :key="c.label" :title="c.label" :subtitle="c.value"
                                    class="px-0"></v-list-item>
                            </v-list>
                        </td>
                        <td>
                            <v-list lines="one" density="compact" variant="text" class="py-0">
                                <v-list-item v-for="url in urls(r)" :key="url.label" :title="url.label"
                                    :subtitle="url.value" class="px-0 text-truncate"></v-list-item>
                            </v-list>
                        </td>
                        <td :title="r.date_created">{{ localDate(r.date_created) }}</td>
                    </tr>
                </tbody>
            </table>
        </v-sheet>
    </v-main>
</template>

<script setup lang="ts">
useSeoMeta({
    title: "Twilio Account Messaging Services",
    description: "Your Twilio account's messaging services in an easy to view format.",
});

const store = useMainStore();

const state = ref({
    loading: true,
    error: "",
    records: [] as Array<any>,
});

async function loadData(refreshCache: boolean) {
    state.value.loading = true;

    const [error, result] = await twloFetchMessagingServices({ accountSid: store.active_account_sid, refreshCache });

    state.value.error = error;
    if (!error) {
        state.value.records = result.services;
    }

    state.value.loading = false;
}

// load initial data
onMounted(() => {
    loadData(false);
})

// when store.active_account_sid changes, data should refreshed
watch(
    () => store.active_account_sid,
    () => loadData(false),
)

function urls(obj: Record<string, any>) {
    return toLabelValArray(obj, ["inbound_request_url", "inbound_method", "fallback_url", "fallback_method", "status_callback", "use_inbound_webhook_on_number"]);
}

function settings(obj: Record<string, any>) {
    return toLabelValArray(obj, ["area_code_geomatch", "fallback_to_long_code", "smart_encoding", "sticky_sender", "mms_converter", "us_app_to_person_registered", "usecase", "validity_period"]);
}
</script>