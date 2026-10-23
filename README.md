# Twilio Viewer

A fast, private, 100% client-side web application for inspecting Twilio accounts and related resources directly in your browser without any backend proxy or server hosting.

## Key Highlights

- **100% Client-Side**: Calls Twilio REST APIs directly from the browser. No third-party servers or backend intermediaries.
- **Privacy & Security**: Credentials and data stay local in your browser's IndexedDB.
- **Multi-Account & Subaccounts**: Save multiple Twilio connections and switch between primary accounts and subaccounts effortlessly.
- **Static Deployment**: Runs entirely as a static single-page application hosted on GitHub Pages.

## Live App & Deployment

- **Hosted URL**: [https://twilio-viewer.sociocs.com/](https://twilio-viewer.sociocs.com/)
- **Automated CI/CD**: Automatically built and deployed to GitHub Pages on every push to the `main` branch via GitHub Actions workflow ([`.github/workflows/deploy-to-github-pages.yml`](.github/workflows/deploy-to-github-pages.yml)).

## Features

- **Account & Subaccounts**: Account status, active services summary, balance, and subaccount inspection.
- **Phone Numbers**: Filter and inspect active numbers, voice/SMS capabilities, and webhook URLs.
- **Messaging Services**: View messaging services, alpha sender IDs, and linked number pools.
- **Message History**: Search SMS and MMS logs with delivery status filters and raw JSON inspection.
- **Voice Call History**: Review call logs, durations, costs, and call recordings.
- **Debugger Alerts & Events**: Track error codes, warnings, and account audit event logs.
- **Billing & Usage**: Itemized usage records, sub-breakdowns, and date preset cost reconciliation.

## Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) & [Vue 3](https://vuejs.org/) (Composition API)
- **UI & Styling**: [Nuxt UI](https://ui.nuxt.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Local Storage**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Utilities**: [VueUse](https://vueuse.org/), [date-fns](https://date-fns.org/), [es-toolkit](https://es-toolkit.slash.page/)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Generate static build for production
npm run generate
```
