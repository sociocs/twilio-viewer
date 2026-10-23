<script setup lang="ts">
import { useMainStore } from "~/stores/main";

const route = useRoute();
const store = useMainStore();

const sid = computed(() => String(route.params.sid || ""));

const targetAccount = computed(() => {
  return store.savedConnections.find(c => c.account_sid === sid.value);
});

async function syncAccount(): Promise<void> {
  if (store.isInitializing) {
    await store.loadConnections();
  }

  if (targetAccount.value && store.activeAccountSid !== sid.value) {
    await store.switchActiveConnection(sid.value);
  }
}

onMounted(async () => {
  await syncAccount();
});

watch(sid, async () => {
  await syncAccount();
});
</script>

<template>
  <div>
    <!-- Initializing State -->
    <div v-if="store.isInitializing" class="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <UIcon name="i-lucide-refresh-cw" class="size-8 text-red-500 animate-spin" />
      <span class="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
        Loading account records...
      </span>
    </div>

    <!-- Active Connected Account Dashboard -->
    <DashboardAccountOverview v-else-if="targetAccount" />

    <!-- Not Found in Local Storage Alert -->
    <div v-else class="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
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
        <UButton
          to="/"
          color="neutral"
          variant="outline"
          size="md">
          <template #leading>
            <UIcon name="i-lucide-arrow-left" class="size-4" />
          </template>
          Back to Home
        </UButton>

        <UButton
          to="/"
          color="primary"
          variant="solid"
          size="md"
          class="bg-gradient-to-r from-red-600 to-rose-600 text-white">
          <template #leading>
            <UIcon name="i-lucide-plus" class="size-4" />
          </template>
          Connect Account
        </UButton>
      </div>
    </div>
  </div>
</template>
