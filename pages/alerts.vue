<template>
    <v-app-bar title="Alerts">
        <template v-slot:append>
            <AccountPickList v-model="store.active_account_sid" :accounts_and_sub="store.accounts_and_sub" :disabled="true">
            </AccountPickList>
            <Refresh :loading="state.loading" @click="refresh"></Refresh>
        </template>
    </v-app-bar>

    <v-main>
        <template v-if="state.loading">
            <LoadingIndicatorRow></LoadingIndicatorRow>
        </template>
        <template v-else-if="state.error">
            <ErrorAlertBox :text="state.error"></ErrorAlertBox>
        </template>
        <v-sheet v-else>
            <v-container>
                <v-form @submit.prevent="search">
                    <v-row class="align-center">
                        <v-col>
                            <v-select v-model="state.form.log_level" :items="state.log_level_options" item-title="label"
                                item-value="value" label="Log level" hide-details="auto" density="compact"
                                single-line></v-select>
                        </v-col>

                        <v-col>
                            <v-text-field v-model="state.form.from_date" label="From date" hide-details="auto" type="date"
                                density="compact" placeholder="e.g. 2023-03-01"></v-text-field>
                        </v-col>

                        <v-col>
                            <v-text-field v-model="state.form.to_date" label="To date" hide-details="auto" type="date"
                                density="compact" placeholder="e.g. 2023-03-02"></v-text-field>
                        </v-col>

                        <v-col cols="12" md="1">
                            <v-btn type="submit" variant="outlined" color="primary" :loading="state.searching"
                                :disabled="state.searching">Search</v-btn>
                        </v-col>
                    </v-row>
                </v-form>
            </v-container>

            <template v-if="!state.records?.length">
                <NoRecordsAlertBox></NoRecordsAlertBox>
            </template>

            <table v-else is="vue:v-table">
                <thead>
                    <tr>
                        <th class="text-center">Level</th>
                        <th>Resource SID</th>
                        <th>Date</th>
                        <th>Alert text</th>
                        <th class="text-center">Error code</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="r in state.records" :key="r.sid">
                        <td class="text-center">{{ r.log_level }}</td>
                        <td>
                            <div style="max-width: 100px;" class="text-truncate" :title="r.resource_sid">
                                {{ r.resource_sid }}
                            </div>
                        </td>
                        <td :title="r.date_generated">{{ localDate(r.date_generated) }}</td>
                        <td>
                            <v-list lines="one" density="compact" variant="text" class="py-0">
                                <v-list-item v-for="item in alertTextTokens(r.alert_text)" :key="item.label"
                                    :title="item.label" :subtitle="item.value" class="px-0 text-truncate"></v-list-item>
                            </v-list>
                        </td>
                        <td class="text-center">
                            <a v-if="r.more_info" :href="r.more_info" target="_blank">{{ r.error_code }}</a>
                            <span v-else-if="r.error_code">{{ r.error_code }}</span>
                            <span v-else>None</span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <v-layout v-if="state.next_page_uri" v-intersect="loadMore">
                <v-progress-linear indeterminate height="6"></v-progress-linear>
            </v-layout>
        </v-sheet>
    </v-main>
</template>

<script setup lang="ts">
const store = useMainStore();

const state = ref({
    log_level_options: [
        { label: "All levels", value: "" },
        { label: "Error", value: "error" },
        { label: "Warning", value: "warning" },
        { label: "Notice", value: "notice" },
        { label: "Debug", value: "debug" },
    ],
    loading: true,
    searching: false,
    loading_more: false,
    form: {
        log_level: "",
        from_date: "",
        to_date: "",
    },
    error: "",
    records: [] as Array<any>,
    page_size: 20,
    next_page_uri: "",
});

async function loadData(refreshCache: boolean, { path = `/Alerts?AccountSID=${store.active_account_sid}&PageSize=${state.value.page_size}`, appendResults = false } = {}) {
    const [error, result] = await callTwilioAPI({ baseUrl: "https://monitor.twilio.com/v1", path, refreshCache });

    state.value.error = error;

    if (error) {
        // when there is an error, pagination should stop
        state.value.next_page_uri = "";
    } else {
        // when appendResults is asked, append to the records instead of replacing
        if (appendResults) {
            (result.alerts as Array<any>).forEach(x => state.value.records.push(x));
        } else {
            state.value.records = result.alerts;
        }

        // save next page uril for pagination
        state.value.next_page_uri = result.next_page_url;
    }
}

function refresh() {
    state.value.loading = true;
    loadData(true).then(() => state.value.loading = false);
}

// load initial data
onMounted(() => {
    loadData(false).then(() => state.value.loading = false);
})

async function search() {
    const form = state.value.form;

    if (!form.log_level && !form.from_date && !form.to_date) {
        return refresh();
    }

    state.value.next_page_uri = "";
    state.value.searching = true;

    const searchList = [];
    if (form.log_level) {
        searchList.push(`LogLevel=${form.log_level}`);
    }
    if (form.from_date) {
        searchList.push(`StartDate=${form.from_date}`);
    }
    if (form.to_date) {
        searchList.push(`EndDate=${form.to_date}`);
    }
    const searchStr = searchList.join("&");

    await loadData(true, { path: `/Alerts?AccountSid=${store.active_account_sid}&PageSize=${state.value.page_size}&${searchStr}` });

    state.value.searching = false;
}

function loadMore() {
    if (!state.value.next_page_uri || state.value.loading_more) {
        return;
    }

    state.value.loading_more = true;

    setTimeout(async () => {
        loadData(true, { path: state.value.next_page_uri, appendResults: true });

        state.value.loading_more = false;
    }, 500);
}

function alertTextTokens(val: string) {
    if (!val) {
        return [{ value: "None" }];
    }

    const tokens = val.split("&");

    if (tokens?.length) {
        return tokens.map(x => {
            const keyVal = x.split("=");

            const result = {
                label: keyVal[0],
            } as Record<string, string>;

            if (keyVal.length > 1) {
                result.value = decodeURIComponent(keyVal[1]).replace(/\+/g, " ");
            }

            return result;
        });
    }

    return [{ label: val }];
}
</script>