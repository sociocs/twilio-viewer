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
            <v-layout v-if="state.next_page_url" v-intersect="loadMore">
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
    next_page_url: "",
});

function loadingOn() {
    state.value.loading = true;
}

function loadingOff() {
    state.value.loading = false;
}

function setNextPageUrl(value: string) {
    state.value.next_page_url = value;
}

async function loadData(refreshCache: boolean, { appendResults = false } = {}) {
    const [error, result] = await twloFetchCalls({ accountSid: store.active_account_sid, from: state.value.form.from, to: state.value.form.to, fromDate: state.value.form.from_date, toDate: state.value.form.to_date, nextPageUrl: state.value.next_page_url, refreshCache });

    state.value.error = error;

    if (error) {
        // when there is an error, pagination should stop
        setNextPageUrl("");
    } else {
        // when appendResults is asked, append to the records instead of replacing
        if (appendResults) {
            (result.calls as Array<any>).forEach(x => state.value.records.push(x));
        } else {
            state.value.records = result.calls;
        }

        // save next page uril for pagination
        setNextPageUrl(result.next_page_uri);
    }
}

function refresh() {
    loadingOn();

    setNextPageUrl("");

    loadData(true).then(() => loadingOff());
}

// load initial data
onMounted(() => {
    loadData(false).then(() => loadingOff());
})

// when store.active_account_sid changes, data should refreshed
watch(
    () => store.active_account_sid,
    async () => {
        loadingOn();

        setNextPageUrl("");

        await loadData(false);

        loadingOff()
    },
)

async function search() {
    setNextPageUrl("");
    const form = state.value.form;

    if (!form.from && !form.to && !form.from_date && !form.to_date) {
        return refresh();
    }

    state.value.searching = true;

    await loadData(true);

    state.value.searching = false;
}

async function loadMore(isIntersecting: boolean) {
    if (!isIntersecting || !state.value.next_page_url || state.value.loading_more) {
        return;
    }

    state.value.loading_more = true;

    await loadData(true, { appendResults: true });

    state.value.loading_more = false;
}

function duration(val: any) {
    return val + "s";
}

function price(record: any) {
    const formattedPrice = record.price ? formatPrice(record.price) : "-";

    return `${record.price_unit?.toUpperCase()} ${formattedPrice}`;
}
</script>