<template>
    <v-app-bar title="Auth"></v-app-bar>

    <v-main>
        <v-container fluid>
            <v-sheet v-if="loading" class="text-center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </v-sheet>
            <v-sheet v-else>
                <v-tabs v-model="tab" color="primary">
                    <v-tab value="new">New</v-tab>
                    <v-tab value="saved">Saved</v-tab>
                </v-tabs>

                <v-window v-model="tab">
                    <v-window-item value="new">
                        <v-sheet class="py-4">
                            <v-form @submit.prevent="connect">
                                <v-text-field v-model="form.account_sid" label="Account SID"
                                    :rules="[v => !!v || 'Required.']"></v-text-field>
                                <v-text-field v-model="form.auth_token" label="Auth token"
                                    :rules="[v => !!v || 'Required.']"></v-text-field>
                                <v-btn type="submit" class="mt-2" color="primary" :loading="processing"
                                    :disabled="processing">Connect</v-btn>
                            </v-form>
                        </v-sheet>
                        <v-sheet v-if="connect_result.account_info" class="pa-1">
                            <v-card title="Account information">
                                <v-card-text>
                                    <table is="vue:v-table">
                                        <tbody>
                                            <tr v-for="item in connect_result.account_info">
                                                <th>{{ item.label }}</th>
                                                <td>{{ item.value }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </v-card-text>
                            </v-card>
                            <v-card title="Save connection" class="mt-4">
                                <v-card-text>
                                    <v-alert
                                        text="Note: Twilio account SID and auth token are saved in plain text in your browser's database."
                                        type="warning" :icon="false" class="mb-3"></v-alert>

                                    <v-form @submit.prevent="saveConnection">
                                        <v-text-field v-model="form.connection_name" label="Connection name"
                                            :rules="[v => !!v || 'Required.']"></v-text-field>
                                        <v-btn type="submit" class="mt-2" color="primary" :loading="processing"
                                            :disabled="processing">Save</v-btn>
                                    </v-form>
                                </v-card-text>
                            </v-card>
                        </v-sheet>
                        <v-sheet v-else-if="connect_result.error">
                            <v-alert type="error" title="Error" :text="connect_result.error" :icon="false"></v-alert>
                        </v-sheet>
                    </v-window-item>

                    <v-window-item value="saved">
                        <v-sheet v-if="!saved_connections?.length" class="text-center py-4">
                            <v-alert text="There are no records available."></v-alert>
                        </v-sheet>
                        <v-sheet v-else class="py-4">
                            <table is="vue:v-table">
                                <thead>
                                    <tr>
                                        <th>Account SID</th>
                                        <th>Name</th>
                                        <th></th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="connection in saved_connections" :key="connection.account_sid">
                                        <td>{{ connection.account_sid }}</td>
                                        <td>{{ connection.name }}</td>
                                        <td class="text-center">
                                            <span v-if="connection.in_use" title="Currently using this account."
                                                class="material-icons text-green-darken-4">
                                                check
                                            </span>
                                            <span v-else>
                                                <a href="#" @click.prevent.stop="switchConnection(connection.account_sid)"
                                                    title="Switch to this account.">Use</a>
                                            </span>
                                        </td>
                                        <td>
                                            <v-btn icon variant="flat" title="Remove account."
                                                @click="removeConnection(connection.account_sid)" :loading="removing"
                                                :disabled="removing">
                                                <span class="material-icons text-red">
                                                    delete
                                                </span>
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

<script setup>

// initial values
const tab = ref("new");
const loading = ref(true);
const processing = ref(false);
const removing = ref(false);
const form = reactive({
    account_sid: "",
    auth_token: "",
    connection_name: "",
});
const saved_connections = reactive([]);
const connect_result = reactive({});

// start fetching data
loading.value = false;


</script>