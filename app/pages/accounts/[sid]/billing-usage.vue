<script setup lang="ts">
import { useMainStore } from "~/stores/main";
import { useBillingStore } from "~/stores/billing";

definePageMeta({
  alias: ["/accounts/:sid/billing"],
});

useSeoMeta({
  title: "Twilio Account Billing & Usage",
  description: "Live Twilio account balance, services breakdown and detailed usage records.",
});

const route = useRoute();
const toast = useToast();
const store = useMainStore();
const billingStore = useBillingStore();

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

  billingStore.initializeFilters();

  if (store.activeCredentials) {
    await billingStore.loadAll(store.activeCredentials);
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
  await billingStore.loadAll(store.activeCredentials, true);

  if (!billingStore.usageError) {
    toast.add({
      title: "Billing & Usage Refreshed",
      description: `Loaded ${billingStore.enrichedRecords.length} active categories from Twilio.`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else {
    toast.add({
      title: "Refresh Error",
      description: billingStore.usageError,
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}

async function handleRefreshBalance(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }
  await billingStore.loadBalance(store.activeCredentials, true);

  if (!billingStore.balanceError && !billingStore.isSubaccountBalanceUnavailable) {
    toast.add({
      title: "Balance Refreshed",
      description: `Current balance: ${billingStore.formatPrice(billingStore.balance?.balance, billingStore.balance?.currency)}.`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else if (billingStore.balanceError) {
    toast.add({
      title: "Balance Refresh Failed",
      description: billingStore.balanceError,
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}

async function handleApplySearch(): Promise<void> {
  if (!store.activeCredentials) {
    return;
  }
  await billingStore.loadUsage(store.activeCredentials, true);

  if (!billingStore.usageError) {
    toast.add({
      title: "Usage Updated",
      description: `Found ${billingStore.enrichedRecords.length} active service records.`,
      color: "success",
      icon: "i-lucide-check-circle",
    });
  } else {
    toast.add({
      title: "Query Error",
      description: billingStore.usageError,
      color: "error",
      icon: "i-lucide-shield-alert",
    });
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <!-- Header Section -->
    <BillingHeader
      :account-sid="sid"
      :auth-credentials="store.activeCredentials || { account_sid: sid, auth_token: '' }"
      :account-name="store.activeAccount?.name || store.activeAccount?.friendly_name"
      :is-subaccount="store.isSubaccount"
      :parent-account-sid="store.activeAccount?.owner_account_sid"
      :parent-account-name="store.parentAccount?.name"
      @refresh-all="handleRefreshAll"
      @refresh-balance="handleRefreshBalance" />

    <!-- Filters Section -->
    <BillingFilterBar
      @apply-search="handleApplySearch" />

    <!-- Usage Records Table -->
    <BillingUsageTable
      @retry="handleApplySearch" />
  </div>
</template>
