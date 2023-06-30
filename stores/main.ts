import { defineStore } from "pinia";
import { Connection, SubAccount } from "utils/db";

export const useMainStore = defineStore("main", () => {
    const account_sid = ref("");
    const active_account_sid = ref("");
    const auth_token = ref("");
    const connection_name = ref("");
    const saved_connections = ref([] as Array<Connection>);
    const subaccounts = ref([] as Array<SubAccount>);
    const accounts_and_sub = ref([] as Array<any>)

    async function savedConnectionsFill({ forceRefresh = false } = {}) {
        // when there are no values in the store or force refresh required, get it from the db, otherwise skip
        if (!saved_connections.value.length || forceRefresh) {
            const connections = await db.connections.orderBy("name").toArray();
            if (connections?.length) {
                const connectionInUse = connections.find(x => x.in_use === true);

                // when a conection is already in use, set active connection fields
                if (connectionInUse) {
                    account_sid.value = active_account_sid.value = connectionInUse.account_sid;
                    auth_token.value = connectionInUse.auth_token;
                    connection_name.value = connectionInUse.name;

                    // also fill subaccounts
                    subaccounts.value = await db.subaccounts.where({ owner_account_sid: connectionInUse.account_sid }).sortBy("name");

                    // populate all accounts list
                    // accounts_and_sub.value = [{ sid: account_sid.value, name: connection_name.value }].concat(subaccounts.value);
                    accounts_and_sub.value = [{ sid: account_sid.value, name: connection_name.value }].concat([{ sid: account_sid.value + "1", name: connection_name.value }]);
                }
            }

            saved_connections.value = connections;
        }
    }

    return {
        // state variables
        account_sid,
        active_account_sid,
        auth_token,
        connection_name,
        subaccounts,
        saved_connections,
        accounts_and_sub,

        // state methods
        savedConnectionsFill,
    };
});
