<script setup lang="ts">
const highlights = [
  {
    icon: "i-lucide-shield-check",
    title: "100% Client-Side",
    description: "Calls Twilio API directly from your browser. Zero backend proxy or middleman.",
  },
  {
    icon: "i-lucide-database",
    title: "Private & Local",
    description: "Account credentials and cached records remain securely inside your browser's IndexedDB.",
  },
  {
    icon: "i-lucide-layers",
    title: "Multi-Account & Subs",
    description: "Save multiple Twilio accounts and inspect all associated subaccounts effortlessly.",
  },
  {
    icon: "i-lucide-code",
    title: "Free & Open Source",
    description: "Full transparency. Inspect the complete code, contribute, or host your own copy.",
  },
];
</script>

<template>
  <div class="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-16 text-center">
    <!-- Ambient subtle glow background -->
    <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-96 sm:w-[600px] h-96 bg-gradient-to-tr from-red-500/15 via-rose-500/10 to-orange-500/5 blur-3xl pointer-events-none rounded-full" />

    <div class="relative max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
      <!-- Top Pill Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-medium text-red-600 dark:text-red-400">
        <span class="size-1.5 rounded-full bg-red-500 animate-pulse" />
        <span>Direct Twilio Console Alternative</span>
        <span class="text-neutral-300 dark:text-neutral-700">&bull;</span>
        <span class="text-neutral-600 dark:text-neutral-400">Zero Server Proxy</span>
      </div>

      <!-- Main Headline -->
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.15]">
        Inspect your Twilio account <br class="hidden sm:inline">
        <span class="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
          directly in your browser
        </span>
      </h1>

      <!-- Subtitle -->
      <p class="max-w-2xl mx-auto text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
        A fast, modern, and open-source dashboard for your Twilio services. Inspect phone numbers, message histories, voice logs, debugger alerts, subaccounts, and billing without granting server access.
      </p>

      <!-- 4 Pillars Grid -->
      <div class="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        <div
          v-for="item in highlights"
          :key="item.title"
          class="p-4 rounded-2xl bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs backdrop-blur-sm">
          <div class="size-8 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-3">
            <UIcon :name="item.icon" class="size-4" />
          </div>
          <h3 class="font-semibold text-sm text-neutral-900 dark:text-white">
            {{ item.title }}
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
