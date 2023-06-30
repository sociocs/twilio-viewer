import { useMainStore } from "~/stores/main";
import { AuthCredentials } from "./types";

// Calls given Twilio API path
// When credentials are not passed, reads it from the store
export const callTwilioAPI = async function ({ baseUrl, path, method, body, authCredentials, refreshCache }: { baseUrl?: string, path: string, method?: string, body?: string, authCredentials?: AuthCredentials, refreshCache?: boolean }) {
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