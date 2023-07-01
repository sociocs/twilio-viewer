<template>
    <v-app-bar title="Auth"></v-app-bar>

    <v-main>
        <v-container fluid>
            <!-- data loading -->
            <v-sheet v-if="state.loading" class="text-center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </v-sheet>

            <v-sheet v-else>
                <!-- tab menu -->
                <v-tabs v-model="state.tab" color="primary">
                    <v-tab value="new">New</v-tab>
                    <v-tab value="saved">Saved</v-tab>
                </v-tabs>

                <v-window v-model="state.tab">
                    <!-- new connection setup -->
                    <v-window-item value="new">
                        <v-sheet class="py-4">
                            <!-- new connection form -->
                            <v-form @submit.prevent="connect">
                                <template v-if="!store.saved_connections?.length">
                                    <v-alert type="info" title="Important Information" icon="mdi-firework" variant="tonal"
                                        class="mb-4">
                                        <template v-slot:text>
                                            <ul>
                                                <li>- This is an open source FREE tool. Code available on <a
                                                        href="https://github.com/sociocs/twilio-viewer"
                                                        target="_blank">GitHub</a>.
                                                </li>
                                                <li>
                                                    - All your information and data stays locally on your browser.
                                                </li>
                                                <li>
                                                    - It uses Twilio APIs directly from the browser to fetch data.
                                                    No third party servers are involved.
                                                </li>
                                                <li>
                                                    - A commercial solution (with a FREE plan) for two-way Twilio
                                                    text messaging, bulk messaging and more is available <a
                                                        href="https://www.sociocs.com/" target="_blank">here</a>.
                                                </li>
                                            </ul>
                                        </template>
                                    </v-alert>
                                </template>
                                <v-text-field v-model="state.form.account_sid" label="Account SID"
                                    :rules="[v => !!v || 'Required.']"></v-text-field>
                                <v-text-field v-model="state.form.auth_token" label="Auth token"
                                    :rules="[v => !!v || 'Required.']"></v-text-field>
                                <v-btn type="submit" class="mt-2" color="primary" :loading="state.processing"
                                    :disabled="state.processing">Connect</v-btn>
                            </v-form>
                        </v-sheet>

                        <v-sheet v-if="!state.processing && state.connect_result.account_info" class="pa-1">
                            <v-card title="Account information">
                                <v-card-text>
                                    <table is="vue:v-table">
                                        <tbody>
                                            <tr v-for="item in state.connect_result.account_info">
                                                <th>{{ item.label }}</th>
                                                <td>{{ item.value }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </v-card-text>
                            </v-card>
                            <v-card title="Save connection (optional)" class="mt-4">
                                <v-card-text>
                                    <v-alert
                                        text="Note: Twilio account SID and auth token are saved in plain text in your browser's database."
                                        type="warning" :icon="false" class="mb-3"></v-alert>

                                    <v-form @submit.prevent="saveConnection">
                                        <v-text-field v-model="state.form.connection_name" label="Connection name"
                                            :rules="[v => !!v || 'Required.']"></v-text-field>
                                        <v-btn type="submit" class="mt-2" color="primary" :loading="state.processing"
                                            :disabled="state.processing">Save</v-btn>
                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-sheet>
                    </v-window-item>

                    <!-- exiting connections listing -->
                    <v-window-item value="saved">
                        <v-sheet v-if="!store.saved_connections?.length" class="text-center py-4">
                            <v-alert text="There are no records available."></v-alert>
                        </v-sheet>
                        <v-sheet v-else class="py-4">
                            <table is="vue:v-table">
                                <thead>
                                    <tr>
                                        <th>Account SID</th>
                                        <th>Name</th>
                                        <th class="text-center">Currently using?</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="connection in store.saved_connections" :key="connection.account_sid">
                                        <td>{{ connection.account_sid }}</td>
                                        <td>{{ connection.name }}</td>
                                        <td class="text-center">
                                            <v-icon icon="mdi-check-bold" v-if="connection.in_use"
                                                title="Currently using this account." color="green-darken-2">
                                            </v-icon>
                                            <span v-else>
                                                <a href="#"
                                                    @click.prevent.stop="store.switchInUseConnection(connection.account_sid)"
                                                    title="Switch to this account.">Use</a>
                                            </span>
                                        </td>
                                        <td>
                                            <v-btn size="x-small" icon="mdi-delete" color="red" title="Remove account."
                                                @click="removeConnection(connection.account_sid)" :loading="state.removing"
                                                :disabled="state.removing" class="me-5">
                                            </v-btn>
                                            <v-btn size="x-small" icon="mdi-chevron-right" color="secondary"
                                                title="View subaccounts." :to="'/subaccounts/' + connection.account_sid">
                                            </v-btn>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </v-sheet>
                    </v-window-item>
                </v-window>
            </v-sheet>
        </v-container>
    </v-main>
</template>

<script setup lang="ts">
const store = useMainStore();

const state = ref({
    loading: false,
    processing: false,
    removing: false,

    tab: "new",

    form: {
        account_sid: "",
        auth_token: "",
        connection_name: "",
    },

    connect_result: {} as Record<string, any>,
});

onMounted(() => {
    // when there are saved connectinos, switch to the listing tab
    if (store.saved_connections.length) {
        state.value.tab = "saved";
    }
});

async function connect() {
    if (!state.value.form.account_sid || !state.value.form.auth_token) {
        return;
    }

    state.value.processing = true;
    state.value.connect_result = {};

    // get account info using the provided credentials
    const [error, result] = await twloFetchAccount({ accountSid: state.value.form.account_sid, authCredentials: state.value.form, refreshCache: true });

    if (error) {
        state.value.connect_result.error = error;
    } else if (result.status) {
        // set state account info for the display
        state.value.connect_result.account_info = toLabelValArray(result, ["friendly_name", "status", "date_created"]);

        // set state connection name for the saving form
        state.value.form.connection_name = result.friendly_name;

        // update store variables
        store.newConnection(state.value.form.account_sid, state.value.form.auth_token, state.value.form.connection_name);

        // add subaccount count in the account info for display
        const subaccounts = await twloFetchAccounts({ refreshCache: true });
        state.value.connect_result.account_info.push({
            label: "subaccount_count",
            value: subaccounts?.length || 0,
        });
    }

    state.value.processing = false;
}

function resetFormData() {
    const form = state.value.form;

    form.account_sid = "";
    form.auth_token = "";
    form.connection_name = "";
    state.value.connect_result = {};
}

async function saveConnection() {
    const form = state.value.form;

    if (!form.account_sid || !form.auth_token || !form.connection_name) {
        return;
    }

    const connectionInfo = state.value.connect_result.account_info;

    // save connection in store and db
    await store.saveConnection(form.account_sid, form.auth_token, form.connection_name, connectionInfo.status, (new Date(connectionInfo.date_created)).getTime(), true);

    // switch to saved tab
    state.value.tab = "saved";

    // reset form
    resetFormData();
}

async function removeConnection(accountSid: string) {
    state.value.removing = true;

    await store.removeConnection(accountSid);

    state.value.removing = false;
}

</script>
  