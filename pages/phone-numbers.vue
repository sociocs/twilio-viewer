<template>
    <v-app-bar title="Phone numbers">
        <template v-slot:append>
            <AccountPickList v-model="store.active_account_sid" :accounts_and_sub="store.accounts_and_sub">
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
                        <th>Phone number</th>
                        <th>Capabilities</th>
                        <th>Webhook URLs</th>
                        <th>Status</th>
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
                        <td>
                            <div>
                                {{ r.phone_number }}
                            </div>
                            <v-list lines="one" density="compact" variant="text" class="py-0">
                                <v-list-item v-for="c in friendlyName(r)" :key="c.label" :title="c.label"
                                    :subtitle="c.value" class="px-0"></v-list-item>
                            </v-list>
                        </td>
                        <td>
                            <v-list lines="one" density="compact" variant="text" class="py-0">
                                <v-list-item v-for="c in capabilities(r.capabilities)" :key="c.label" :title="c.label"
                                    :subtitle="c.value" class="px-0"></v-list-item>
                            </v-list>
                        </td>
                        <td>
                            <v-list lines="one" density="compact" variant="text" class="py-0">
                                <v-list-item v-for="url in urls(r)" :key="url.label" :title="url.label"
                                    :subtitle="url.value" class="px-0 text-truncate"></v-list-item>
                            </v-list>
                        </td>
                        <td>{{ r.status }}</td>
                        <td :title="r.date_created">{{ localDate(r.date_created) }}</td>
                    </tr>
                </tbody>
            </table>
        </v-sheet>
    </v-main>
</template>

<script setup lang="ts">
useSeoMeta({
    title: "Twilio Phone Numbers",
    description: "Your Twilio account's phone numbers in an easy to view format.",
});

const store = useMainStore();

const state = ref({
    loading: true,
    error: "",
    records: [] as Array<any>,
});

async function loadData(refreshCache: boolean) {
    state.value.loading = true;

    const [error, result] = await twloFetchIncomingPhoneNumbers({ accountSid: store.active_account_sid, refreshCache });

    state.value.error = error;
    if (!error) {
        state.value.records = result.incoming_phone_numbers;
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
    return toLabelValArray(obj, ["sms_url", "sms_fallback_url", "voice_url", "voice_fallback_url", "status_callback"]);
}

function capabilities(obj: Record<string, any>) {
    return toLabelValArray(obj, ["sms", "mms", "voice"]);
}

function friendlyName(obj: Record<string, any>) {
    return toLabelValArray({ friendly_name: obj.friendly_name }, ["friendly_name"]);
}
</script>