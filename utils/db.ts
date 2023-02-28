import Dexie from "dexie";

const db = new Dexie("twilio-viewer-db");

// db schema
db.version(1).stores({
    connections: `account_sid,name`,
});

export default db;