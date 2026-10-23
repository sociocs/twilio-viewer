<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import { useClipboard } from "@vueuse/core";
import { useMainStore } from "~/stores/main";
import type { Subaccount } from "~/types";

const store = useMainStore();
const route = useRoute();
const toast = useToast();
const { copy } = useClipboard();

const currentSid = computed(() => String(route.params.sid || store.activeAccount?.account_sid || ""));

const editLabelModalOpen = ref(false);
const editTwilioModalOpen = ref(false);

async function handleRefreshTwilioName(): Promise<void> {
  if (!store.activeAccountSid) {
    return;
  }
  const res = await store.refreshTwilioAccountName(store.activeAccountSid);
  if (res.success && res.data) {
    toast.add({
      title: "Twilio Account Refreshed",
      description: `Account name is "${res.data.friendly_name}".`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else {
    toast.add({
      title: "Refresh Failed",
      description: res.error || "Could not fetch account details from Twilio.",
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}

onMounted(() => {
  if (store.activeAccount && !store.activeAccount.friendly_name && store.activeCredentials) {
    store.refreshTwilioAccountName();
  }
});

const lastRefreshedText = computed(() => {
  if (!store.subaccounts.length) {
    return "";
  }
  const timestamps = store.subaccounts.map(s => s.loaded_at || s.created_at).filter(Boolean);
  if (!timestamps.length) {
    return "";
  }
  const latest = Math.max(...timestamps);
  if (!latest || isNaN(latest)) {
    return "";
  }
  return formatDistanceToNow(new Date(latest), { addSuffix: true });
});

async function handleRefreshSubaccounts(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }

  const res = await store.fetchAndPersistSubaccounts(store.activeCredentials);
  if (res.success) {
    toast.add({
      title: "Subaccounts Refreshed",
      description: `Discovered ${res.count} subaccount${res.count === 1 ? "" : "s"}.`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else {
    toast.add({
      title: "Refresh Failed",
      description: res.error || "Could not fetch subaccounts from Twilio.",
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}

function handleCopy(text: string, label: string): void {
  copy(text);
  toast.add({
    title: "Copied",
    description: `Copied ${label} to clipboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

async function handleDisconnect(): Promise<void> {
  if (!store.activeAccountSid) {
    return;
  }
  await store.removeConnection(store.activeAccountSid);
  toast.add({
    title: "Disconnected",
    description: "Account was disconnected.",
    color: "info",
    icon: "i-lucide-log-out",
  });

  if (store.activeAccountSid) {
    await navigateTo(`/accounts/${store.activeAccountSid}`);
  } else {
    await navigateTo("/");
  }
}

const isSubaccountsExpanded = ref(true);
const subaccountSearch = ref("");
const switchingSubaccountSid = ref("");

const filteredSubaccounts = computed(() => {
  const query = subaccountSearch.value.trim().toLowerCase();
  if (!query) {
    return store.subaccounts;
  }
  return store.subaccounts.filter(
    s => s.name.toLowerCase().includes(query) || s.sid.toLowerCase().includes(query)
  );
});

function getSubaccountStatusColor(status?: string): "success" | "warning" | "error" | "neutral" {
  switch (status?.toLowerCase()) {
    case "active":
      return "success";
    case "suspended":
      return "warning";
    case "closed":
      return "neutral";
    default:
      return "neutral";
  }
}

function formatSubaccountDate(timestamp?: number): string {
  if (!timestamp) {
    return "—";
  }
  try {
    return format(new Date(timestamp), "PP");
  } catch {
    return "—";
  }
}

async function handleSwitchToSubaccount(sub: Subaccount): Promise<void> {
  if (sub.sid === store.activeAccountSid) {
    return;
  }
  switchingSubaccountSid.value = sub.sid;
  try {
    await store.switchToSubaccount(sub);
    toast.add({
      title: "Subaccount Activated",
      description: `Switched to "${sub.name}".`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
    await navigateTo(`/accounts/${sub.sid}`);
  } catch (err: unknown) {
    toast.add({
      title: "Switch Failed",
      description: (err as Error)?.message || "Failed to switch to subaccount.",
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  } finally {
    switchingSubaccountSid.value = "";
  }
}

async function handleSwitchToParent(): Promise<void> {
  const parentSid = store.activeAccount?.owner_account_sid;
  if (!parentSid) {
    return;
  }
  await store.switchActiveConnection(parentSid);
  toast.add({
    title: "Master Account Activated",
    description: "Switched back to primary account.",
    color: "info",
    icon: "i-lucide-corner-up-left",
  });
  await navigateTo(`/accounts/${parentSid}`);
}

const sections = computed(() => [
  {
    title: "Messaging Services",
    description: "Inspect sender pools, US A2P 10DLC campaigns, and toll-free verification approvals.",
    icon: "i-lucide-message-square-code",
    badge: "Available",
    badgeColor: "success" as const,
    to: currentSid.value ? `/accounts/${currentSid.value}/messaging-services` : "",
  },
  {
    title: "Phone Numbers",
    description: "Inspect incoming numbers, SMS/Voice capabilities, webhook routing, and linked messaging services.",
    icon: "i-lucide-phone",
    badge: "Available",
    badgeColor: "success" as const,
    to: currentSid.value ? `/accounts/${currentSid.value}/phone-numbers` : "",
  },
  {
    title: "Message History",
    description: "Filter and view inbound and outbound SMS/MMS messages with delivery status.",
    icon: "i-lucide-message-square",
    badge: "Available",
    badgeColor: "success" as const,
    to: currentSid.value ? `/accounts/${currentSid.value}/message-history` : "",
  },
  {
    title: "Voice Call History",
    description: "Review voice calls, durations, price estimates, recordings, and call statuses.",
    icon: "i-lucide-phone-call",
    badge: "Available",
    badgeColor: "success" as const,
    to: currentSid.value ? `/accounts/${currentSid.value}/voice-call-history` : "",
  },
  {
    title: "Alerts & Monitor",
    description: "Real-time visibility into Twilio debugger notices, warnings, error codes, and audit events.",
    icon: "i-lucide-bell",
    badge: "Available",
    badgeColor: "success" as const,
    to: currentSid.value ? `/accounts/${currentSid.value}/alerts-monitor` : "",
  },
  {
    title: "Billing & Usage",
    description: "Check live account balances and detailed usage records by service type.",
    icon: "i-lucide-receipt",
    badge: "Available",
    badgeColor: "success" as const,
    to: currentSid.value ? `/accounts/${currentSid.value}/billing-usage` : "",
  },
]);
</script>

<template>
  <div v-if="store.activeAccount" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Subaccount Parent Notice Banner (if viewing a subaccount) -->
    <div
      v-if="store.isSubaccount && store.activeAccount?.owner_account_sid"
      class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="size-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-corner-up-left" class="size-4" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">
            Subaccount of {{ store.parentAccount?.name || store.activeAccount.owner_account_sid }}
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            Parent Account SID: {{ store.activeAccount.owner_account_sid }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          @click="handleSwitchToParent">
          <template #leading>
            <UIcon name="i-lucide-arrow-left" class="size-3.5" />
          </template>
          Switch to Parent Account
        </UButton>
      </div>
    </div>

    <!-- Active Account Banner -->
    <UCard class="shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2.5">
            <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {{ store.activeAccount.name }}
            </h1>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-pencil"
              title="Edit connection label"
              aria-label="Edit connection label"
              @click="editLabelModalOpen = true" />
            <UBadge color="success" variant="subtle" size="sm">
              {{ store.activeAccount.status || "active" }}
            </UBadge>
            <UBadge
              v-if="store.isSubaccount"
              color="warning"
              variant="subtle"
              size="sm">
              Subaccount
            </UBadge>
            <UBadge
              v-else-if="store.subaccounts.length > 0"
              color="neutral"
              variant="subtle"
              size="sm">
              {{ store.subaccounts.length }} Subaccounts
            </UBadge>
          </div>

          <!-- Twilio Account Name on Twilio API -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs">
              <UIcon name="i-lucide-cloud" class="size-3.5 text-red-500 shrink-0" />
              <span class="text-neutral-500 dark:text-neutral-400 font-medium">Twilio Account Name:</span>
              <span class="font-semibold text-neutral-900 dark:text-white truncate max-w-xs">
                {{ store.activeAccount.friendly_name || store.activeAccount.name }}
              </span>

              <div class="flex items-center gap-0.5 border-l border-neutral-200 dark:border-neutral-700 pl-1.5 ml-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-refresh-cw"
                  :loading="store.isRefreshingTwilioName"
                  title="Refresh from Twilio API"
                  aria-label="Refresh Twilio Account Name"
                  @click="handleRefreshTwilioName" />
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-pencil"
                  title="Edit on Twilio API"
                  aria-label="Edit Twilio Account Name"
                  @click="editTwilioModalOpen = true" />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <div class="flex items-center gap-1.5 font-mono">
              <span>SID: {{ store.activeAccount.account_sid }}</span>
              <button
                type="button"
                class="hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                title="Copy SID"
                @click="handleCopy(store.activeAccount.account_sid, 'Account SID')">
                <UIcon name="i-lucide-copy" class="size-3.5" />
              </button>
            </div>

            <span class="hidden sm:inline">&bull;</span>

            <div v-if="store.activeAccount.created_at">
              Added: {{ format(new Date(store.activeAccount.saved_at || store.activeAccount.created_at), "PP") }}
            </div>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            @click="handleDisconnect">
            <template #leading>
              <UIcon name="i-lucide-log-out" class="size-4" />
            </template>
            Disconnect
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Exploration Sections Grid -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">
        Twilio Services
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <template v-for="item in sections" :key="item.title">
          <NuxtLink
            v-if="item.to"
            :to="item.to"
            class="block h-full group focus:outline-none">
            <UCard
              class="h-full hover:ring-neutral-400/50 dark:hover:ring-neutral-700 hover:shadow-md transition-all ring-1 ring-neutral-200 dark:ring-neutral-800 cursor-pointer hover:border-red-500/40">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="size-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
                    <UIcon :name="item.icon" class="size-5" />
                  </div>
                  <UBadge :color="item.badgeColor || 'neutral'" variant="subtle" size="xs">
                    {{ item.badge }}
                  </UBadge>
                </div>

                <div>
                  <h3 class="font-semibold text-neutral-900 dark:text-white flex items-center justify-between group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    <span>{{ item.title }}</span>
                    <UIcon name="i-lucide-arrow-right" class="size-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-red-500" />
                  </h3>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </UCard>
          </NuxtLink>

          <div
            v-else
            class="block h-full">
            <UCard
              class="h-full hover:ring-neutral-400/50 dark:hover:ring-neutral-700 hover:shadow-md transition-all ring-1 ring-neutral-200 dark:ring-neutral-800">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="size-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-red-500">
                    <UIcon :name="item.icon" class="size-5" />
                  </div>
                  <UBadge :color="item.badgeColor || 'neutral'" variant="subtle" size="xs">
                    {{ item.badge }}
                  </UBadge>
                </div>

                <div>
                  <h3 class="font-semibold text-neutral-900 dark:text-white">
                    {{ item.title }}
                  </h3>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </div>
    </div>

    <!-- Subaccounts Section Card (When subaccounts exist) -->
    <UCard
      v-if="store.subaccounts.length > 0"
      class="shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900">
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-layers" class="size-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-semibold text-neutral-900 dark:text-white">
                  Subaccounts
                </h2>
                <UBadge color="neutral" variant="subtle" size="sm">
                  {{ store.subaccounts.length }} {{ store.subaccounts.length === 1 ? "Subaccount" : "Subaccounts" }}
                </UBadge>
              </div>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Subaccounts linked to this master account. Inspect their phone numbers, messaging services, call history, and messages.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <span v-if="lastRefreshedText" class="text-xs text-neutral-400">
              Refreshed {{ lastRefreshedText }}
            </span>
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              :loading="store.isFetchingSubaccounts"
              title="Refresh subaccounts from Twilio"
              aria-label="Refresh subaccounts"
              @click="handleRefreshSubaccounts">
              <template #leading>
                <UIcon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': store.isFetchingSubaccounts }" />
              </template>
              Refresh
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              :title="isSubaccountsExpanded ? 'Collapse subaccounts list' : 'Expand subaccounts list'"
              :aria-label="isSubaccountsExpanded ? 'Collapse subaccounts list' : 'Expand subaccounts list'"
              @click="isSubaccountsExpanded = !isSubaccountsExpanded">
              <template #leading>
                <UIcon :name="isSubaccountsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5" />
              </template>
              {{ isSubaccountsExpanded ? "Collapse" : "Expand" }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- Expandable Subaccount List / Table -->
      <div v-show="isSubaccountsExpanded" class="space-y-4">
        <!-- Search filter if more than 3 subaccounts -->
        <div v-if="store.subaccounts.length > 3" class="flex items-center justify-between gap-4">
          <UInput
            v-model="subaccountSearch"
            icon="i-lucide-search"
            size="sm"
            placeholder="Search by name or SID..."
            class="max-w-sm w-full" />
          <span class="text-xs text-neutral-500 dark:text-neutral-400">
            Showing {{ filteredSubaccounts.length }} of {{ store.subaccounts.length }}
          </span>
        </div>

        <!-- Subaccounts Table -->
        <div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table class="w-full text-left text-sm">
            <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th scope="col" class="py-3 px-4">Subaccount Name</th>
                <th scope="col" class="py-3 px-4">Account SID</th>
                <th scope="col" class="py-3 px-4">Status</th>
                <th scope="col" class="py-3 px-4">Created Date</th>
                <th scope="col" class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
              <tr
                v-for="sub in filteredSubaccounts"
                :key="sub.sid"
                class="hover:bg-neutral-50/75 dark:hover:bg-neutral-800/40 transition-colors">
                <!-- Name -->
                <td class="py-3.5 px-4">
                  <span class="font-medium text-neutral-900 dark:text-white">
                    {{ sub.name }}
                  </span>
                </td>

                <!-- SID -->
                <td class="py-3.5 px-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                  <div class="inline-flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                    <span>{{ sub.sid }}</span>
                    <button
                      type="button"
                      class="hover:text-neutral-900 dark:hover:text-white cursor-pointer ml-0.5"
                      title="Copy Subaccount SID"
                      @click="handleCopy(sub.sid, 'Subaccount SID')">
                      <UIcon name="i-lucide-copy" class="size-3.5" />
                    </button>
                  </div>
                </td>

                <!-- Status -->
                <td class="py-3.5 px-4">
                  <UBadge
                    :color="getSubaccountStatusColor(sub.status)"
                    variant="subtle"
                    size="xs">
                    {{ sub.status || "active" }}
                  </UBadge>
                </td>

                <!-- Created Date -->
                <td class="py-3.5 px-4 text-xs text-neutral-500 dark:text-neutral-400">
                  {{ formatSubaccountDate(sub.created_at) }}
                </td>

                <!-- Actions -->
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <UButton
                      v-if="sub.sid !== store.activeAccountSid"
                      color="primary"
                      variant="subtle"
                      size="xs"
                      :loading="switchingSubaccountSid === sub.sid"
                      @click="handleSwitchToSubaccount(sub)">
                      <template #leading>
                        <UIcon name="i-lucide-arrow-right-circle" class="size-3.5" />
                      </template>
                      Switch & Inspect
                    </UButton>
                    <UBadge
                      v-else
                      color="primary"
                      variant="outline"
                      size="xs">
                      <UIcon name="i-lucide-check" class="size-3 mr-1" />
                      Current
                    </UBadge>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredSubaccounts.length === 0">
                <td colspan="5" class="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  No subaccounts match your search "{{ subaccountSearch }}".
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </UCard>

    <!-- Subaccounts Detected: Empty State (0 found) -->
    <div
      v-else
      class="p-4 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="size-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-layers" class="size-4" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">
            No Subaccounts Detected
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            No subaccounts found under this account. You can re-check anytime.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
        <span v-if="lastRefreshedText" class="text-xs text-neutral-400">
          Refreshed {{ lastRefreshedText }}
        </span>
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          :loading="store.isFetchingSubaccounts"
          @click="handleRefreshSubaccounts">
          <template #leading>
            <UIcon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': store.isFetchingSubaccounts }" />
          </template>
          Refresh
        </UButton>
      </div>
    </div>

    <!-- Edit Connection Label Modal -->
    <DashboardEditLabelModal
      v-model:open="editLabelModalOpen"
      :account-sid="store.activeAccount.account_sid"
      :current-name="store.activeAccount.name" />

    <!-- Edit Twilio Account Name Modal -->
    <DashboardEditTwilioNameModal
      v-model:open="editTwilioModalOpen"
      :account-sid="store.activeAccount.account_sid"
      :current-twilio-name="store.activeAccount.friendly_name || store.activeAccount.name" />
  </div>
</template>
