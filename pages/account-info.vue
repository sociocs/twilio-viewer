<template>
    <v-app-bar title="Account info">
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
            <v-card>
                <v-card-text>
                    <table is="vue:v-table">
                        <tbody>
                            <tr v-for="item in state.records">
                                <th>{{ item.label }}</th>
                                <td>{{ item.value }}</td>
                            </tr>
                        </tbody>
                    </table>
                </v-card-text>
            </v-card>
        </v-sheet>
    </v-main>
</template>

<script setup lang="ts">
import { toLabelValArray } from "~/utils/helpers";
import { useMainStore } from "~/stores/main";

const store = useMainStore();

const state = ref({
    loading: true,
    error: "",
    records: [] as Array<any>,
});

async function loadData(refreshCache: boolean) {
    state.value.loading = true;

    const [error, result] = await callTwilioAPI({ path: `/2010-04-01/Accounts/${store.active_account_sid}.json`, refreshCache });

    state.value.error = error;
    if (!error) {
        state.value.records = toLabelValArray(result, ["sid", "owner_account_sid", "friendly_name", "type", "status", "date_created", "date_updated"]);;
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
</script>