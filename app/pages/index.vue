<script setup lang="ts">
import { useMainStore } from "~/stores/main";

const store = useMainStore();
</script>

<template>
  <div>
    <!-- Initializing State -->
    <div v-if="store.isInitializing" class="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <UIcon name="i-lucide-refresh-cw" class="size-8 text-red-500 animate-spin" />
      <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
        Loading local records...
      </span>
    </div>

    <!-- Landing Page (Always served on /) -->
    <div v-else class="space-y-12">
      <LandingHero />

      <!-- Quick Access to Saved Accounts (if any exist in browser) -->
      <div v-if="store.hasSavedAccounts" class="max-w-2xl mx-auto px-4 sm:px-6">
        <div class="p-4 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs backdrop-blur-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-database" class="size-4 text-emerald-500" />
              <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Saved Accounts in this Browser ({{ store.savedConnections.length }})
              </h3>
            </div>
            <span class="text-xs text-neutral-400">Click to open</span>
          </div>

          <div class="flex flex-wrap gap-2">
            <NuxtLink
              v-for="conn in store.savedConnections"
              :key="conn.account_sid"
              :to="`/accounts/${conn.account_sid}`"
              class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-red-50 dark:bg-neutral-800 dark:hover:bg-red-950/40 border border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-800/60 transition-all text-xs font-medium text-neutral-800 dark:text-neutral-200 group">
              <span class="size-2 rounded-full bg-emerald-500" />
              <span class="font-semibold group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {{ conn.name }}
              </span>
              <span class="font-mono text-[11px] text-neutral-400">
                {{ conn.account_sid.slice(0, 6) }}...{{ conn.account_sid.slice(-4) }}
              </span>
              <UIcon name="i-lucide-arrow-right" class="size-3 text-neutral-400 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <LandingConnectCard />

      <LandingFeaturesGrid />
    </div>
  </div>
</template>
