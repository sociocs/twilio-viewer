import { defineStore } from "pinia";
import { twloFetchSubaccounts } from "~/utils/call-twilio-api";
import { Connection, Subaccount, dbDeleteConnection, dbGetAllConnections, dbGetConnection, dbGetFirstConnection, dbGetSubaccounts, dbResetInUse, dbSaveConnection, dbSaveSubaccounts, dbSetInUse } from "~/utils/db";

export const useMainStore = defineStore("main", () => {
    const account_sid = ref("");
    const active_account_sid = ref("");
    const auth_token = ref("");
    const connection_name = ref("");
    const saved_connections = ref([] as Array<Connection>);
    const subaccounts = ref([] as Array<Subaccount>);
    const accounts_and_sub = ref([] as Array<any>)

    async function _fetchAndSaveSubaccounts() {
        const subaccountsRaw = await twloFetchSubaccounts()

        const subaccounts = [];

        for (let i = 0; i < subaccountsRaw?.length; i++) {
            const account = subaccountsRaw[i];

            if (account.sid !== account.owner_account_sid) {
                subaccounts.push({
                    sid: account.sid,
                    owner_account_sid: account.owner_account_sid,
                    name: account.friendly_name,
                    status: account.status,
                    created_at: (new Date(account.date_created)).getTime(),
                    loaded_at: Date.now(),
                });
            }
        }

        if (subaccounts.length) {
            await dbSaveSubaccounts(subaccounts);
        }
    }

    function newConnection(accountSid: string, authToken: string, connectionName: string) {
        account_sid.value = active_account_sid.value = accountSid;
        auth_token.value = authToken;
        connection_name.value = connectionName;
    }

    async function removeConnection(accountSid: string) {
        // if connection is in use, switch to another one
        const conn = await dbGetConnection(accountSid);
        if (conn?.in_use) {
            const defaultConn = await dbGetFirstConnection();

            if (defaultConn) {
                switchInUseConnection(defaultConn.account_sid);
            }
        }

        // delete connection
        await dbDeleteConnection(accountSid);

        // fill store with the latest list of connections
        await savedConnectionsFill();
    }

    async function saveConnection(accountSid: string, authToken: string, connectionName: string, status: string, created_at: number, setAsInUse = true) {
        if (setAsInUse) {
            // remove in_use from other records
            await dbResetInUse();
        }

        // save connection
        await dbSaveConnection({
            account_sid: accountSid,
            auth_token: authToken,
            name: connectionName,
            in_use: setAsInUse,
            status,
            created_at,
            saved_at: Date.now(),
        });

        // save subaccounts
        _fetchAndSaveSubaccounts();

        // fill store with the latest list of connections
        await savedConnectionsFill();
    }

    async function savedConnectionsFill() {
        const connections = await dbGetAllConnections();
        if (connections?.length) {
            const connectionInUse = connections.find(x => x.in_use === true);

            // when a conection is already in use, set active connection fields
            if (connectionInUse) {
                account_sid.value = active_account_sid.value = connectionInUse.account_sid;
                auth_token.value = connectionInUse.auth_token;
                connection_name.value = connectionInUse.name;

                // also fill subaccounts
                subaccounts.value = await dbGetSubaccounts(connectionInUse.account_sid);

                // populate all accounts list
                // accounts_and_sub.value = [{ sid: account_sid.value, name: connection_name.value }].concat(subaccounts.value);
                accounts_and_sub.value = [{ sid: account_sid.value, name: connection_name.value }].concat([{ sid: account_sid.value + "1", name: connection_name.value }]);
            }
        }

        saved_connections.value = connections;
    }

    async function switchInUseConnection(accountSid: string) {
        // remove in_use from other records
        await dbResetInUse();

        // set in_use in the db for the given accountSid
        await dbSetInUse(accountSid);

        // fill store with the latest list of connections
        await savedConnectionsFill();
    }

    return {
        // state variables
        account_sid,
        accounts_and_sub,
        active_account_sid,
        auth_token,
        connection_name,
        saved_connections,
        subaccounts,

        // state methods
        newConnection,
        removeConnection,
        saveConnection,
        savedConnectionsFill,
        switchInUseConnection,
    };
});
