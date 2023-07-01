import { useMainStore } from "~/stores/main";
import { AuthCredentials } from "./types";

// Calls given Twilio API path
// When credentials are not passed, reads it from the store
export async function callTwilioAPI({ baseUrl, path, method, body, authCredentials, refreshCache }: { baseUrl?: string, path: string, method?: string, body?: string, authCredentials?: AuthCredentials, refreshCache?: boolean }) {
    try {
        const store = useMainStore();

        const resp = await fetch(`${baseUrl || "https://api.twilio.com"}${path}`, {
            method: method || "GET",
            mode: "cors",
            cache: (refreshCache) ? "reload" : "force-cache",
            credentials: "omit", // do not negotiate using browser popup based credential
            headers: {
                "Authorization": "Basic " + btoa((authCredentials?.account_sid || store.account_sid) + ":" + (authCredentials?.auth_token || store.auth_token)),
            },
            body,
        });

        if (resp.ok) {
            return [null, (await resp.json())];
        } else {
            return [`${resp.status} ${resp.statusText}`, null];
        }
    } catch (error) {
        return [error, null];
    }
}

export async function twloFetchAccounts({ refreshCache = false } = {}) {
    const [_, result] = await callTwilioAPI({ path: `/2010-04-01/Accounts.json`, refreshCache });

    return result.accounts;
}

export function twloFetchAccount({ accountSid, authCredentials, refreshCache }: { accountSid: string, authCredentials?: AuthCredentials, refreshCache?: boolean }) {
    return callTwilioAPI({ path: `/2010-04-01/Accounts/${accountSid}.json`, authCredentials, refreshCache });
}

export function twloFetchIncomingPhoneNumbers({ accountSid, refreshCache }: { accountSid: string, refreshCache?: boolean }) {
    return callTwilioAPI({ path: `/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`, refreshCache });
}

export function twloFetchMessagingServices({ accountSid, refreshCache }: { accountSid: string, refreshCache?: boolean }) {
    return callTwilioAPI({ baseUrl: "https://messaging.twilio.com/v1", path: `/Services?AccountSID=${accountSid}`, refreshCache });
}

export function twloFetchMessages({ accountSid, from, to, fromDate, toDate, nextPageUrl, refreshCache }: { accountSid: string, from?: string, to?: string, fromDate?: string, toDate?: string, nextPageUrl?: string, refreshCache?: boolean }) {
    let path = `/2010-04-01/Accounts/${accountSid}/Messages.json`;

    if (nextPageUrl) {
        path = nextPageUrl;
    } else {
        const searchParams = new URLSearchParams();

        if (from) {
            searchParams.append("From", from);
        }
        if (to) {
            searchParams.append("To", to);
        }
        if (fromDate) {
            searchParams.append("FromDate>", fromDate);
        }
        if (toDate) {
            searchParams.append("ToDate<", toDate);
        }

        const qs = searchParams.toString();
        if (qs) {
            path += "?" + qs;
        }
    }

    return callTwilioAPI({ path, refreshCache });
}

export function twloFetchCalls({ accountSid, from, to, fromDate, toDate, nextPageUrl, refreshCache }: { accountSid: string, from?: string, to?: string, fromDate?: string, toDate?: string, nextPageUrl?: string, refreshCache?: boolean }) {
    let path = `/2010-04-01/Accounts/${accountSid}/Calls.json`;

    if (nextPageUrl) {
        path = nextPageUrl;
    } else {
        const searchParams = new URLSearchParams();

        if (from) {
            searchParams.append("From", from);
        }
        if (to) {
            searchParams.append("To", to);
        }
        if (fromDate) {
            searchParams.append("StartTime>", fromDate);
        }
        if (toDate) {
            searchParams.append("EndTime<", toDate);
        }

        const qs = searchParams.toString();
        if (qs) {
            path += "?" + qs;
        }
    }

    return callTwilioAPI({ path, refreshCache });
}

export function twloFetchAlerts({ accountSid, logLevel, fromDate, toDate, nextPageUrl, refreshCache }: { accountSid: string, logLevel?: string, fromDate?: string, toDate?: string, nextPageUrl?: string, refreshCache?: boolean }) {
    let baseUrl = "https://monitor.twilio.com/v1";
    let path = `/Alerts?AccountSID=${accountSid}`;

    if (nextPageUrl) {
        baseUrl = nextPageUrl;
        path = "";
    } else {
        const searchParams = new URLSearchParams();

        if (logLevel) {
            searchParams.append("LogLevel", logLevel);
        }
        if (fromDate) {
            searchParams.append("StartDate", fromDate);
        }
        if (toDate) {
            searchParams.append("EndDate", toDate);
        }

        const qs = searchParams.toString();
        if (qs) {
            path += "&" + qs;
        }
    }

    return callTwilioAPI({ baseUrl, path, refreshCache });
}

export function twloFetchEvents({ accountSid, eventType, resourceSid, fromDate, toDate, nextPageUrl, refreshCache }: { accountSid: string, eventType?: string, resourceSid?: string, fromDate?: string, toDate?: string, nextPageUrl?: string, refreshCache?: boolean }) {
    let baseUrl = "https://monitor.twilio.com/v1";
    let path = `/Events?AccountSID=${accountSid}`;

    if (nextPageUrl) {
        baseUrl = nextPageUrl;
        path = "";
    } else {
        const searchParams = new URLSearchParams();

        if (eventType) {
            searchParams.append("EventType", eventType);
        }
        if (resourceSid) {
            searchParams.append("ResourceSid", resourceSid);
        }
        if (fromDate) {
            searchParams.append("StartDate", fromDate);
        }
        if (toDate) {
            searchParams.append("EndDate", toDate);
        }

        const qs = searchParams.toString();
        if (qs) {
            path += "&" + qs;
        }
    }

    return callTwilioAPI({ baseUrl, path, refreshCache });
}
