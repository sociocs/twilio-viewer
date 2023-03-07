# Twilio Viewer

Twilio console offers a great lot of functionality, however, it's not convenient to use it on regular basis. This app is intended to make it easier to see Twilio accounts, subaccounts, and related resources.

1. It uses Twilio APIs directly from the browser to fetch data. No third party servers are involved.
1. Your information and data stays local. It doesn't go through any other services or servers.
1. If you chose to save the Twilio auth token, it is stored in plain text in the browser's IndexedDB.
1. It relies heavily on the browser cache to avoid API overloading. Use refresh button on top right to reload the cache.
1. It's highly opiniated on what information is important on day-to-day basis for Twilio customers.

## Available features

1. Connect to Twilio account.
1. Save multiple Twilio accounts.
1. See information at the subaccount level (if there are any).
1. List of phone numbers.
1. Message history with search facility.
1. Voice call history with search facility.
1. Alerts (for example, errors)
1. Events (logs of changes to the account)
1. Billing (simple view to charges in all categories)

## Development stack

1. Vue.js 3 (<https://vuejs.org/>)
1. Vuetify 3 (<https://vuetifyjs.com/en/>)
1. Vue Router (<https://router.vuejs.org/>)
1. Twilio REST APIs (<https://www.twilio.com/docs/usage/api>)
1. IndexedDB (<https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB>)
1. Dexie.js for IndexedDB (<https://dexie.org/>)
1. Google Roboto Fonts (<https://fonts.google.com/specimen/Roboto>)
1. Material Design Icons (<https://pictogrammers.com/library/mdi/>)
