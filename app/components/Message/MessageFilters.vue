<script setup lang="ts">
import { useMessagesStore } from "~/stores/messages";
import { useMessagingStore } from "~/stores/messaging";
import type { AuthCredentials } from "~/types";

const props = defineProps<{
  accountSid: string;
  authCredentials: AuthCredentials;
}>();

const messagesStore = useMessagesStore();
const messagingStore = useMessagingStore();

const isServerFilterOpen = ref<boolean>(false);

const activeServerFiltersCount = computed(() => {
  let count = 0;
  if (messagesStore.formFrom) {
    count++;
  }
  if (messagesStore.formTo) {
    count++;
  }
  if (messagesStore.formFromDate) {
    count++;
  }
  if (messagesStore.formToDate) {
    count++;
  }
  return count;
});

async function handleApplyServerFilter(): Promise<void> {
  await messagesStore.loadMessages(props.authCredentials, true);
  isServerFilterOpen.value = false;
}

async function handleResetServerFilter(): Promise<void> {
  await messagesStore.resetSearch(props.authCredentials);
  isServerFilterOpen.value = false;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Main Search & Quick Filters Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- Search Input -->
      <div class="relative w-full lg:w-80">
        <UInput v-model="messagesStore.searchQuery" placeholder="Filter loaded messages by text, SID, numbers..."
          icon="i-lucide-search" size="sm" class="w-full">
          <template v-if="messagesStore.searchQuery" #trailing>
            <button type="button" class="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              @click="messagesStore.searchQuery = ''">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </template>
        </UInput>
      </div>

      <!-- Quick Filter Pills & Controls -->
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <!-- Direction Filter Pills -->
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button type="button" class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer" :class="messagesStore.filterDirection === 'all'
            ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="messagesStore.filterDirection = 'all'">
            All ({{ messagesStore.stats.total }})
          </button>
          <button type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1" :class="messagesStore.filterDirection === 'outbound'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="messagesStore.filterDirection = 'outbound'">
            <UIcon name="i-lucide-arrow-up-right" class="size-3 text-blue-500" />
            Outbound ({{ messagesStore.stats.outbound }})
          </button>
          <button type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1" :class="messagesStore.filterDirection === 'inbound'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="messagesStore.filterDirection = 'inbound'">
            <UIcon name="i-lucide-arrow-down-left" class="size-3 text-emerald-500" />
            Inbound ({{ messagesStore.stats.inbound }})
          </button>
        </div>

        <!-- Status Filter Pills -->
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button type="button" class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer" :class="messagesStore.filterStatus === 'all'
            ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="messagesStore.filterStatus = 'all'">
            All Status
          </button>
          <button type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-emerald-700 dark:text-emerald-400"
            :class="messagesStore.filterStatus === 'delivered'
              ? 'bg-white dark:bg-neutral-900 shadow-xs'
              : 'hover:text-emerald-900 dark:hover:text-emerald-300'"
            @click="messagesStore.filterStatus = 'delivered'">
            Delivered
          </button>
          <button type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-blue-700 dark:text-blue-400"
            :class="messagesStore.filterStatus === 'sent'
              ? 'bg-white dark:bg-neutral-900 shadow-xs'
              : 'hover:text-blue-900 dark:hover:text-blue-300'" @click="messagesStore.filterStatus = 'sent'">
            Sent
          </button>
          <button v-if="messagesStore.stats.failed > 0" type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-red-600 dark:text-red-400"
            :class="messagesStore.filterStatus === 'failed'
              ? 'bg-white dark:bg-neutral-900 shadow-xs'
              : 'hover:text-red-800 dark:hover:text-red-300'" @click="messagesStore.filterStatus = 'failed'">
            Failed ({{ messagesStore.stats.failed }})
          </button>
        </div>

        <!-- Messaging Service Select if services exist -->
        <div v-if="messagingStore.services.length > 0" class="max-w-[150px]">
          <select v-model="messagesStore.filterService"
            class="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
            <option value="all">All Services</option>
            <option v-for="service in messagingStore.services" :key="service.sid" :value="service.sid">
              {{ service.friendly_name }}
            </option>
          </select>
        </div>

        <!-- Toggle Server-Side Filter Drawer -->
        <UButton color="neutral" variant="outline" size="xs" class="relative"
          @click="isServerFilterOpen = !isServerFilterOpen">
          <template #leading>
            <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
          </template>
          Twilio API Query
          <UBadge v-if="activeServerFiltersCount > 0" color="primary" variant="solid" size="xs"
            class="ml-1 px-1.5 py-0 font-mono text-[10px]">
            {{ activeServerFiltersCount }}
          </UBadge>
        </UButton>
      </div>
    </div>

    <!-- Collapsible Advanced Twilio API Query Drawer -->
    <div v-if="isServerFilterOpen"
      class="p-4 rounded-xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800 text-xs">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-server" class="size-4 text-blue-500" />
          <span class="font-semibold text-neutral-900 dark:text-white">Query Twilio Messages API Directly</span>
          <span class="text-neutral-500 dark:text-neutral-400 text-[11px] hidden sm:inline">
            (Filter server-side across millions of messages before loading)
          </span>
        </div>

        <button type="button" class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          @click="isServerFilterOpen = false">
          <UIcon name="i-lucide-x" class="size-4" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <!-- From Number -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">From Number</label>
          <UInput v-model="messagesStore.formFrom" placeholder="e.g. +16319999998" size="sm" class="w-full" />
        </div>

        <!-- To Number -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">To Number</label>
          <UInput v-model="messagesStore.formTo" placeholder="e.g. +16319999999" size="sm" class="w-full" />
        </div>

        <!-- Date Sent From -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">Sent On / After</label>
          <input v-model="messagesStore.formFromDate" type="date"
            class="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
        </div>

        <!-- Date Sent To -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">Sent On / Before</label>
          <input v-model="messagesStore.formToDate" type="date"
            class="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center justify-end gap-2 pt-1">
        <UButton color="neutral" variant="ghost" size="xs" @click="handleResetServerFilter">
          Reset All
        </UButton>

        <UButton color="primary" variant="solid" size="xs" :loading="messagesStore.isLoading"
          class="bg-blue-600 hover:bg-blue-700 text-white" @click="handleApplyServerFilter">
          <template #leading>
            <UIcon name="i-lucide-search" class="size-3.5" />
          </template>
          Run API Query
        </UButton>
      </div>
    </div>
  </div>
</template>
