<script setup lang="ts">
import type { DatePresetKey } from "~/stores/billing";
import { useBillingStore } from "~/stores/billing";

const emit = defineEmits<{
  (e: "apply-search"): void;
}>();

const billingStore = useBillingStore();

const presets: Array<{ key: DatePresetKey; label: string }> = [
  { key: "tm", label: "This Month" },
  { key: "lm", label: "Last Month" },
  { key: "tq", label: "This Quarter" },
  { key: "lq", label: "Last Quarter" },
  { key: "ty", label: "This Year" },
  { key: "ly", label: "Last Year" },
];

function handlePresetClick(key: DatePresetKey): void {
  billingStore.setPreset(key);
  emit("apply-search");
}

function handleCustomDateChange(): void {
  billingStore.activePreset = "custom";
}
</script>

<template>
  <div class="space-y-4">
    <!-- Server Query Form Card -->
    <UCard class="ring-1 ring-neutral-200 dark:ring-neutral-800 shadow-sm bg-neutral-50/50 dark:bg-neutral-900/50">
      <form class="space-y-4" @submit.prevent="emit('apply-search')">
        <!-- Date Presets & Custom Dates Row -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <!-- Preset Chips -->
          <div class="space-y-1.5">
            <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 block">
              Date Presets
            </span>
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                v-for="p in presets"
                :key="p.key"
                type="button"
                class="px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer"
                :class="billingStore.activePreset === p.key
                  ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'"
                @click="handlePresetClick(p.key)">
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- Date Inputs & Subaccounts -->
          <div class="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <!-- From Date -->
            <div class="space-y-1 w-full sm:w-auto">
              <label class="text-xs font-medium text-neutral-500 dark:text-neutral-400 block">From</label>
              <input
                v-model="billingStore.fromDate"
                type="date"
                class="w-full sm:w-36 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                @input="handleCustomDateChange">
            </div>

            <!-- To Date -->
            <div class="space-y-1 w-full sm:w-auto">
              <label class="text-xs font-medium text-neutral-500 dark:text-neutral-400 block">To</label>
              <input
                v-model="billingStore.toDate"
                type="date"
                class="w-full sm:w-36 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                @input="handleCustomDateChange">
            </div>

            <!-- Include Subaccounts Switch -->
            <div class="space-y-1 pt-1 sm:pt-4 w-full sm:w-auto flex items-center gap-2">
              <USwitch
                v-model="billingStore.includeSubaccounts"
                color="primary"
                size="sm" />
              <span class="text-xs text-neutral-700 dark:text-neutral-300 select-none cursor-pointer" @click="billingStore.includeSubaccounts = !billingStore.includeSubaccounts">
                Include Subaccounts
              </span>
            </div>

            <!-- Query Button -->
            <div class="space-y-1 pt-1 sm:pt-4 w-full sm:w-auto">
              <UButton
                type="submit"
                color="primary"
                variant="solid"
                size="sm"
                :loading="billingStore.isLoadingUsage"
                class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                <template #leading>
                  <UIcon name="i-lucide-search" class="size-3.5" />
                </template>
                Query Twilio
              </UButton>
            </div>
          </div>
        </div>
      </form>
    </UCard>

    <!-- In-Page Quick Filters & Search Bar (Visible once data is loaded) -->
    <div
      v-if="billingStore.enrichedRecords.length > 0"
      class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
        <!-- Search categories -->
        <div class="relative w-full sm:w-72">
          <UInput
            v-model="billingStore.searchQuery"
            placeholder="Search category, service, or desc..."
            icon="i-lucide-search"
            size="sm"
            class="w-full">
            <template v-if="billingStore.searchQuery" #trailing>
              <button
                type="button"
                class="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
                @click="billingStore.searchQuery = ''">
                <UIcon name="i-lucide-x" class="size-3.5" />
              </button>
            </template>
          </UInput>
        </div>

        <!-- Filter by Service Group -->
        <div class="w-full sm:w-56">
          <select
            v-model="billingStore.selectedGroup"
            class="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="all">All Service Groups ({{ billingStore.availableGroups.length }})</option>
            <option
              v-for="grp in billingStore.availableGroups"
              :key="grp"
              :value="grp">
              {{ grp }}
            </option>
          </select>
        </div>
      </div>

      <!-- Expand / Collapse All & Match Counts -->
      <div class="flex items-center justify-between sm:justify-end gap-3 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          Showing {{ billingStore.filteredGroups.reduce((acc, g) => acc + g.children.length, 0) }} of {{ billingStore.enrichedRecords.length }} categories
        </span>

        <div class="flex items-center gap-1.5">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            title="Expand all service groups"
            @click="billingStore.expandAllGroups">
            <template #leading>
              <UIcon name="i-lucide-chevrons-down-up" class="size-3.5" />
            </template>
            Expand All
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            title="Collapse all service groups"
            @click="billingStore.collapseAllGroups">
            <template #leading>
              <UIcon name="i-lucide-chevrons-up-down" class="size-3.5" />
            </template>
            Collapse All
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
