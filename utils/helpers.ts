import { flatten } from 'flatten-anything'

// converts an object to array of label value pair
export const toLabelValArray = (object: any, keys: string[]) => {
    const result = [];

    for (let i = 0; i < keys?.length; i++) {
        const key = keys[i];

        result.push({ label: key.toString(), value: object[key]?.toString() || "None" });
    }

    return result;
}

// converts a nested object to flat one, useful when rendering data
export const flattenObject = (obj: Object) => flatten(obj);

// calls given Twilio API path
// when credentials are not passed, reads it from the store
// export const callTwilioAPI = async ({ baseUrl, path, method, body, authCredentials, cache }) => {
//     try {
//         const resp = await fetch(`${baseUrl || "https://api.twilio.com"}${path}`, {
//             method: method || "GET",
//             mode: "cors",
//             cache: cache || "force-cache",
//             credentials: "omit", // do not negotiate using browser popup based credential
//             headers: {
//                 "Authorization": "Basic " + btoa((authCredentials?.account_sid || store.account_sid) + ":" + (authCredentials?.auth_token || store.auth_token)),
//             },
//             body,
//         });

//         if (resp.ok) {
//             return [null, (await resp.json())];
//         } else {
//             return [`${resp.status} ${resp.statusText}`, null];
//         }
//     } catch (error) {
//         return [error, null];
//     }
// }

export const localDate = (dtStr: string) => {
    return (new Date(dtStr)).toLocaleString();
}