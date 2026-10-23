<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";
import { useMainStore } from "~/stores/main";
import { usePhoneNumbersStore } from "~/stores/phone-numbers";
import { useMessagingStore } from "~/stores/messaging";

const route = useRoute();
const store = useMainStore();
const phoneNumbersStore = usePhoneNumbersStore();
const messagingStore = useMessagingStore();
const toast = useToast();

const sid = computed(() => String(route.params.sid || ""));

const targetAccount = computed(() => {
  return store.savedConnections.find(c => c.account_sid === sid.value);
});

// Check if a service filter was requested via query parameter
const serviceFilterQuery = computed(() => {
  return typeof route.query.service === "string" ? route.query.service : "";
});

// Name of the filtered service if any
const filteredServiceName = computed(() => {
  if (!serviceFilterQuery.value) {
    return "";
  }
  const srv = messagingStore.services.find(s => s.sid === serviceFilterQuery.value);
  return srv ? srv.friendly_name : serviceFilterQuery.value;
});

async function syncAccountAndLoad(): Promise<void> {
  if (store.isInitializing) {
    await store.loadConnections();
  }

  if (targetAccount.value && store.activeAccountSid !== sid.value) {
    await store.switchActiveConnection(sid.value);
  }

  if (store.activeCredentials) {
    // If a service query or search query is present, initialize filter
    if (typeof route.query.search === "string" && route.query.search) {
      phoneNumbersStore.searchQuery = route.query.search;
    }
    if (serviceFilterQuery.value) {
      phoneNumbersStore.filterService = serviceFilterQuery.value;
    }

    await phoneNumbersStore.loadPhoneNumbers(store.activeCredentials);
  }
}

onMounted(async () => {
  await syncAccountAndLoad();
});

watch(sid, async () => {
  await syncAccountAndLoad();
});

watch(
  () => route.query.service,
  (newService) => {
    if (typeof newService === "string" && newService) {
      phoneNumbersStore.filterService = newService;
    } else if (newService === undefined && phoneNumbersStore.filterService.startsWith("MG")) {
      phoneNumbersStore.filterService = "all";
    }
  },
);

watch(
  () => route.query.search,
  (newSearch) => {
    if (typeof newSearch === "string") {
      phoneNumbersStore.searchQuery = newSearch;
    }
  },
);

async function handleRefreshAll(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }

  await phoneNumbersStore.loadPhoneNumbers(store.activeCredentials, true);
  if (!phoneNumbersStore.error) {
    toast.add({
      title: "Phone Numbers Refreshed",
      description: `Loaded ${phoneNumbersStore.phoneNumbers.length} phone numbers directly from Twilio.`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else {
    toast.add({
      title: "Refresh Error",
      description: phoneNumbersStore.error,
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}

async function handleRefreshSingle(phoneNumberSid: string): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }

  await phoneNumbersStore.refreshSingleNumber(phoneNumberSid, store.activeCredentials);
  toast.add({
    title: "Number Refreshed",
    description: `Refreshed details for ${phoneNumberSid}.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

function clearServiceFilter(): void {
  phoneNumbersStore.filterService = "all";
  const query = { ...route.query };
  delete query.service;
  navigateTo({ query }, { replace: true });
}

const relativeFetchTime = computed(() => {
  if (!phoneNumbersStore.lastFetchedAt) {
    return "";
  }
  return formatDistanceToNow(new Date(phoneNumbersStore.lastFetchedAt), { addSuffix: true });
});

useSeoMeta({
  title: computed(() => `Phone Numbers - ${store.activeAccount?.name || sid.value} - Twilio Viewer`),
  description: "View and inspect all incoming phone numbers, capabilities, webhooks, and linked messaging services.",
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
      <div class="size-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
        <UIcon name="i-lucide-alert-triangle" class="size-8" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Account Not Found Locally
        </h1>
        <p class="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          The Twilio account <code class="font-mono text-blue-500 font-semibold">{{ sid }}</code> is not saved in your browser's local database.
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

    <!-- Main Phone Numbers Dashboard -->
    <div v-else class="space-y-8">
      <!-- Breadcrumb and Top Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <NuxtLink to="/" class="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Home
          </NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5 text-neutral-400" />
          <NuxtLink :to="`/accounts/${sid}`" class="hover:text-neutral-900 dark:hover:text-white transition-colors font-medium">
            {{ store.activeAccount?.name || sid }}
          </NuxtLink>
          <UIcon name="i-lucide-chevron-right" class="size-3.5 text-neutral-400" />
          <span class="text-neutral-900 dark:text-white font-semibold">
            Phone Numbers
          </span>
        </div>

        <div class="flex items-center gap-2">
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

      <!-- Hero Header Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <UIcon name="i-lucide-phone" class="size-6" />
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Phone Numbers
              </h1>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Inspect incoming phone numbers, capabilities, webhooks, and linked messaging services.
              </p>
            </div>
          </div>
        </div>

        <!-- Refresh Button & Timestamp -->
        <div class="flex items-center gap-3">
          <span v-if="relativeFetchTime" class="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
            Checked {{ relativeFetchTime }}
          </span>

          <UButton
            color="primary"
            variant="solid"
            size="sm"
            :loading="phoneNumbersStore.isLoading"
            class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
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
        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Numbers</span>
          <div class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ phoneNumbersStore.stats.total }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-message-square" class="size-3.5 text-emerald-500" />
            SMS Enabled
          </span>
          <div class="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {{ phoneNumbersStore.stats.sms }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-phone-call" class="size-3.5 text-blue-500" />
            Voice Enabled
          </span>
          <div class="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            {{ phoneNumbersStore.stats.voice }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-shield-check" class="size-3.5 text-amber-500" />
            Toll-Free
          </span>
          <div class="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {{ phoneNumbersStore.stats.tollfree }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-message-square-code" class="size-3.5 text-blue-500" />
            In Service Pool
          </span>
          <div class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ phoneNumbersStore.stats.inService }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <UIcon name="i-lucide-circle-slash" class="size-3.5 text-neutral-400" />
            Standalone
          </span>
          <div class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ phoneNumbersStore.stats.standalone }}
          </div>
        </div>
      </div>

      <!-- Active Service Filter Banner if filtered by a specific Messaging Service -->
      <div
        v-if="phoneNumbersStore.filterService.startsWith('MG')"
        class="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2 text-blue-800 dark:text-blue-300">
          <UIcon name="i-lucide-filter" class="size-4 shrink-0 text-blue-500" />
          <span>
            Showing numbers assigned to Messaging Service:
            <strong>{{ filteredServiceName }}</strong>
            <span class="font-mono text-neutral-500 dark:text-neutral-400 ml-1">({{ phoneNumbersStore.filterService }})</span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :to="`/accounts/${sid}/messaging-services?service=${phoneNumbersStore.filterService}`"
            color="primary"
            variant="outline"
            size="xs">
            <template #leading>
              <UIcon name="i-lucide-external-link" class="size-3.5" />
            </template>
            View Service
          </UButton>

          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            @click="clearServiceFilter">
            <template #leading>
              <UIcon name="i-lucide-x" class="size-3.5" />
            </template>
            Show All Numbers
          </UButton>
        </div>
      </div>

      <!-- Search and Filter Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="relative w-full md:w-96">
          <UInput
            v-model="phoneNumbersStore.searchQuery"
            placeholder="Search by number, friendly name, SID..."
            icon="i-lucide-search"
            size="sm"
            class="w-full">
            <template v-if="phoneNumbersStore.searchQuery" #trailing>
              <button
                type="button"
                class="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
                @click="phoneNumbersStore.searchQuery = ''">
                <UIcon name="i-lucide-x" class="size-3.5" />
              </button>
            </template>
          </UInput>
        </div>

        <!-- Filter Pill Groups -->
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <!-- Service Association Filter -->
          <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
            <button
              type="button"
              class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
              :class="phoneNumbersStore.filterService === 'all'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              @click="phoneNumbersStore.filterService = 'all'">
              All ({{ phoneNumbersStore.stats.total }})
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
              :class="phoneNumbersStore.filterService === 'in_service'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              @click="phoneNumbersStore.filterService = 'in_service'">
              In Service ({{ phoneNumbersStore.stats.inService }})
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
              :class="phoneNumbersStore.filterService === 'standalone'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              @click="phoneNumbersStore.filterService = 'standalone'">
              Standalone ({{ phoneNumbersStore.stats.standalone }})
            </button>
          </div>

          <!-- Type Filter -->
          <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
            <button
              type="button"
              class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
              :class="phoneNumbersStore.filterType === 'all'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              @click="phoneNumbersStore.filterType = 'all'">
              All Types
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
              :class="phoneNumbersStore.filterType === 'tollfree'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              @click="phoneNumbersStore.filterType = 'tollfree'">
              Toll-Free
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
              :class="phoneNumbersStore.filterType === 'local'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
              @click="phoneNumbersStore.filterType = 'local'">
              Local
            </button>
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="phoneNumbersStore.error"
        color="error"
        variant="subtle"
        icon="i-lucide-shield-alert"
        title="Failed to Load Phone Numbers"
        :description="phoneNumbersStore.error" />

      <!-- Loading State -->
      <div v-if="phoneNumbersStore.isLoading && !phoneNumbersStore.phoneNumbers.length" class="min-h-[30vh] flex flex-col items-center justify-center gap-3">
        <UIcon name="i-lucide-refresh-cw" class="size-8 text-blue-500 animate-spin" />
        <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Fetching incoming phone numbers and service linkages from Twilio API...
        </span>
      </div>

      <!-- Empty Numbers State -->
      <div
        v-else-if="!phoneNumbersStore.isLoading && !phoneNumbersStore.phoneNumbers.length"
        class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
        <div class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-phone-off" class="size-6" />
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white">
          No Phone Numbers Found
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
          There are no incoming phone numbers provisioned under this Twilio account.
        </p>
      </div>

      <!-- No Filter Matches State -->
      <div
        v-else-if="!phoneNumbersStore.filteredPhoneNumbers.length"
        class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
        <div class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-search-x" class="size-6" />
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white">
          No Phone Numbers Match Filter
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
          Try clearing your search query or selecting a different filter option.
        </p>
        <div>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            @click="phoneNumbersStore.searchQuery = ''; phoneNumbersStore.filterService = 'all'; phoneNumbersStore.filterType = 'all'">
            Clear Filters
          </UButton>
        </div>
      </div>

      <!-- Phone Numbers Cards List -->
      <div v-else class="space-y-4">
        <PhoneNumberCard
          v-for="phoneNumber in phoneNumbersStore.filteredPhoneNumbers"
          :key="phoneNumber.sid"
          :phone-number="phoneNumber"
          :account-sid="sid"
          @refresh="handleRefreshSingle" />
      </div>
    </div>
  </div>
</template>
