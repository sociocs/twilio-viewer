import Dexie, { type Table } from "dexie";
import type { Connection, Subaccount } from "~/types";

export class TwilioViewerDB extends Dexie {
  // Tabeles are added by dexie when declaring the stores()
  // We just tell the typing system this is the case
  connections!: Table<Connection, string>;
  subaccounts!: Table<Subaccount, string>;

  constructor() {
    super("twilio-viewer-db");

    // we only define primary and indexed keys in the schema
    this.version(2).stores({
      connections: "account_sid, name",
      subaccounts: "sid, owner_account_sid, name",
    });

    this.version(3).stores({
      connections: "account_sid, name, in_use",
      subaccounts: "sid, owner_account_sid, name",
    });
  }
}

let dbInstance: TwilioViewerDB | null = null;

export function getDb(): TwilioViewerDB {
  if (!dbInstance) {
    dbInstance = new TwilioViewerDB();
  }
  return dbInstance;
}

export async function dbResetInUse(): Promise<void> {
  const db = getDb();
  await db.connections.toCollection().modify({ in_use: false });
}

export async function dbSetInUse(accountSid: string): Promise<void> {
  const db = getDb();
  await db.connections.update(accountSid, { in_use: true });
}

export async function dbSaveConnection(connection: Connection): Promise<void> {
  const db = getDb();
  await db.connections.put(connection);
}

export async function dbUpdateConnectionName(accountSid: string, name: string): Promise<void> {
  const db = getDb();
  await db.connections.update(accountSid, { name });
}

export async function dbUpdateConnectionFriendlyName(accountSid: string, friendlyName: string): Promise<void> {
  const db = getDb();
  await db.connections.update(accountSid, { friendly_name: friendlyName });
}

export async function dbGetAllConnections(): Promise<Connection[]> {
  const db = getDb();
  return await db.connections.orderBy("name").toArray();
}

export async function dbGetConnection(accountSid: string): Promise<Connection | undefined> {
  const db = getDb();
  return await db.connections.get(accountSid);
}

export async function dbGetFirstConnection(): Promise<Connection | null> {
  const db = getDb();
  const results = await db.connections.orderBy("name").limit(1).toArray();
  return results.length > 0 && results[0] ? results[0] : null;
}

export async function dbDeleteConnection(accountSid: string): Promise<void> {
  const db = getDb();
  await db.connections.delete(accountSid);
  await db.subaccounts.where({ owner_account_sid: accountSid }).delete();
}

export async function dbSaveSubaccounts(subaccounts: Subaccount[]): Promise<void> {
  const db = getDb();
  await db.subaccounts.bulkPut(subaccounts);
}

export async function dbGetSubaccounts(ownerAccountSid: string): Promise<Subaccount[]> {
  const db = getDb();
  return await db.subaccounts.where({ owner_account_sid: ownerAccountSid }).sortBy("name");
}

export async function dbDeleteSubaccounts(ownerAccountSid: string): Promise<void> {
  const db = getDb();
  await db.subaccounts.where({ owner_account_sid: ownerAccountSid }).delete();
}
