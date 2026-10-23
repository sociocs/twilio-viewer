<script setup lang="ts">
import type { AuthCredentials } from "~/types";
import { useMonitorStore } from "~/stores/monitor";

const props = defineProps<{
  accountSid: string;
  authCredentials: AuthCredentials;
}>();

const monitorStore = useMonitorStore();
const isServerFilterOpen = ref(false);

const activeServerFiltersCount = computed(() => {
  let count = 0;
  if (monitorStore.formLogLevel !== "all") count++;
  if (monitorStore.formStartDate.trim()) count++;
  if (monitorStore.formEndDate.trim()) count++;
  return count;
});

async function handleApplyServerFilter(): Promise<void> {
  await monitorStore.loadAlerts(props.authCredentials, true);
  isServerFilterOpen.value = false;
}

async function handleResetServerFilter(): Promise<void> {
  monitorStore.formLogLevel = "all";
  monitorStore.formStartDate = "";
  monitorStore.formEndDate = "";
  monitorStore.alertsSearchQuery = "";
  monitorStore.filterLogLevel = "all";
  await monitorStore.loadAlerts(props.authCredentials, true);
  isServerFilterOpen.value = false;
}
</script>

<template>
  <div class="space-y-3">
    <!-- Main Search & Quick Filters Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- Search Input -->
      <div class="relative w-full lg:w-80">
        <UInput
          v-model="monitorStore.alertsSearchQuery"
          placeholder="Filter alerts by code, text, SID, URL..."
          icon="i-lucide-search"
          size="sm"
          class="w-full">
          <template v-if="monitorStore.alertsSearchQuery" #trailing>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              @click="monitorStore.alertsSearchQuery = ''">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </template>
        </UInput>
      </div>

      <!-- Quick Client Filters Group -->
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <!-- Log Level Pills -->
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
            :class="monitorStore.filterLogLevel === 'all'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="monitorStore.filterLogLevel = 'all'">
            All ({{ monitorStore.alertsStats.total }})
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-red-600 dark:text-red-400 flex items-center gap-1"
            :class="monitorStore.filterLogLevel === 'error'
              ? 'bg-white dark:bg-neutral-900 shadow-xs'
              : 'hover:text-red-800 dark:hover:text-red-300'"
            @click="monitorStore.filterLogLevel = 'error'">
            <UIcon name="i-lucide-alert-circle" class="size-3" />
            Errors ({{ monitorStore.alertsStats.errors }})
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-amber-600 dark:text-amber-400 flex items-center gap-1"
            :class="monitorStore.filterLogLevel === 'warning'
              ? 'bg-white dark:bg-neutral-900 shadow-xs'
              : 'hover:text-amber-800 dark:hover:text-amber-300'"
            @click="monitorStore.filterLogLevel = 'warning'">
            <UIcon name="i-lucide-alert-triangle" class="size-3" />
            Warnings ({{ monitorStore.alertsStats.warnings }})
          </button>
          <button
            v-if="monitorStore.alertsStats.notices > 0"
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-blue-600 dark:text-blue-400 flex items-center gap-1"
            :class="monitorStore.filterLogLevel === 'notice'
              ? 'bg-white dark:bg-neutral-900 shadow-xs'
              : 'hover:text-blue-800 dark:hover:text-blue-300'"
            @click="monitorStore.filterLogLevel = 'notice'">
            <UIcon name="i-lucide-info" class="size-3" />
            Notices ({{ monitorStore.alertsStats.notices }})
          </button>
        </div>

        <!-- Toggle Server-Side Filter Drawer -->
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          class="relative"
          @click="isServerFilterOpen = !isServerFilterOpen">
          <template #leading>
            <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
          </template>
          Twilio API Query
          <UBadge
            v-if="activeServerFiltersCount > 0"
            color="primary"
            variant="solid"
            size="xs"
            class="ml-1 px-1.5 py-0 font-mono text-[10px]">
            {{ activeServerFiltersCount }}
          </UBadge>
        </UButton>
      </div>
    </div>

    <!-- Collapsible Advanced Twilio API Query Drawer -->
    <div
      v-if="isServerFilterOpen"
      class="p-4 rounded-xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800 text-xs">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-database" class="size-4 text-primary" />
          <span class="font-semibold text-neutral-800 dark:text-neutral-200">
            Query Twilio Monitor Alerts Directly via REST API
          </span>
        </div>

        <button
          type="button"
          class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          @click="isServerFilterOpen = false">
          <UIcon name="i-lucide-x" class="size-4" />
        </button>
      </div>

      <!-- Inputs Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <!-- Log Level -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">Log Level</label>
          <select
            v-model="monitorStore.formLogLevel"
            class="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="notice">Notice</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <!-- Start Date -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">Generated On / After</label>
          <input
            v-model="monitorStore.formStartDate"
            type="date"
            class="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
        </div>

        <!-- End Date -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">Generated On / Before</label>
          <input
            v-model="monitorStore.formEndDate"
            type="date"
            class="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center justify-end gap-2 pt-1">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          @click="handleResetServerFilter">
          Reset All
        </UButton>

        <UButton
          color="primary"
          variant="solid"
          size="xs"
          :loading="monitorStore.isLoadingAlerts"
          class="bg-blue-600 hover:bg-blue-700 text-white"
          @click="handleApplyServerFilter">
          <template #leading>
            <UIcon name="i-lucide-search" class="size-3.5" />
          </template>
          Search Alerts
        </UButton>
      </div>
    </div>
  </div>
</template>
