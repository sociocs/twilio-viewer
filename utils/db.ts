import Dexie, { Table } from "dexie";

export interface Connection {
    account_sid: string;
    auth_token: string;
    name: string;
    in_use: boolean;
    status: string;
    created_at: number,
    saved_at: number,
}

export interface Subaccount {
    sid: string;
    owner_account_sid: string;
    name: string;
    status: string;
    created_at: number,
    loaded_at: number,
}

export class MySubClassedDexie extends Dexie {
    // Tabeles are added by dexie when declaring the stores()
    // We just tell the typing system this is the case
    connections!: Table<Connection>;
    subaccounts!: Table<Subaccount>;

    constructor() {
        super("twilio-viewer-db");
        // db schema
        // we only define primary and indexed keys in the schema
        this.version(2).stores({
            connections: `account_sid,name`,
            subaccounts: `sid,owner_account_sid,name`,
        });
    }
}

const db = new MySubClassedDexie();

export async function dbResetInUse() {
    await db.connections.toCollection().modify({ in_use: false });
}

export async function dbSetInUse(accountSid: string) {
    await db.connections.update(accountSid, { in_use: true });
}

export async function dbSaveConnection(connection: Connection) {
    await db.connections.put(connection);
}

export function dbGetAllConnections() {
    return db.connections.orderBy("name").toArray();
}

export function dbGetConnection(accountSid: string) {
    return db.connections.get(accountSid);
}

export async function dbGetFirstConnection() {
    const results = await db.connections.orderBy("name").limit(1).toArray();

    if (results?.length) {
        return results[0];
    }

    return null;
}

export async function dbDeleteConnection(accountSid: string) {
    await db.connections.delete(accountSid);
}

export async function dbSaveSubaccounts(subaccounts: Array<Subaccount>) {
    await db.subaccounts.bulkPut(subaccounts);
}

export function dbGetSubaccounts(ownerAccountSid: string) {
    return db.subaccounts.where({ owner_account_sid: ownerAccountSid }).sortBy("name");
}
