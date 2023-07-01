<template>
    <v-app-bar title="Billing">
        <template v-slot:append>
            <v-sheet color="green-lighten-3" rounded class="pa-1 ps-3 mr-4 d-flex align-center">
                <span class="mr-2 font-weight-bold">Balance</span>
                <span class="mr-2" v-if="!state.loading_balance">{{ balanceStr() }}</span>
                <v-btn size="small" variant="text" icon="mdi-cached" :loading="state.loading_balance"
                    :disabled="state.loading_balance" @click="balanceRefresh" title="Refresh balance."></v-btn>
            </v-sheet>
            <AccountPickList v-model="store.active_account_sid" :accounts_and_sub="store.accounts_and_sub">
            </AccountPickList>
        </template>
    </v-app-bar>

    <v-main>
        <v-container>
            <v-form @submit.prevent="submit">
                <v-row class="align-center">
                    <v-col cols="12" md="3">
                        <v-sheet class="mb-1">
                            <v-chip :ripple="false" link size="small" class="me-1" @click="setDates('tm')">
                                This month
                            </v-chip>
                            <v-chip :ripple="false" link size="small" class="me-1" @click="setDates('tq')">
                                This quarter
                            </v-chip>
                            <v-chip :ripple="false" link size="small" @click="setDates('ty')">
                                This year
                            </v-chip>
                        </v-sheet>
                        <v-sheet>
                            <v-chip :ripple="false" link size="small" class="me-1" @click="setDates('lm')">
                                Last month
                            </v-chip>
                            <v-chip :ripple="false" link size="small" class="me-1" @click="setDates('lq')">
                                Last quarter
                            </v-chip>
                            <v-chip :ripple="false" link size="small" @click="setDates('ly')">
                                Last year
                            </v-chip>
                        </v-sheet>
                    </v-col>

                    <v-col cols="12" md="2">
                        <v-text-field v-model="state.form.from_date" label="From date" hide-details="auto" type="date"
                            density="compact" placeholder="e.g. 2023-03-01"></v-text-field>
                    </v-col>

                    <v-col cols="12" md="2">
                        <v-text-field v-model="state.form.to_date" label="To date" hide-details="auto" type="date"
                            density="compact" placeholder="e.g. 2023-03-02"></v-text-field>
                    </v-col>

                    <v-col cols="12" md="3">
                        <v-checkbox v-model="state.form.include_subaccounts" label="Include subaccounts"
                            hide-details="auto"></v-checkbox>
                    </v-col>

                    <v-col cols="12" md="2">
                        <v-btn type="submit" variant="outlined" color="primary" :loading="state.loading"
                            :disabled="state.loading">Go</v-btn>
                    </v-col>
                </v-row>
            </v-form>
        </v-container>

        <template v-if="state.loading">
            <LoadingIndicatorRow></LoadingIndicatorRow>
        </template>
        <template v-else-if="state.error">
            <ErrorAlertBox :text="state.error"></ErrorAlertBox>
        </template>
        <template v-else-if="!state.records?.length">
            <NoRecordsAlertBox></NoRecordsAlertBox>
        </template>

        <table v-else is="vue:v-table">
            <thead>
                <tr>
                    <th colspan="3">Category</th>
                    <th class="text-left">Count</th>
                    <th class="text-left">Chargeable Qty</th>
                    <th class="text-right">Cost</th>
                    <th class="text-center">As of</th>
                </tr>
            </thead>

            <tbody>
                <template v-for="item in state.records">
                    <tr class="font-weight-bold">
                        <td colspan="7">{{ item.group }}</td>
                    </tr>

                    <tr v-for="r in item.children">
                        <template v-if="r.level === 1">
                            <td colspan="3" :title="r.category_desc">
                                {{ r.description }}
                            </td>
                        </template>
                        <template v-else-if="r.level === 2">
                            <td></td>
                            <td colspan="2" :title="r.category_desc">
                                {{ r.description }}
                            </td>
                        </template>
                        <template v-else>
                            <td></td>
                            <td></td>
                            <td :title="r.category_desc">{{ r.description }}</td>
                        </template>
                        <td class="text-left">{{ count(r) }}</td>
                        <td class="text-left">{{ usage(r) }}</td>
                        <td class="text-right">{{ price(r) }}</td>
                        <td class="text-center" :title="r.as_of">{{ localDate(r.as_of) }}</td>
                    </tr>
                </template>
            </tbody>

            <tfoot class="font-weight-bold">
                <tr>
                    <td>Total</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class="text-right">{{ price(state.totals_record) }}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    </v-main>
</template>

<script setup lang="ts">
const store = useMainStore();

const state = ref({
    loading: true,
    loading_balance: false,
    form: {
        from_date: "",
        to_date: "",
        include_subaccounts: false,
    },
    error: "",
    balance: {} as Record<string, any>,
    records: [] as Array<any>,
    totals_record: {} as Record<string, any>,
    next_page_url: "",
});

async function loadBalance(refreshCache: boolean) {
    state.value.loading_balance = true;

    // get balance
    const [error, result] = await twloFetchAccountBalance({ accountSid: store.account_sid, refreshCache });

    if (error) {
        state.value.error = error;
    } else {
        state.value.balance = result;
    }

    state.value.loading_balance = false;
}

async function loadData(refreshCache: boolean) {
    state.value.loading = true;

    state.value.records = [];

    const [error, result] = await twloFetchUsageRecords({ accountSid: store.active_account_sid, fromDate: state.value.form.from_date, toDate: state.value.form.to_date, includeSubaccounts: state.value.form.include_subaccounts, refreshCache });

    state.value.error = error;

    if (!error) {
        // filter and map results
        let usage = [] as Array<Record<string, any>>;

        (result.usage_records as Array<Record<string, any>>).
            filter(x => parseInt(x.usage) > 0 || parseInt(x.count) > 0).
            map(x => {
                const categoryMap = billingCategoryMap.get(x.category) || billingCategoryMap.get("other");

                return { ...x, ...categoryMap };
            }).
            filter((x: Record<string, any>) => !x.ignore).
            sort((a: Record<string, any>, b: Record<string, any>) => a.level - b.level).
            forEach((x: Record<string, any>) => {
                if (x.category === "totalprice") {
                    // total price record is stored separately
                    state.value.totals_record = x;
                }
                else {
                    // all other records
                    let groupChildren = usage.find(y => y.group === x.group)?.children as Array<Record<string, any>>;
                    if (!groupChildren) {
                        groupChildren = [];
                        usage.push({ group: x.group, children: groupChildren });
                    }

                    // find first item with higher order than this entry
                    const nextItemIndex = groupChildren.findIndex(y => y.order > x.order);

                    if (nextItemIndex >= 0) {
                        groupChildren.splice(nextItemIndex, 0, x);
                    } else {
                        groupChildren.push(x);
                    }
                }
            });

        // sort final records by group, and add to state
        usage.
            sort((a, b) => a.group.localeCompare(b.group)).
            forEach(x => state.value.records.push(x));
    }

    state.value.loading = false;
}

function defaultDates() {
    const toDate = new Date();
    const fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

    return {
        from_date: fromDate.toLocaleDateString("fr-ca"),
        to_date: toDate.toLocaleDateString("fr-ca")
    };
}

// load initial data
onMounted(async () => {
    // make sure it's not a subaccount
    const conn = await dbGetConnection(store.account_sid);

    const defaultDts = defaultDates();

    // read preference and assing default values if needed
    const lsFromDate = localStorage.getItem("billing_search_from_date");
    state.value.form.from_date = lsFromDate ? lsFromDate : defaultDts.from_date;

    const lsToDate = localStorage.getItem("billing_search_to_date");
    state.value.form.to_date = lsToDate ? lsToDate : defaultDts.to_date;

    state.value.form.include_subaccounts = (localStorage.getItem("billing_search_include_subaccounts") === "true") ? true : false;

    loadBalance(false);
    loadData(false);
})

// when store.active_account_sid changes, data should refreshed
watch(
    () => store.active_account_sid,
    () => loadData(false)
)

// when form field changes, save them to local storage for quick page loading next time
watch(
    () => state.value.form.from_date,
    (value) => localStorage.setItem("billing_search_from_date", value)
)
watch(
    () => state.value.form.to_date,
    (value) => localStorage.setItem("billing_search_to_date", value)
)
watch(
    () => state.value.form.include_subaccounts,
    (value) => localStorage.setItem("billing_search_include_subaccounts", value.toString())
)

function balanceRefresh() {
    state.value.loading_balance = true;

    loadBalance(true).then(() => state.value.loading_balance = false);
}

function setDates(option: string) {
    const today = new Date();
    let quarter = Math.floor((today.getMonth() / 3));
    let toDate, fromDate;

    switch (option) {
        case "tm":
            toDate = today;
            fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
            break;

        case "lm":
            fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            toDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0);
            break;

        case "tq":
            fromDate = new Date(today.getFullYear(), quarter * 3, 1);
            toDate = today;
            break;

        case "lq":
            fromDate = new Date(today.getFullYear(), quarter * 3 - 3, 1);
            toDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 3, 0);
            break;

        case "ty":
            fromDate = new Date(today.getFullYear(), 0, 1);
            toDate = today;
            break;

        case "ly":
            fromDate = new Date(today.getFullYear() - 1, 0, 1);
            toDate = new Date(fromDate.getFullYear(), 11, 31);
            break;

        default:
            return;
    }

    state.value.form.from_date = fromDate.toLocaleDateString("fr-ca");
    state.value.form.to_date = toDate.toLocaleDateString("fr-ca");
}

async function submit() {
    const form = state.value.form;

    if (!form.from_date && !form.to_date) {
        return;
    }

    await loadData(true);
}

function balanceStr() {
    return `${state.value.balance?.currency} ${state.value.balance?.balance || "-"}`;
}

function count(record: any) {
    const cnt = (record.count) ? parseInt(record.count) : 0;

    return (record.count_unit) ? `${cnt} (${record.count_unit})` : cnt;
}

function usage(record: any) {
    const cnt = (record.usage) ? parseInt(record.usage) : 0;

    return (record.usage_unit) ? `${cnt} (${record.usage_unit})` : cnt;
}

function price(record: any) {
    const formattedPrice = record.price ? formatPrice(record.price) : "-";

    return `${record.price_unit?.toUpperCase()} ${formattedPrice}`;
}
</script>