<script setup lang="ts">
import type { AuthCredentials } from "~/types";
import { useCallsStore } from "~/stores/calls";

const props = defineProps<{
  accountSid: string;
  authCredentials: AuthCredentials;
}>();

const callsStore = useCallsStore();
const isServerFilterOpen = ref(false);

const activeServerFiltersCount = computed(() => {
  let count = 0;
  if (callsStore.formFrom.trim()) count++;
  if (callsStore.formTo.trim()) count++;
  if (callsStore.formStatus !== "all") count++;
  if (callsStore.formFromDate.trim()) count++;
  if (callsStore.formToDate.trim()) count++;
  return count;
});

async function handleApplyServerFilter(): Promise<void> {
  await callsStore.loadCalls(props.authCredentials, true);
  isServerFilterOpen.value = false;
}

async function handleResetServerFilter(): Promise<void> {
  await callsStore.resetSearch(props.authCredentials);
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
          v-model="callsStore.searchQuery"
          placeholder="Filter loaded calls by SID, numbers, caller..."
          icon="i-lucide-search"
          size="sm"
          class="w-full">
          <template v-if="callsStore.searchQuery" #trailing>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              @click="callsStore.searchQuery = ''">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </template>
        </UInput>
      </div>

      <!-- Quick Client Filters Group -->
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <!-- Direction Filter Pills -->
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
            :class="callsStore.filterDirection === 'all'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="callsStore.filterDirection = 'all'">
            All ({{ callsStore.stats.total }})
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1"
            :class="callsStore.filterDirection === 'outbound'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="callsStore.filterDirection = 'outbound'">
            <UIcon name="i-lucide-arrow-up-right" class="size-3 text-blue-500" />
            Outbound ({{ callsStore.stats.outbound }})
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1"
            :class="callsStore.filterDirection === 'inbound'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="callsStore.filterDirection = 'inbound'">
            <UIcon name="i-lucide-arrow-down-left" class="size-3 text-emerald-500" />
            Inbound ({{ callsStore.stats.inbound }})
          </button>
        </div>

        <!-- Status Filter Pills -->
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
            :class="callsStore.filterStatus === 'all'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
            @click="callsStore.filterStatus = 'all'">
            All Status
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-emerald-700 dark:text-emerald-400"
            :class="callsStore.filterStatus === 'completed'
              ? 'bg-white dark:bg-neutral-900 shadow-xs'
              : 'hover:text-emerald-900 dark:hover:text-emerald-300'"
            @click="callsStore.filterStatus = 'completed'">
            Completed ({{ callsStore.stats.completed }})
          </button>
          <button
            v-if="callsStore.stats.failedOrMissed > 0"
            type="button"
            class="px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-amber-700 dark:text-amber-400"
            :class="['busy', 'no-answer', 'failed', 'canceled'].includes(callsStore.filterStatus)
              ? 'bg-white dark:bg-neutral-900 shadow-xs'
              : 'hover:text-amber-900 dark:hover:text-amber-300'"
            @click="callsStore.filterStatus = 'no-answer'">
            Unanswered / Failed ({{ callsStore.stats.failedOrMissed }})
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
            Query Twilio Voice Calls Directly via REST API
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
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <!-- From Number -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">From Number</label>
          <UInput
            v-model="callsStore.formFrom"
            placeholder="e.g. +16319999998"
            size="sm"
            class="w-full" />
        </div>

        <!-- To Number -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">To Number</label>
          <UInput
            v-model="callsStore.formTo"
            placeholder="e.g. +16319999999"
            size="sm"
            class="w-full" />
        </div>

        <!-- Call Status -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">Status</label>
          <select
            v-model="callsStore.formStatus"
            class="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="all">Any Status</option>
            <option value="completed">Completed</option>
            <option value="busy">Busy</option>
            <option value="no-answer">No Answer</option>
            <option value="failed">Failed</option>
            <option value="canceled">Canceled</option>
            <option value="in-progress">In Progress</option>
          </select>
        </div>

        <!-- Start Date -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">Started After</label>
          <input
            v-model="callsStore.formFromDate"
            type="date"
            class="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
        </div>

        <!-- End Date -->
        <div class="space-y-1">
          <label class="font-medium text-neutral-700 dark:text-neutral-300">Ended Before</label>
          <input
            v-model="callsStore.formToDate"
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
          :loading="callsStore.isLoading"
          class="bg-blue-600 hover:bg-blue-700 text-white"
          @click="handleApplyServerFilter">
          <template #leading>
            <UIcon name="i-lucide-search" class="size-3.5" />
          </template>
          Search Twilio
        </UButton>
      </div>
    </div>
  </div>
</template>
