import { defineStore } from "pinia";
import { Connection, SubAccount } from "../utils/db";

export const useMainStore = defineStore("main", {
    state: () => ({
        account_sid: "",
        active_account_sid: "",
        auth_token: "",
        connection_name: "",
        subaccounts: [] as Array<SubAccount>,
        saved_connections: [] as Array<Connection>,
        loading: false,
    }),
    getters: {
        activeAccountSid: (state) => state.active_account_sid || state.account_sid,
        accounts: (state) => [{ sid: state.account_sid, name: state.connection_name }].concat(state.subaccounts),
        saveConnections: async (state) => {
            if (!state.saved_connections.length) {
                const connections = await db.connections.orderBy("name").toArray();

                if (connections?.length) {
                    const connectionInUse = connections.find(x => x.in_use === true);

                    if (connectionInUse) {
                        state.account_sid = connectionInUse.account_sid;
                        state.auth_token = connectionInUse.auth_token;
                        state.connection_name = connectionInUse.name;
                    }
                }

                state.saved_connections = connections;
            }
        },
    },
});