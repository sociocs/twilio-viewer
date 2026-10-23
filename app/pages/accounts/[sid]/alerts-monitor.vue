<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";
import { useMainStore } from "~/stores/main";
import { useMonitorStore } from "~/stores/monitor";

definePageMeta({
  alias: ["/accounts/:sid/alerts"],
});

const route = useRoute();
const toast = useToast();
const store = useMainStore();
const monitorStore = useMonitorStore();

const sid = computed(() => String(route.params.sid || ""));

const targetAccount = computed(() => {
  return store.savedConnections.find(c => c.account_sid === sid.value);
});

// Check if a resource SID filter was passed in via query parameters
watch(
  () => route.query.resource,
  (val) => {
    if (val && typeof val === "string") {
      monitorStore.alertsSearchQuery = val;
      monitorStore.eventsSearchQuery = val;
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
    if (monitorStore.activeTab === "alerts") {
      await monitorStore.loadAlerts(store.activeCredentials);
    } else {
      await monitorStore.loadEvents(store.activeCredentials);
    }
  }
}

onMounted(async () => {
  await syncAccountAndLoad();
});

watch(sid, async () => {
  await syncAccountAndLoad();
});

watch(
  () => monitorStore.activeTab,
  async (newTab) => {
    if (!store.activeCredentials) return;
    if (newTab === "alerts" && !monitorStore.alerts.length) {
      await monitorStore.loadAlerts(store.activeCredentials);
    } else if (newTab === "events" && !monitorStore.events.length) {
      await monitorStore.loadEvents(store.activeCredentials);
    }
  },
);

async function handleRefreshAll(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }
  if (monitorStore.activeTab === "alerts") {
    await monitorStore.loadAlerts(store.activeCredentials, true);
    if (!monitorStore.alertsError) {
      toast.add({
        title: "Alerts Refreshed",
        description: `Loaded ${monitorStore.alerts.length} alerts directly from Twilio Monitor.`,
        color: "success",
        icon: "i-lucide-check-circle",
      });
    } else {
      toast.add({
        title: "Refresh Error",
        description: monitorStore.alertsError,
        color: "error",
        icon: "i-lucide-shield-alert",
      });
    }
  } else {
    await monitorStore.loadEvents(store.activeCredentials, true);
    if (!monitorStore.eventsError) {
      toast.add({
        title: "Audit Events Refreshed",
        description: `Loaded ${monitorStore.events.length} audit events directly from Twilio Monitor.`,
        color: "success",
        icon: "i-lucide-check-circle",
      });
    } else {
      toast.add({
        title: "Refresh Error",
        description: monitorStore.eventsError,
        color: "error",
        icon: "i-lucide-shield-alert",
      });
    }
  }
}

async function handleLoadMore(): Promise<void> {
  if (!store.activeCredentials) return;
  if (monitorStore.activeTab === "alerts") {
    await monitorStore.loadMoreAlerts(store.activeCredentials);
  } else {
    await monitorStore.loadMoreEvents(store.activeCredentials);
  }
}

function handleExportCsv(): void {
  if (monitorStore.activeTab === "alerts") {
    monitorStore.exportAlertsToCsv(sid.value);
  } else {
    monitorStore.exportEventsToCsv(sid.value);
  }
}

const relativeFetchTime = computed(() => {
  const timestamp = monitorStore.activeTab === "alerts"
    ? monitorStore.alertsLastFetchedAt
    : monitorStore.eventsLastFetchedAt;
  if (!timestamp) return "";
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
});

useSeoMeta({
  title: computed(() => `Alerts & Monitor - ${store.activeAccount?.name || sid.value} - Twilio Viewer`),
  description: "Real-time visibility into Twilio debugger notices, warnings, error codes, and audit events.",
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

    <!-- Main Alerts & Monitor Dashboard -->
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
          <span class="text-neutral-900 dark:text-white font-semibold">Alerts & Monitor</span>
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

          <!-- Interlink to Voice Calls -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            :to="`/accounts/${sid}/voice-call-history`">
            <template #leading>
              <UIcon name="i-lucide-phone-call" class="size-3.5 text-emerald-500" />
            </template>
            Voice Calls
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
              class="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
              <UIcon name="i-lucide-bell" class="size-6" />
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Alerts & Monitor
              </h1>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Real-time visibility into Twilio debugger warnings, error codes, failed webhook requests, and audit events.
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
            :disabled="monitorStore.activeTab === 'alerts' ? !monitorStore.filteredAlerts.length : !monitorStore.filteredEvents.length"
            :loading="monitorStore.activeTab === 'alerts' ? monitorStore.isExportingAlerts : monitorStore.isExportingEvents"
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
            :loading="monitorStore.activeTab === 'alerts' ? monitorStore.isLoadingAlerts : monitorStore.isLoadingEvents"
            class="bg-gradient-to-r from-amber-600 to-rose-600 text-white"
            @click="handleRefreshAll">
            <template #leading>
              <UIcon name="i-lucide-refresh-cw" class="size-4" />
            </template>
            Refresh Data
          </UButton>
        </div>
      </div>

      <!-- Navigation Tabs Switcher: Alerts vs Events -->
      <div class="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
          :class="monitorStore.activeTab === 'alerts'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
            : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'"
          @click="monitorStore.activeTab = 'alerts'">
          <UIcon name="i-lucide-shield-alert" class="size-4" />
          <span>Alerts & Debugger</span>
          <UBadge
            v-if="monitorStore.alertsStats.total > 0"
            :color="monitorStore.alertsStats.errors > 0 ? 'error' : 'neutral'"
            variant="subtle"
            size="xs"
            class="ml-1 font-mono">
            {{ monitorStore.alertsStats.total }}
          </UBadge>
        </button>

        <button
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
          :class="monitorStore.activeTab === 'events'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
            : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'"
          @click="monitorStore.activeTab = 'events'">
          <UIcon name="i-lucide-activity" class="size-4" />
          <span>Audit Events</span>
          <UBadge
            v-if="monitorStore.events.length > 0"
            color="neutral"
            variant="subtle"
            size="xs"
            class="ml-1 font-mono">
            {{ monitorStore.events.length }}
          </UBadge>
        </button>
      </div>

      <!-- TAB 1: ALERTS & DEBUGGER -->
      <div v-if="monitorStore.activeTab === 'alerts'" class="space-y-6">
        <!-- Metric Cards Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Alerts</span>
            <div class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {{ monitorStore.alertsStats.total }}
            </div>
          </div>

          <div
            class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              <UIcon name="i-lucide-alert-circle" class="size-3.5 text-red-500" />
              Errors
            </span>
            <div
              class="text-2xl font-bold tracking-tight"
              :class="monitorStore.alertsStats.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-white'">
              {{ monitorStore.alertsStats.errors }}
            </div>
          </div>

          <div
            class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              <UIcon name="i-lucide-alert-triangle" class="size-3.5 text-amber-500" />
              Warnings
            </span>
            <div
              class="text-2xl font-bold tracking-tight"
              :class="monitorStore.alertsStats.warnings > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-900 dark:text-white'">
              {{ monitorStore.alertsStats.warnings }}
            </div>
          </div>

          <div
            class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
            <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              <UIcon name="i-lucide-info" class="size-3.5 text-blue-500" />
              Notices / Debug
            </span>
            <div class="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {{ monitorStore.alertsStats.notices + monitorStore.alertsStats.debugs }}
            </div>
          </div>
        </div>

        <!-- Alerts Filter Bar -->
        <MonitorAlertFilters
          v-if="store.activeCredentials"
          :account-sid="sid"
          :auth-credentials="store.activeCredentials" />

        <!-- Error Alert -->
        <UAlert
          v-if="monitorStore.alertsError"
          color="error"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="Failed to Load Alerts"
          :description="monitorStore.alertsError" />

        <!-- Loading State -->
        <div
          v-if="monitorStore.isLoadingAlerts && !monitorStore.alerts.length"
          class="min-h-[30vh] flex flex-col items-center justify-center gap-3">
          <UIcon name="i-lucide-refresh-cw" class="size-8 text-amber-500 animate-spin" />
          <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Fetching alert logs from Twilio Monitor API...
          </span>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!monitorStore.isLoadingAlerts && !monitorStore.alerts.length"
          class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
          <div
            class="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-check-circle-2" class="size-6" />
          </div>
          <h3 class="text-base font-bold text-neutral-900 dark:text-white">
            No Alerts Recorded
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Great news! No recent errors, warnings, or failed webhook notices were reported by Twilio Monitor.
          </p>
        </div>

        <!-- No Filter Matches -->
        <div
          v-else-if="!monitorStore.filteredAlerts.length"
          class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
          <div
            class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-search-x" class="size-6" />
          </div>
          <h3 class="text-base font-bold text-neutral-900 dark:text-white">
            No Matching Alerts
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Try clearing your search query or selecting a different log level.
          </p>
          <div>
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              @click="monitorStore.alertsSearchQuery = ''; monitorStore.filterLogLevel = 'all'">
              Clear Filters
            </UButton>
          </div>
        </div>

        <!-- Alert Cards List -->
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
            <span>
              Showing <strong>{{ monitorStore.filteredAlerts.length }}</strong> of {{ monitorStore.alerts.length }} loaded alerts
            </span>
            <span v-if="monitorStore.alertsNextPageUrl" class="text-neutral-400">
              More alerts available on Twilio
            </span>
          </div>

          <MonitorAlertCard
            v-for="alertItem in monitorStore.filteredAlerts"
            :key="alertItem.sid"
            :alert="alertItem"
            :account-sid="sid" />

          <!-- Load More Pagination Button -->
          <div v-if="monitorStore.alertsNextPageUrl" class="pt-4 text-center">
            <UButton
              color="neutral"
              variant="outline"
              size="md"
              :loading="monitorStore.isLoadingMoreAlerts"
              class="px-6"
              @click="handleLoadMore">
              <template #leading>
                <UIcon name="i-lucide-arrow-down" class="size-4" />
              </template>
              Load More Alerts
            </UButton>
          </div>
        </div>
      </div>

      <!-- TAB 2: AUDIT EVENTS -->
      <div v-else class="space-y-6">
        <!-- Search bar for Events -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="relative w-full sm:w-80">
            <UInput
              v-model="monitorStore.eventsSearchQuery"
              placeholder="Filter events by type, resource SID, actor..."
              icon="i-lucide-search"
              size="sm"
              class="w-full">
              <template v-if="monitorStore.eventsSearchQuery" #trailing>
                <button
                  type="button"
                  class="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
                  @click="monitorStore.eventsSearchQuery = ''">
                  <UIcon name="i-lucide-x" class="size-3.5" />
                </button>
              </template>
            </UInput>
          </div>
        </div>

        <!-- Error Alert -->
        <UAlert
          v-if="monitorStore.eventsError"
          color="error"
          variant="subtle"
          icon="i-lucide-shield-alert"
          title="Failed to Load Audit Events"
          :description="monitorStore.eventsError" />

        <!-- Loading State -->
        <div
          v-if="monitorStore.isLoadingEvents && !monitorStore.events.length"
          class="min-h-[30vh] flex flex-col items-center justify-center gap-3">
          <UIcon name="i-lucide-refresh-cw" class="size-8 text-primary animate-spin" />
          <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Fetching audit event logs from Twilio Monitor API...
          </span>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!monitorStore.isLoadingEvents && !monitorStore.events.length"
          class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
          <div
            class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-activity" class="size-6" />
          </div>
          <h3 class="text-base font-bold text-neutral-900 dark:text-white">
            No Audit Events Found
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            No audit events were returned for this account.
          </p>
        </div>

        <!-- No Filter Matches -->
        <div
          v-else-if="!monitorStore.filteredEvents.length"
          class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
          <div
            class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <UIcon name="i-lucide-search-x" class="size-6" />
          </div>
          <h3 class="text-base font-bold text-neutral-900 dark:text-white">
            No Matching Events
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Try clearing your search query.
          </p>
        </div>

        <!-- Event Cards List -->
        <div v-else class="space-y-4">
          <div class="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
            <span>
              Showing <strong>{{ monitorStore.filteredEvents.length }}</strong> of {{ monitorStore.events.length }} loaded events
            </span>
            <span v-if="monitorStore.eventsNextPageUrl" class="text-neutral-400">
              More events available on Twilio
            </span>
          </div>

          <MonitorEventCard
            v-for="eventItem in monitorStore.filteredEvents"
            :key="eventItem.sid"
            :event="eventItem"
            :account-sid="sid" />

          <!-- Load More Pagination Button -->
          <div v-if="monitorStore.eventsNextPageUrl" class="pt-4 text-center">
            <UButton
              color="neutral"
              variant="outline"
              size="md"
              :loading="monitorStore.isLoadingMoreEvents"
              class="px-6"
              @click="handleLoadMore">
              <template #leading>
                <UIcon name="i-lucide-arrow-down" class="size-4" />
              </template>
              Load More Events
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
