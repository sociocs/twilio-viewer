<script setup lang="ts">
import { useMainStore } from "~/stores/main";
import type { Connection } from "~/types";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();

const store = useMainStore();
const toast = useToast();

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => {
    if (!val) {
      isAddingNew.value = false;
      searchQuery.value = "";
    }
    emit("update:open", val);
  },
});

const isAddingNew = ref(false);
const editingConnection = ref<Connection | null>(null);
const editLabelModalOpen = ref(false);
const searchQuery = ref("");

/**
 * Filtered list of connections matching search query against name, friendly_name, or account SID.
 */
const filteredConnections = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return store.savedConnections;
  }

  return store.savedConnections.filter((conn) => {
    const nameMatch = conn.name.toLowerCase().includes(query);
    const sidMatch = conn.account_sid.toLowerCase().includes(query);
    const friendlyNameMatch = conn.friendly_name
      ? conn.friendly_name.toLowerCase().includes(query)
      : false;
    return nameMatch || sidMatch || friendlyNameMatch;
  });
});

function handleOpenEditModal(conn: Connection): void {
  editingConnection.value = conn;
  editLabelModalOpen.value = true;
}

async function handleSwitch(conn: Connection): Promise<void> {
  if (conn.account_sid === store.activeAccountSid) {
    isOpen.value = false;
    return;
  }

  await store.switchActiveConnection(conn.account_sid);
  toast.add({
    title: "Account Switched",
    description: `Active account is now "${conn.name}".`,
    color: "success",
    icon: "i-lucide-check-circle",
  });
  isOpen.value = false;
  await navigateTo(`/accounts/${conn.account_sid}`);
}

async function handleRemove(conn: Connection): Promise<void> {
  const isRemovingCurrent = conn.account_sid === store.activeAccountSid;
  await store.removeConnection(conn.account_sid);
  toast.add({
    title: "Account Removed",
    description: `Removed "${conn.name}" from saved accounts.`,
    color: "info",
    icon: "i-lucide-trash-2",
  });

  if (isRemovingCurrent) {
    if (store.activeAccountSid) {
      isOpen.value = false;
      await navigateTo(`/accounts/${store.activeAccountSid}`);
    } else {
      isOpen.value = false;
      await navigateTo("/");
    }
  }
}

async function handleAccountSaved(): Promise<void> {
  isAddingNew.value = false;
  isOpen.value = false;
  if (store.activeAccountSid) {
    await navigateTo(`/accounts/${store.activeAccountSid}`);
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Manage Twilio Accounts"
    description="Switch between saved Twilio accounts or add a new one." :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="space-y-4 py-2">
        <!-- If in adding new mode -->
        <div v-if="isAddingNew" class="space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h4 class="font-semibold text-sm text-neutral-900 dark:text-white">
                Connect Another Account
              </h4>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Save an additional Twilio account to switch between accounts at any time.
              </p>
            </div>
            <UButton color="neutral" variant="outline" size="xs" @click="isAddingNew = false">
              <template #leading>
                <UIcon name="i-lucide-arrow-left" class="size-3.5" />
              </template>
              Back to Accounts
            </UButton>
          </div>

          <LandingConnectCard in-modal @saved="handleAccountSaved" />
        </div>

        <!-- Saved connections list -->
        <div v-else class="space-y-3">
          <!-- Filter Search Input -->
          <div v-if="store.savedConnections.length > 0">
            <UInput v-model="searchQuery" placeholder="Filter accounts by name or SID..." size="md" class="w-full">
              <template #leading>
                <UIcon name="i-lucide-search" class="size-4 text-neutral-400" />
              </template>
              <template v-if="searchQuery" #trailing>
                <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" aria-label="Clear filter"
                  @click="searchQuery = ''" />
              </template>
            </UInput>
          </div>

          <!-- Filter Match Count Summary -->
          <div v-if="searchQuery"
            class="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-0.5">
            <span>
              Showing {{ filteredConnections.length }} of {{ store.savedConnections.length }} account{{
                store.savedConnections.length === 1 ? "" : "s" }}
            </span>
            <button type="button" class="hover:text-neutral-700 dark:hover:text-neutral-200 underline cursor-pointer"
              @click="searchQuery = ''">
              Reset filter
            </button>
          </div>

          <!-- Empty Filter State -->
          <div v-if="filteredConnections.length === 0"
            class="py-8 px-4 text-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
            <div
              class="size-9 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
              <UIcon name="i-lucide-search-x" class="size-5" />
            </div>
            <p class="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              No accounts match "{{ searchQuery }}"
            </p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Try searching with a different account name or SID.
            </p>
            <div class="pt-1">
              <UButton color="neutral" variant="outline" size="xs" @click="searchQuery = ''">
                Clear filter
              </UButton>
            </div>
          </div>

          <!-- Saved Connection Items -->
          <div v-for="conn in filteredConnections" :key="conn.account_sid"
            class="p-4 rounded-xl border transition-all flex items-center justify-between gap-4" :class="conn.account_sid === store.activeAccountSid
              ? 'border-red-300 dark:border-red-800/80 bg-red-50/60 dark:bg-red-950/20'
              : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'">
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                  {{ conn.name }}
                </span>
                <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-pencil" title="Edit connection label"
                  aria-label="Edit connection label"
                  class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  @click.stop="handleOpenEditModal(conn)" />
                <UBadge v-if="conn.account_sid === store.activeAccountSid" color="primary" variant="subtle" size="xs">
                  Active
                </UBadge>
                <UBadge v-if="conn.owner_account_sid" color="secondary" variant="subtle" size="xs">
                  Subaccount
                </UBadge>
                <UBadge :color="conn.status == 'active' ? 'success' : 'warning'" variant="subtle" size="xs">
                  {{ conn.status || "active" }}
                </UBadge>
              </div>

              <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
                <span>{{ conn.account_sid }}</span>
                <template v-if="conn.friendly_name && conn.friendly_name !== conn.name">
                  <span>&bull;</span>
                  <span class="font-sans text-neutral-400">Twilio: {{ conn.friendly_name }}</span>
                </template>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <UButton v-if="conn.account_sid !== store.activeAccountSid" color="neutral" variant="outline" size="sm"
                @click="handleSwitch(conn)">
                Switch to this
              </UButton>

              <UButton color="error" variant="ghost" size="sm" icon="i-lucide-trash-2" aria-label="Remove account"
                @click="handleRemove(conn)" />
            </div>
          </div>

          <div class="pt-2">
            <UButton color="neutral" variant="outline" size="md" block @click="isAddingNew = true">
              <template #leading>
                <UIcon name="i-lucide-plus" class="size-4" />
              </template>
              Connect Another Account
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Edit Connection Label Modal -->
  <DashboardEditLabelModal v-if="editingConnection" v-model:open="editLabelModalOpen"
    :account-sid="editingConnection.account_sid" :current-name="editingConnection.name" />
</template>
