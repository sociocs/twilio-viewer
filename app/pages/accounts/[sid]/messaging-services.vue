<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";
import { useMainStore } from "~/stores/main";
import { useMessagingStore } from "~/stores/messaging";

const route = useRoute();
const store = useMainStore();
const messagingStore = useMessagingStore();
const toast = useToast();

const sid = computed(() => String(route.params.sid || ""));

const targetAccount = computed(() => {
  return store.savedConnections.find(c => c.account_sid === sid.value);
});

async function syncAccountAndLoad(): Promise<void> {
  if (store.isInitializing) {
    await store.loadConnections();
  }

  if (targetAccount.value && store.activeAccountSid !== sid.value) {
    await store.switchActiveConnection(sid.value);
  }

  if (store.activeCredentials) {
    await messagingStore.loadMessagingServices(store.activeCredentials);
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
  (srv) => {
    if (typeof srv === "string" && srv) {
      messagingStore.searchQuery = srv;
    }
  },
  { immediate: true },
);

async function handleRefreshAll(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }

  await messagingStore.loadMessagingServices(store.activeCredentials, true);
  if (!messagingStore.error) {
    toast.add({
      title: "Messaging Services Refreshed",
      description: `Loaded ${messagingStore.services.length} messaging services directly from Twilio.`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else {
    toast.add({
      title: "Refresh Error",
      description: messagingStore.error,
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}

async function handleRefreshSingle(serviceSid: string): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }

  await messagingStore.refreshSingleService(serviceSid, store.activeCredentials);
  toast.add({
    title: "Service Refreshed",
    description: `Refreshed details and registration status for ${serviceSid}.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

const relativeFetchTime = computed(() => {
  if (!messagingStore.lastFetchedAt) {
    return "";
  }
  return formatDistanceToNow(new Date(messagingStore.lastFetchedAt), { addSuffix: true });
});

useSeoMeta({
  title: computed(() => `Messaging Services - ${store.activeAccount?.name || sid.value} - Twilio Viewer`),
  description: "View all messaging services in your Twilio account along with US A2P 10DLC and Toll-Free registration and approval statuses.",
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Initializing State -->
    <div v-if="store.isInitializing" class="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <UIcon name="i-lucide-refresh-cw" class="size-8 text-red-500 animate-spin" />
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
          The Twilio account <code class="font-mono text-red-500 font-semibold">{{ sid }}</code> is not saved in your browser's local database.
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

    <!-- Main Messaging Services Dashboard -->
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
            Messaging Services
          </span>
        </div>

        <div class="flex items-center gap-2">
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
            <div class="size-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-sm shadow-red-500/20">
              <UIcon name="i-lucide-message-square-code" class="size-6" />
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Messaging Services
              </h1>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Inspect sender pools, US A2P 10DLC registrations, and Toll-Free verification approvals.
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
            :loading="messagingStore.isLoading"
            class="bg-gradient-to-r from-red-600 to-rose-600 text-white"
            @click="handleRefreshAll">
            <template #leading>
              <UIcon name="i-lucide-refresh-cw" class="size-4" />
            </template>
            Refresh Data
          </UButton>
        </div>
      </div>

      <!-- Metric Cards Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Services</span>
          <div class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ messagingStore.metrics.total }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <UIcon name="i-lucide-badge-check" class="size-3.5" />
            A2P 10DLC Verified
          </span>
          <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {{ messagingStore.metrics.a2pVerified }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <UIcon name="i-lucide-clock" class="size-3.5" />
            A2P Pending
          </span>
          <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {{ messagingStore.metrics.a2pPending }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <UIcon name="i-lucide-check-circle-2" class="size-3.5" />
            Toll-Free Verified
          </span>
          <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {{ messagingStore.metrics.tollfreeVerified }}
          </div>
        </div>

        <div class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <span class="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
            <UIcon name="i-lucide-alert-circle" class="size-3.5" />
            Needs Attention
          </span>
          <div class="text-2xl font-bold text-red-600 dark:text-red-400">
            {{ messagingStore.metrics.needsAttention }}
          </div>
        </div>
      </div>

      <!-- Search and Filter Bar -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="flex-1 max-w-md">
          <UInput
            v-model="messagingStore.searchQuery"
            placeholder="Search by service name, SID, use case, campaign ID..."
            size="md"
            class="w-full">
            <template #leading>
              <UIcon name="i-lucide-search" class="size-4 text-neutral-400" />
            </template>
            <template v-if="messagingStore.searchQuery" #trailing>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-x"
                aria-label="Clear search"
                @click="messagingStore.searchQuery = ''" />
            </template>
          </UInput>
        </div>

        <!-- Filter Status Buttons -->
        <div class="flex flex-wrap items-center gap-1.5">
          <UButton
            :color="messagingStore.filterStatus === 'all' ? 'primary' : 'neutral'"
            :variant="messagingStore.filterStatus === 'all' ? 'solid' : 'ghost'"
            size="xs"
            @click="messagingStore.filterStatus = 'all'">
            All ({{ messagingStore.services.length }})
          </UButton>

          <UButton
            :color="messagingStore.filterStatus === 'a2p_verified' ? 'success' : 'neutral'"
            :variant="messagingStore.filterStatus === 'a2p_verified' ? 'solid' : 'ghost'"
            size="xs"
            @click="messagingStore.filterStatus = 'a2p_verified'">
            A2P Verified
          </UButton>

          <UButton
            :color="messagingStore.filterStatus === 'a2p_pending' ? 'warning' : 'neutral'"
            :variant="messagingStore.filterStatus === 'a2p_pending' ? 'solid' : 'ghost'"
            size="xs"
            @click="messagingStore.filterStatus = 'a2p_pending'">
            A2P Pending
          </UButton>

          <UButton
            :color="messagingStore.filterStatus === 'tollfree_verified' ? 'success' : 'neutral'"
            :variant="messagingStore.filterStatus === 'tollfree_verified' ? 'solid' : 'ghost'"
            size="xs"
            @click="messagingStore.filterStatus = 'tollfree_verified'">
            Toll-Free Verified
          </UButton>

          <UButton
            :color="messagingStore.filterStatus === 'needs_attention' ? 'error' : 'neutral'"
            :variant="messagingStore.filterStatus === 'needs_attention' ? 'solid' : 'ghost'"
            size="xs"
            @click="messagingStore.filterStatus = 'needs_attention'">
            Needs Attention
          </UButton>
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="messagingStore.error"
        color="error"
        variant="subtle"
        icon="i-lucide-shield-alert"
        title="Failed to Load Messaging Services"
        :description="messagingStore.error" />

      <!-- Loading State -->
      <div v-if="messagingStore.isLoading && !messagingStore.services.length" class="min-h-[30vh] flex flex-col items-center justify-center gap-3">
        <UIcon name="i-lucide-refresh-cw" class="size-8 text-red-500 animate-spin" />
        <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Fetching messaging services and compliance statuses from Twilio API...
        </span>
      </div>

      <!-- Empty Services State -->
      <div
        v-else-if="!messagingStore.isLoading && !messagingStore.services.length"
        class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
        <div class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-message-square-off" class="size-6" />
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white">
          No Messaging Services Found
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
          There are no messaging services configured under this Twilio account.
        </p>
      </div>

      <!-- No Filter Matches State -->
      <div
        v-else-if="!messagingStore.filteredServices.length"
        class="py-16 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
        <div class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-search-x" class="size-6" />
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white">
          No Services Match Filter
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
          Try clearing your search query or selecting a different filter option.
        </p>
        <div>
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            @click="messagingStore.searchQuery = ''; messagingStore.filterStatus = 'all'">
            Clear Filter
          </UButton>
        </div>
      </div>

      <!-- Services Cards List -->
      <div v-else class="space-y-4">
        <MessagingServiceCard
          v-for="service in messagingStore.filteredServices"
          :key="service.sid"
          :service="service"
          @refresh="handleRefreshSingle" />
      </div>
    </div>
  </div>
</template>
