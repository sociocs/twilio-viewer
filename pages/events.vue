<template>
    <v-app-bar title="Events">
        <template v-slot:append>
            <AccountPickList v-model="store.account_sid" :accounts_and_sub="store.accounts_and_sub" :disabled="true">
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
                            <v-text-field v-model="state.form.event_type" label="Event type" hide-details="auto"
                                density="compact" placeholder="e.g. phone-number.updated"></v-text-field>
                        </v-col>

                        <v-col cols="12" md="4">
                            <v-text-field v-model="state.form.resource_sid" label="Resource SID" hide-details="auto"
                                density="compact" placeholder="e.g. PN12345..."></v-text-field>
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
                        <th class="text-center">Event type</th>
                        <th>Resource SID</th>
                        <th>Date</th>
                        <th class="text-center">Source</th>
                        <th>Actor</th>
                        <th>Description</th>
                        <th>More info</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="r in state.records" :key="r.sid">
                        <td class="text-center">{{ r.event_type }}</td>
                        <td>
                            <div style="max-width: 100px;" class="text-truncate" :title="r.resource_sid">
                                {{ r.resource_sid }}
                            </div>
                        </td>
                        <td :title="r.event_date">{{ localDate(r.event_date) }}</td>
                        <td class="text-center">{{ r.source }}</td>
                        <td>{{ actor(r) }}</td>
                        <td>{{ r.description }}</td>
                        <td>
                            <v-list lines="one" density="compact" variant="text" class="py-0">
                                <v-list-item v-for="item in eventDataItems(r.event_data)" :key="item.label"
                                    :title="item.label" :subtitle="item.value" class="px-0 text-truncate"></v-list-item>
                            </v-list>
                        </td>
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
        event_type: "",
        resource_sid: "",
        from_date: "",
        to_date: "",
    },
    error: "",
    records: [] as Array<any>,
    next_page_url: "",
});

async function loadData(refreshCache: boolean, { appendResults = false } = {}) {
    const [error, result] = await twloFetchEvents({ accountSid: store.active_account_sid, eventType: state.value.form.event_type, resourceSid: state.value.form.resource_sid, fromDate: state.value.form.from_date, toDate: state.value.form.to_date, nextPageUrl: state.value.next_page_url, refreshCache });

    state.value.error = error;

    if (error) {
        // when there is an error, pagination should stop
        state.value.next_page_url = "";
    } else {
        // when appendResults is asked, append to the records instead of replacing
        if (appendResults) {
            (result.events as Array<any>).forEach(x => state.value.records.push(x));
        } else {
            state.value.records = result.events;
        }

        // save next page uril for pagination
        state.value.next_page_url = result.meta?.next_page_url;
    }
}

function refresh() {
    state.value.next_page_url = "";

    state.value.loading = true;

    loadData(true).then(() => state.value.loading = false);
}

// load initial data
onMounted(() => {
    loadData(false).then(() => state.value.loading = false);
})

async function search() {
    state.value.next_page_url = "";
    const form = state.value.form;

    if (!form.event_type && !form.resource_sid && !form.from_date && !form.to_date) {
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

function actor(record: any) {
    let result = record.actor_type;

    if (record.actor_sid) {
        result += " - " + record.actor_sid;
    }

    return result;
}

function eventDataItems(val: any) {
    if (!val) {
        return [{ value: "None" }];
    }

    const flatObj = flattenObject(val);

    return toLabelValArray(flatObj, Object.keys(flatObj));
}
</script>