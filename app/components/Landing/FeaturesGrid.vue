<script setup lang="ts">
const features = [
  {
    icon: "i-lucide-message-square-code",
    title: "Messaging Services",
    description: "Inspect sender pools, US A2P 10DLC brand & campaign registrations, and toll-free verification statuses.",
  },
  {
    icon: "i-lucide-phone",
    title: "Phone Numbers",
    description: "Inspect all active phone numbers, capabilities (Voice, SMS, MMS, Fax), and webhook endpoint configurations.",
  },
  {
    icon: "i-lucide-message-square",
    title: "Message Logs",
    description: "Review sent and received SMS/MMS messages with status filtering, date range queries, and error details.",
  },
  {
    icon: "i-lucide-phone-call",
    title: "Voice Call History",
    description: "Browse inbound and outbound voice calls, call durations, price estimates, recordings, and call status codes.",
  },
  {
    icon: "i-lucide-bell",
    title: "Alerts & Monitor",
    description: "Catch Twilio Monitor alerts, webhook delivery failures, and API errors in real-time with debug links.",
  },
  {
    icon: "i-lucide-receipt",
    title: "Billing & Usage",
    description: "Check current account balances and inspect granular usage records across messaging, voice, and phone numbers.",
  },
  {
    icon: "i-lucide-layers",
    title: "Subaccount Switcher",
    description: "Instantly explore parent and subaccount trees without logging in and out of the Twilio Console.",
  },
];
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
    <div class="text-center max-w-2xl mx-auto space-y-3 mb-12">
      <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
        Everything you need to inspect Twilio
      </h2>
      <p class="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
        Engineered for developers, support teams, and administrators who need quick, secure visibility into their Twilio infrastructure.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="(item, index) in features"
        :key="item.title"
        class="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
        :class="{ 'md:col-span-2 md:max-w-md md:w-full md:mx-auto lg:col-span-1 lg:col-start-2 lg:max-w-none': index === features.length - 1 }">
        <div class="size-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center mb-4">
          <UIcon :name="item.icon" class="size-5 text-red-500" />
        </div>
        <h3 class="text-base font-semibold text-neutral-900 dark:text-white mb-2">
          {{ item.title }}
        </h3>
        <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {{ item.description }}
        </p>
      </div>
    </div>
  </div>
</template>
