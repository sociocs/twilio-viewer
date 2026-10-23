<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";
import { useMainStore } from "~/stores/main";
import { useCallsStore } from "~/stores/calls";

const route = useRoute();
const toast = useToast();
const store = useMainStore();
const callsStore = useCallsStore();

const sid = computed(() => String(route.params.sid || ""));

const targetAccount = computed(() => {
  return store.savedConnections.find(c => c.account_sid === sid.value);
});

// Check if a phone number search was passed in via query parameters
watch(
  () => route.query.number,
  (val) => {
    if (val && typeof val === "string") {
      callsStore.searchQuery = val;
    }
  },
  { immediate: true },
);

// Check if From was passed in
watch(
  () => route.query.from,
  (val) => {
    if (val && typeof val === "string") {
      callsStore.formFrom = val;
    }
  },
  { immediate: true },
);

// Check if To was passed in
watch(
  () => route.query.to,
  (val) => {
    if (val && typeof val === "string") {
      callsStore.formTo = val;
    }
  },
  { immediate: true },
);

async function syncAccountAndLoad(): Promise<void> {
  if (store.isInitializing) {
    await store.loadConnections();
  }

  if (targetAccount.value && store.activeAccountSid !== sid.value) {
    await store.switchActiveConnection(sid.value);
  }

  if (store.activeCredentials) {
    await callsStore.loadCalls(store.activeCredentials);
  }
}

onMounted(async () => {
  await syncAccountAndLoad();
});

watch(sid, async () => {
  await syncAccountAndLoad();
});

async function handleRefreshAll(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }
  await callsStore.loadCalls(store.activeCredentials, true);
  if (!callsStore.error) {
    toast.add({
      title: "Voice Calls Refreshed",
      description: `Loaded ${callsStore.calls.length} voice calls directly from Twilio.`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else {
    toast.add({
      title: "Refresh Error",
      description: callsStore.error,
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}

async function handleLoadMore(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }
  await callsStore.loadMore(store.activeCredentials);
}

function handleExportCsv(): void {
  callsStore.exportToCsv();
}

const relativeFetchTime = computed(() => {
  if (!callsStore.lastFetchedAt) {
    return "";
  }
  return formatDistanceToNow(new Date(callsStore.lastFetchedAt), { addSuffix: true });
});

useSeoMeta({
  title: computed(() => `Voice Call History - ${store.activeAccount?.name || sid.value} - Twilio Viewer`),
  description: "View, filter, and inspect Twilio voice call records, durations, price estimates, and audio recordings.",
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Initializing State -->
    <div v-if="store.isInitializing" class="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <UIcon name="i-lucide-refresh-cw" class="size-8 text-blue-500 animate-spin" />
      <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
        Loading account information...
      </span>
    </div>

    <!-- Account Not Found Fallback -->
    <div v-else-if="!targetAccount" class="max-w-2xl mx-auto py-16 text-center space-y-6">
      <div
        class="size-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
        <UIcon name="i-lucide-alert-triangle" class="size-8" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Account Not Found Locally
        </h1>
        <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          The Twilio account <code class="font-mono text-blue-500 font-semibold">{{ sid }}</code> is not saved in your
          browser's local database.
        </p>
      </div>

      <div>
        <UButton
          to="/"
          color="neutral"
          variant="outline"
          size="sm">
          Return to Accounts
        </UButton>
      </div>
    </div>

    <!-- Main Voice Call History Dashboard -->
    <div v-else class="space-y-8">
      <!-- Breadcrumb and Top Navigation -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <NuxtLink to="/" class="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Home
          </NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5 text-neutral-400" />
          <NuxtLink
            :to="`/accounts/${sid}`"
            class="hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">
            {{ store.activeAccount?.name || sid }}
          </NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5 text-neutral-400" />
          <span class="text-neutral-900 dark:text-white font-semibold">Voice Call History</span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Interlink to Message History -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :to="`/accounts/${sid}/message-history`">
            <template #leading>
              <UIcon name="i-lucide-message-square" class="size-3.5 text-indigo-500" />
            </template>
            Message History
          </UButton>

          <!-- Interlink to Phone Numbers -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :to="`/accounts/${sid}/phone-numbers`">
            <template #leading>
              <UIcon name="i-lucide-phone" class="size-3.5 text-blue-500" />
            </template>
            Phone Numbers
          </UButton>

          <!-- Interlink to Messaging Services -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :to="`/accounts/${sid}/messaging-services`">
            <template #leading>
              <UIcon name="i-lucide-message-square-code" class="size-3.5 text-red-500" />
            </template>
            Messaging Services
          </UButton>

          <!-- Interlink to Alerts & Monitor -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :to="`/accounts/${sid}/alerts-monitor`">
            <template #leading>
              <UIcon name="i-lucide-bell" class="size-3.5 text-amber-500" />
            </template>
            Alerts
          </UButton>

          <!-- Interlink to Overview -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :to="`/accounts/${sid}`">
            <template #leading>
              <UIcon name="i-lucide-layout-dashboard" class="size-3.5" />
            </template>
            Account Overview
          </UButton>
        </div>
      </div>

      <!-- Header Banner & Action Buttons -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <UIcon name="i-lucide-phone-call" class="size-6" />
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Voice Call History
              </h1>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Inspect inbound and outbound voice calls, call durations, price estimates, and audio recordings.
              </p>
            </div>
          </div>
        </div>

        <!-- Right Side: Status & Refresh Actions -->
        <div class="flex flex-wrap items-center gap-3">
          <span v-if="relativeFetchTime" class="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline">
            Checked {{ relativeFetchTime }}
          </span>

          <!-- Export CSV Button -->
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!callsStore.filteredCalls.length"
            :loading="callsStore.isExporting"
            @click="handleExportCsv">
            <template #leading>
              <UIcon name="i-lucide-download" class="size-4 text-emerald-600 dark:text-emerald-400" />
            </template>
            Export CSV
          </UButton>

          <!-- Refresh Data Button -->
          <UButton
            color="primary"
            variant="solid"
            size="sm"
            :loading="callsStore.isLoading"
            class="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
            @click="handleRefreshAll">
            <template #leading>
              <UIcon name="i-lucide-refresh-cw" class="size-4" />
            </template>
            Refresh Data
          </UButton>
        </div>
      </div>

      <!-- Metric Cards Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Loaded</span>
          <div class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ callsStore.stats.total }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-arrow-up-right" class="size-3.5 text-blue-500" />
            Outbound
          </span>
          <div class="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            {{ callsStore.stats.outbound }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-arrow-down-left" class="size-3.5 text-emerald-500" />
            Inbound
          </span>
          <div class="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {{ callsStore.stats.inbound }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-check-check" class="size-3.5 text-emerald-500" />
            Completed
          </span>
          <div class="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {{ callsStore.stats.completed }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-alert-circle" class="size-3.5 text-amber-500" />
            Unanswered / Missed
          </span>
          <div
            class="text-2xl font-bold tracking-tight"
            :class="callsStore.stats.failedOrMissed > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'">
            {{ callsStore.stats.failedOrMissed }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-timer" class="size-3.5 text-blue-500" />
            Total Duration
          </span>
          <div class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white truncate" :title="callsStore.stats.formattedDuration">
            {{ callsStore.stats.formattedDuration }}
          </div>
        </div>
      </div>

      <!-- Search and Filter Bar -->
      <CallFilters
        v-if="store.activeCredentials"
        :account-sid="sid"
        :auth-credentials="store.activeCredentials" />

      <!-- Error Alert -->
      <UAlert
        v-if="callsStore.error"
        color="error"
        variant="subtle"
        icon="i-lucide-shield-alert"
        title="Failed to Load Voice Calls"
        :description="callsStore.error" />

      <!-- Loading State -->
      <div
        v-if="callsStore.isLoading && !callsStore.calls.length"
        class="min-h-[30vh] flex flex-col items-center justify-center gap-3">
        <UIcon name="i-lucide-refresh-cw" class="size-8 text-emerald-500 animate-spin" />
        <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Fetching voice call logs from Twilio API...
        </span>
      </div>

      <!-- Empty Calls State -->
      <div
        v-else-if="!callsStore.isLoading && !callsStore.calls.length"
        class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
        <div
          class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-phone-off" class="size-6" />
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white">
          No Voice Calls Found
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
          No voice call records are available for this account matching your criteria.
        </p>
      </div>

      <!-- No Filter Matches State -->
      <div
        v-else-if="!callsStore.filteredCalls.length"
        class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
        <div
          class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-search-x" class="size-6" />
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white">
          No Matches Found
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
          Try clearing your search query or selecting different filters.
        </p>
        <div>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            @click="callsStore.searchQuery = ''; callsStore.filterDirection = 'all'; callsStore.filterStatus = 'all'">
            Clear Filters
          </UButton>
        </div>
      </div>

      <!-- Call Cards List -->
      <div v-else-if="store.activeCredentials" class="space-y-4">
        <div class="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
          <span>
            Showing <strong>{{ callsStore.filteredCalls.length }}</strong> of {{ callsStore.calls.length }}
            loaded calls
          </span>
          <span v-if="callsStore.hasMore" class="text-neutral-400">
            More calls available on Twilio
          </span>
        </div>

        <CallCard
          v-for="callItem in callsStore.filteredCalls"
          :key="callItem.sid"
          :call="callItem"
          :account-sid="sid"
          :auth-credentials="store.activeCredentials" />

        <!-- Load More Pagination Button -->
        <div v-if="callsStore.hasMore" class="pt-4 text-center">
          <UButton
            color="neutral"
            variant="outline"
            size="md"
            :loading="callsStore.isLoadingMore"
            class="px-6"
            @click="handleLoadMore">
            <template #leading>
              <UIcon name="i-lucide-arrow-down" class="size-4" />
            </template>
            Load More Calls
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
