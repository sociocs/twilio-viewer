<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";
import { useMainStore } from "~/stores/main";
import { useMessagesStore } from "~/stores/messages";
import { useMessagingStore } from "~/stores/messaging";

const route = useRoute();
const toast = useToast();
const store = useMainStore();
const messagesStore = useMessagesStore();
const messagingStore = useMessagingStore();

const sid = computed(() => String(route.params.sid || ""));

const targetAccount = computed(() => {
  return store.savedConnections.find(c => c.account_sid === sid.value);
});

// Check if a service filter was passed in via query parameters
watch(
  () => route.query.service,
  (val) => {
    if (val && typeof val === "string") {
      messagesStore.filterService = val;
    }
  },
  { immediate: true },
);

// Check if a phone number search was passed in via query parameters
watch(
  () => route.query.number,
  (val) => {
    if (val && typeof val === "string") {
      messagesStore.searchQuery = val;
    }
  },
  { immediate: true },
);

// Check if From was passed in
watch(
  () => route.query.from,
  (val) => {
    if (val && typeof val === "string") {
      messagesStore.formFrom = val;
    }
  },
  { immediate: true },
);

// Check if To was passed in
watch(
  () => route.query.to,
  (val) => {
    if (val && typeof val === "string") {
      messagesStore.formTo = val;
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
    await messagesStore.loadMessages(store.activeCredentials);
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
  await messagesStore.loadMessages(store.activeCredentials, true);
  if (!messagesStore.error) {
    toast.add({
      title: "Message History Refreshed",
      description: `Loaded ${messagesStore.messages.length} messages directly from Twilio.`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else {
    toast.add({
      title: "Refresh Error",
      description: messagesStore.error,
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}

async function handleLoadMore(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }
  await messagesStore.loadMore(store.activeCredentials);
}

function handleExportCsv(): void {
  messagesStore.exportToCsv(sid.value);
}

function clearServiceFilter(): void {
  messagesStore.filterService = "all";
  const query = { ...route.query };
  delete query.service;
  navigateTo({ query }, { replace: true });
}

const filteredServiceName = computed(() => {
  if (!messagesStore.filterService || messagesStore.filterService === "all") {
    return "";
  }
  const s = messagingStore.services.find(svc => svc.sid === messagesStore.filterService);
  return s?.friendly_name || messagesStore.filterService;
});

const relativeFetchTime = computed(() => {
  if (!messagesStore.lastFetchedAt) {
    return "";
  }
  return formatDistanceToNow(new Date(messagesStore.lastFetchedAt), { addSuffix: true });
});

useSeoMeta({
  title: computed(() => `Message History - ${store.activeAccount?.name || sid.value} - Twilio Viewer`),
  description: "View, filter, and inspect inbound and outbound SMS/MMS message logs and delivery status.",
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

      <div class="flex items-center justify-center gap-3 pt-2">
        <UButton to="/" color="neutral" variant="outline" size="md">
          <template #leading>
            <UIcon name="i-lucide-arrow-left" class="size-4" />
          </template>
          Back to Home
        </UButton>
      </div>
    </div>

    <!-- Main Message History Dashboard -->
    <div v-else class="space-y-8">
      <!-- Breadcrumb and Top Navigation -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <NuxtLink to="/" class="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Home
          </NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5 text-neutral-400" />
          <NuxtLink :to="`/accounts/${sid}`"
            class="hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">
            {{ store.activeAccount?.name || sid }}
          </NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5 text-neutral-400" />
          <span class="text-neutral-900 dark:text-white font-semibold">
            Message History
          </span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Interlink to Messaging Services -->
          <UButton color="neutral" variant="outline" size="xs" :to="`/accounts/${sid}/messaging-services`">
            <template #leading>
              <UIcon name="i-lucide-message-square-code" class="size-3.5 text-red-500" />
            </template>
            Messaging Services
          </UButton>

          <!-- Interlink to Phone Numbers -->
          <UButton color="neutral" variant="outline" size="xs" :to="`/accounts/${sid}/phone-numbers`">
            <template #leading>
              <UIcon name="i-lucide-phone" class="size-3.5 text-blue-500" />
            </template>
            Phone Numbers
          </UButton>

          <!-- Interlink to Voice Calls -->
          <UButton color="neutral" variant="outline" size="xs" :to="`/accounts/${sid}/voice-call-history`">
            <template #leading>
              <UIcon name="i-lucide-phone-call" class="size-3.5 text-emerald-500" />
            </template>
            Voice Calls
          </UButton>

          <!-- Interlink to Alerts & Monitor -->
          <UButton color="neutral" variant="outline" size="xs" :to="`/accounts/${sid}/alerts-monitor`">
            <template #leading>
              <UIcon name="i-lucide-bell" class="size-3.5 text-amber-500" />
            </template>
            Alerts
          </UButton>

          <UButton color="neutral" variant="outline" size="xs" :to="`/accounts/${sid}`">
            <template #leading>
              <UIcon name="i-lucide-layout-dashboard" class="size-3.5" />
            </template>
            Account Overview
          </UButton>
        </div>
      </div>

      <!-- Hero Header Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <UIcon name="i-lucide-message-square" class="size-6" />
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Message History
              </h1>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Inspect inbound and outbound SMS/MMS messages, delivery statuses, segments, and pricing.
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span v-if="relativeFetchTime" class="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
            Checked {{ relativeFetchTime }}
          </span>

          <!-- Export CSV Button -->
          <UButton color="neutral" variant="outline" size="sm" :disabled="!messagesStore.filteredMessages.length"
            :loading="messagesStore.isExporting" @click="handleExportCsv">
            <template #leading>
              <UIcon name="i-lucide-download" class="size-4 text-emerald-600 dark:text-emerald-400" />
            </template>
            Export CSV
          </UButton>

          <!-- Refresh Data Button -->
          <UButton color="primary" variant="solid" size="sm" :loading="messagesStore.isLoading"
            class="bg-gradient-to-r from-indigo-600 to-violet-600 text-white" @click="handleRefreshAll">
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
            {{ messagesStore.stats.total }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-arrow-up-right" class="size-3.5 text-blue-500" />
            Outbound
          </span>
          <div class="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            {{ messagesStore.stats.outbound }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-arrow-down-left" class="size-3.5 text-emerald-500" />
            Inbound
          </span>
          <div class="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {{ messagesStore.stats.inbound }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-check-check" class="size-3.5 text-emerald-500" />
            Delivered
          </span>
          <div class="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {{ messagesStore.stats.delivered }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-alert-circle" class="size-3.5 text-red-500" />
            Delivery Failures
          </span>
          <div class="text-2xl font-bold tracking-tight"
            :class="messagesStore.stats.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-white'">
            {{ messagesStore.stats.failed }}
          </div>
        </div>

        <div
          class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-coins" class="size-3.5 text-amber-500" />
            Estimated Cost
          </span>
          <div class="text-xl font-bold tracking-tight font-mono text-neutral-900 dark:text-white truncate">
            ${{ messagesStore.stats.totalCost }}
          </div>
        </div>
      </div>

      <!-- Active Service Filter Banner if filtered by a specific Messaging Service -->
      <div v-if="messagesStore.filterService.startsWith('MG')"
        class="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2 text-blue-800 dark:text-blue-300">
          <UIcon name="i-lucide-filter" class="size-4 shrink-0 text-blue-500" />
          <span>
            Filtering messages sent via Messaging Service:
            <strong>{{ filteredServiceName }}</strong>
            <span class="font-mono text-neutral-500 dark:text-neutral-400 ml-1">({{ messagesStore.filterService
              }})</span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          <UButton :to="`/accounts/${sid}/messaging-services?service=${messagesStore.filterService}`" color="primary"
            variant="outline" size="xs">
            <template #leading>
              <UIcon name="i-lucide-external-link" class="size-3.5" />
            </template>
            View Service
          </UButton>

          <UButton color="neutral" variant="ghost" size="xs" @click="clearServiceFilter">
            <template #leading>
              <UIcon name="i-lucide-x" class="size-3.5" />
            </template>
            Show All Messages
          </UButton>
        </div>
      </div>

      <!-- Search and Filter Bar -->
      <MessageFilters v-if="store.activeCredentials" :account-sid="sid" :auth-credentials="store.activeCredentials" />

      <!-- Error Alert -->
      <UAlert v-if="messagesStore.error" color="error" variant="subtle" icon="i-lucide-shield-alert"
        title="Failed to Load Message History" :description="messagesStore.error" />

      <!-- Loading State -->
      <div v-if="messagesStore.isLoading && !messagesStore.messages.length"
        class="min-h-[30vh] flex flex-col items-center justify-center gap-3">
        <UIcon name="i-lucide-refresh-cw" class="size-8 text-indigo-500 animate-spin" />
        <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Fetching message logs from Twilio API...
        </span>
      </div>

      <!-- Empty Messages State -->
      <div v-else-if="!messagesStore.isLoading && !messagesStore.messages.length"
        class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
        <div
          class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-message-square-off" class="size-6" />
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white">
          No Messages Found
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
          There are no messages matching your query in this Twilio account.
        </p>
      </div>

      <!-- No Filter Matches State -->
      <div v-else-if="!messagesStore.filteredMessages.length"
        class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
        <div
          class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-search-x" class="size-6" />
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white">
          No Messages Match Filter
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
          Try clearing your search query or selecting different filters.
        </p>
        <div>
          <UButton color="neutral" variant="outline" size="xs"
            @click="messagesStore.searchQuery = ''; messagesStore.filterDirection = 'all'; messagesStore.filterStatus = 'all'; messagesStore.filterService = 'all'">
            Clear Filters
          </UButton>
        </div>
      </div>

      <!-- Messages Cards List -->
      <div v-else-if="store.activeCredentials" class="space-y-4">
        <div class="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
          <span>
            Showing <strong>{{ messagesStore.filteredMessages.length }}</strong> of {{ messagesStore.messages.length }}
            loaded messages
          </span>
          <span v-if="messagesStore.hasMore" class="text-neutral-400">
            More messages available on Twilio
          </span>
        </div>

        <MessageCard v-for="msg in messagesStore.filteredMessages" :key="msg.sid" :message="msg" :account-sid="sid"
          :auth-credentials="store.activeCredentials" />

        <!-- Load More Pagination Button -->
        <div v-if="messagesStore.hasMore" class="pt-4 text-center">
          <UButton color="neutral" variant="outline" size="md" :loading="messagesStore.isLoadingMore" class="px-6"
            @click="handleLoadMore">
            <template #leading>
              <UIcon name="i-lucide-arrow-down" class="size-4" />
            </template>
            Load Older Messages
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
