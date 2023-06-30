import Dexie, { Table } from "dexie";

export interface Connection {
    account_sid: string;
    auth_token: string;
    name: string;
    in_use: boolean;
}

export interface SubAccount {
    sid: string;
    owner_account_sid: string;
    name: string;
}

export class MySubClassedDexie extends Dexie {
    // Tabeles are added by dexie when declaring the stores()
    // We just tell the typing system this is the case
    connections!: Table<Connection>;
    subaccounts!: Table<SubAccount>;

    constructor() {
        super("twilio-viewer-db");
        // db schema
        this.version(2).stores({
            connections: `account_sid,name`,
            subaccounts: `sid,owner_account_sid,name`,
        });
    }
}

export const db = new MySubClassedDexie();
