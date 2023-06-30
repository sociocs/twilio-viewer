<template>
    <v-app-bar title="Voice call history">
        <template v-slot:append>
            <AccountPickList v-model="store.active_account_sid" :accounts_and_sub="store.accounts_and_sub">
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
                            <v-text-field v-model="state.form.from" label="From number" hide-details="auto"
                                density="compact" placeholder="e.g. 16319999998"></v-text-field>
                        </v-col>

                        <v-col>
                            <v-text-field v-model="state.form.to" label="To number" hide-details="auto" density="compact"
                                placeholder="e.g. 16319999999"></v-text-field>
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
                        <th>SID</th>
                        <th class="text-center">Direction</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Start time</th>
                        <th>End time</th>
                        <th class="text-center">Duration</th>
                        <th class="text-center">Status</th>
                        <th class="text-center">Price</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="r in state.records" :key="r.sid">
                        <td>
                            <div style="max-width: 100px;" class="text-truncate" :title="r.sid">
                                {{ r.sid }}
                            </div>
                        </td>
                        <td class="text-center">{{ r.direction }}</td>
                        <td>{{ r.from }}</td>
                        <td>{{ r.to }}</td>
                        <td :title="r.start_time">{{ localDate(r.start_time) }}</td>
                        <td :title="r.end_time">{{ localDate(r.end_time) }}</td>
                        <td class="text-center">{{ duration(r.duration) }}</td>
                        <td class="text-center">{{ r.status }}</td>
                        <td class="text-center">{{ price(r) }}</td>
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
    loading: true,
    searching: false,
    loading_more: false,
    form: {
        from: "",
        to: "",
        from_date: "",
        to_date: "",
    },
    error: "",
    records: [] as Array<any>,
    page_size: 20,
    next_page_uri: "",
});

async function loadData(refreshCache: boolean, { path = `/2010-04-01/Accounts/${store.active_account_sid}/Calls.json?PageSize=${state.value.page_size}`, appendResults = false } = {}) {
    const [error, result] = await callTwilioAPI({ path, refreshCache });

    state.value.error = error;

    if (error) {
        // when there is an error, pagination should stop
        state.value.next_page_uri = "";
    } else {
        // when appendResults is asked, append to the records instead of replacing
        if (appendResults) {
            (result.calls as Array<any>).forEach(x => state.value.records.push(x));
        } else {
            state.value.records = result.calls;
        }

        // save next page uril for pagination
        state.value.next_page_uri = result.next_page_uri;
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

// when store.active_account_sid changes, data should refreshed
watch(
    () => store.active_account_sid,
    () => loadData(false),
)

async function search() {
    const form = state.value.form;

    if (!form.from && !form.to && !form.from_date && !form.to_date) {
        return refresh();
    }

    state.value.next_page_uri = "";
    state.value.searching = true;

    const searchList = [];
    if (form.from) {
        searchList.push(`From=${form.from}`);
    }
    if (form.to) {
        searchList.push(`To=${form.to}`);
    }
    if (form.from_date) {
        searchList.push(`StartTime>=${form.from_date}`);
    }
    if (form.to_date) {
        searchList.push(`EndTime<=${form.to_date}`);
    }
    const searchStr = searchList.join("&");

    await loadData(true, { path: `/2010-04-01/Accounts/${store.active_account_sid}/Calls.json?PageSize=${state.value.page_size}&${searchStr}` });

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

function duration(val: any) {
    return val + "s";
}

function price(record: any) {
    const formattedPrice = record.price ? formatPrice(record.price) : "-";

    return `${record.price_unit?.toUpperCase()} ${formattedPrice}`;
}
</script>