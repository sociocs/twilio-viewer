<script setup lang="ts">
import { format } from "date-fns";
import type { EnrichedUsageRecord } from "~/types";
import { useBillingStore } from "~/stores/billing";

const emit = defineEmits<{
  (e: "retry"): void;
}>();

const billingStore = useBillingStore();

function getGroupIcon(groupName: string): string {
  const g = groupName.toLowerCase();
  if (g.includes("whatsapp")) return "i-simple-icons-whatsapp";
  if (g.includes("sms") || g.includes("mms") || g.includes("message")) return "i-lucide-message-square";
  if (g.includes("voice") || g.includes("call")) return "i-lucide-phone-call";
  if (g.includes("phone number") || g.includes("number")) return "i-lucide-hash";
  if (g.includes("lookup")) return "i-lucide-search";
  if (g.includes("trunking") || g.includes("sip")) return "i-lucide-network";
  if (g.includes("sync")) return "i-lucide-refresh-cw";
  if (g.includes("video")) return "i-lucide-video";
  if (g.includes("verify")) return "i-lucide-shield-check";
  if (g.includes("authy")) return "i-lucide-key-round";
  if (g.includes("monitor")) return "i-lucide-bell";
  if (g.includes("studio")) return "i-lucide-git-fork";
  if (g.includes("task router") || g.includes("taskrouter")) return "i-lucide-route";
  if (g.includes("internet of things") || g.includes("wireless")) return "i-lucide-cpu";
  if (g.includes("chat")) return "i-lucide-messages-square";
  if (g.includes("autopilot")) return "i-lucide-bot";
  if (g.includes("event")) return "i-lucide-activity";
  return "i-lucide-receipt";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "PP");
  } catch {
    return dateStr;
  }
}

function isSubItem(record: EnrichedUsageRecord): boolean {
  return record.level === 2 || Boolean(record.isBreakdownOfPresentParent);
}
</script>

<template>
  <div class="space-y-4">
    <!-- 1. Loading Skeleton -->
    <div v-if="billingStore.isLoadingUsage" class="space-y-4">
      <div v-for="i in 3" :key="i" class="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4 animate-pulse">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="size-8 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            <div class="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
          <div class="h-6 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <div class="space-y-2 pt-2">
          <div class="h-9 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
          <div class="h-9 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
        </div>
      </div>
    </div>

    <!-- 2. Error State -->
    <div
      v-else-if="billingStore.usageError"
      class="p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-center space-y-3">
      <div class="size-10 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
        <UIcon name="i-lucide-alert-triangle" class="size-5" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">
          Failed to Retrieve Usage Records
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
          {{ billingStore.usageError }}
        </p>
      </div>
      <UButton
        color="error"
        variant="subtle"
        size="sm"
        @click="emit('retry')">
        <template #leading>
          <UIcon name="i-lucide-refresh-cw" class="size-3.5" />
        </template>
        Retry Query
      </UButton>
    </div>

    <!-- 3. Empty State (No records at all for date range) -->
    <div
      v-else-if="!billingStore.enrichedRecords.length"
      class="p-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-center space-y-4">
      <div class="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto">
        <UIcon name="i-lucide-receipt" class="size-6" />
      </div>
      <div class="max-w-md mx-auto">
        <h3 class="text-base font-semibold text-neutral-900 dark:text-white">
          No Usage Records Found
        </h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          There are no billable activities or charges recorded for the period between
          <span class="font-medium text-neutral-700 dark:text-neutral-300">{{ billingStore.fromDate || "start" }}</span>
          and
          <span class="font-medium text-neutral-700 dark:text-neutral-300">{{ billingStore.toDate || "today" }}</span>.
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          @click="billingStore.setPreset('lm'); emit('retry')">
          Try Last Month
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          @click="billingStore.setPreset('ty'); emit('retry')">
          Try This Year
        </UButton>
      </div>
    </div>

    <!-- 4. Filtered Empty State (No records match current query/group filter) -->
    <div
      v-else-if="!billingStore.filteredGroups.length"
      class="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-center space-y-3">
      <div class="size-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
        <UIcon name="i-lucide-search-x" class="size-5" />
      </div>
      <p class="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        No matching usage categories for "{{ billingStore.searchQuery }}"
      </p>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        @click="billingStore.searchQuery = ''; billingStore.selectedGroup = 'all'">
        Reset Search Filters
      </UButton>
    </div>

    <!-- 5. Grouped Usage Tables List -->
    <div v-else class="space-y-4">
      <div
        v-for="grp in billingStore.filteredGroups"
        :key="grp.group"
        class="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
        <!-- Group Header Card -->
        <button
          type="button"
          class="w-full py-3.5 px-4 sm:px-5 flex items-center justify-between gap-4 bg-neutral-50/80 dark:bg-neutral-800/40 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/70 transition-colors text-left cursor-pointer border-b border-transparent"
          :class="{ 'border-neutral-200 dark:border-neutral-800': billingStore.expandedGroups[grp.group] !== false }"
          @click="billingStore.toggleGroup(grp.group)">
          <div class="flex items-center gap-3">
            <div class="size-8 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
              <UIcon :name="getGroupIcon(grp.group)" class="size-4" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-neutral-900 dark:text-white">
                  {{ grp.group }}
                </span>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ grp.children.length }}
                </UBadge>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-right">
              <span class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                {{ billingStore.formatPrice(grp.totalPrice, grp.currency) }}
              </span>
              <span
                v-if="grp.hasBreakdownItems"
                class="text-[10px] text-neutral-400 block font-medium"
                title="Subtotal excludes subcategory breakdowns to prevent duplicate counting">
                Net subtotal
              </span>
            </div>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-neutral-400 transition-transform duration-200"
              :class="{ 'rotate-180': billingStore.expandedGroups[grp.group] !== false }" />
          </div>
        </button>

        <!-- Group Items Table (Collapsible) -->
        <div v-show="billingStore.expandedGroups[grp.group] !== false" class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-neutral-50/40 dark:bg-neutral-800/20 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-100 dark:border-neutral-800 uppercase tracking-wider">
              <tr>
                <th scope="col" class="py-2.5 px-4 sm:px-6">Service / Category</th>
                <th scope="col" class="py-2.5 px-4 text-right">Count</th>
                <th scope="col" class="py-2.5 px-4 text-right">Chargeable Qty</th>
                <th scope="col" class="py-2.5 px-4 text-right">Cost</th>
                <th scope="col" class="py-2.5 px-4 text-center">As Of</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
              <tr
                v-for="item in grp.children"
                :key="item.category"
                class="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                <!-- Service Name & Desc -->
                <td class="py-2.5 px-4 sm:px-6">
                  <div class="flex items-start gap-2" :class="{ 'pl-5 sm:pl-7': item.level === 2 }">
                    <span v-if="item.level === 2" class="text-neutral-400 select-none font-mono text-xs mt-0.5">└</span>
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span
                          class="text-neutral-900 dark:text-white"
                          :class="item.level === 1 ? 'font-medium' : 'text-neutral-700 dark:text-neutral-300'">
                          {{ item.description }}
                        </span>
                        <span class="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                          ({{ item.category }})
                        </span>
                        <UBadge
                          v-if="item.isBreakdownOfPresentParent"
                          color="neutral"
                          variant="subtle"
                          size="xs"
                          class="text-[10px] py-0 px-1.5 font-normal"
                          :title="`Itemized breakdown of ${item.parentCategory}`">
                          Sub-breakdown
                        </UBadge>
                      </div>
                      <p
                        v-if="item.category_desc"
                        class="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xl">
                        {{ item.category_desc }}
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Count -->
                <td
                  class="py-2.5 px-4 text-right font-mono whitespace-nowrap"
                  :class="isSubItem(item)
                    ? 'text-neutral-500 dark:text-neutral-400 font-normal'
                    : 'text-neutral-800 dark:text-neutral-200 font-medium'">
                  {{ billingStore.formatCount(item) }}
                </td>

                <!-- Chargeable Quantity / Usage -->
                <td
                  class="py-2.5 px-4 text-right font-mono whitespace-nowrap"
                  :class="isSubItem(item)
                    ? 'text-neutral-500 dark:text-neutral-400 font-normal'
                    : 'text-neutral-800 dark:text-neutral-200 font-medium'">
                  {{ billingStore.formatUsage(item) }}
                </td>

                <!-- Price / Cost -->
                <td
                  class="py-2.5 px-4 text-right font-mono whitespace-nowrap"
                  :class="isSubItem(item)
                    ? 'text-neutral-500 dark:text-neutral-400 font-normal'
                    : 'font-semibold text-neutral-900 dark:text-white'">
                  <div>{{ billingStore.formatPrice(item.price, item.price_unit) }}</div>
                  <div
                    v-if="item.isBreakdownOfPresentParent"
                    class="text-[10px] text-neutral-400 dark:text-neutral-500 font-sans tracking-normal font-normal"
                    :title="`Cost is already included in ${item.parentCategory}`">
                    Included in parent
                  </div>
                </td>

                <!-- As Of -->
                <td class="py-2.5 px-4 text-center font-mono text-[11px] text-neutral-400 whitespace-nowrap" :title="item.as_of">
                  {{ formatDate(item.as_of || item.end_date) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 6. Grand Total Footer Card -->
      <UCard class="ring-1 ring-neutral-200 dark:ring-neutral-800 shadow-sm bg-neutral-900 text-white dark:bg-neutral-800">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold tracking-wide uppercase text-neutral-300">
                Grand Total Usage Cost
              </span>
              <UBadge color="info" variant="subtle" size="xs">
                Twilio Aggregated
              </UBadge>
            </div>
            <p class="text-xs text-neutral-400">
              Encompasses {{ billingStore.enrichedRecords.length }} active line item categories across {{ billingStore.groupedUsage.length }} service groups.
            </p>
          </div>

          <div class="text-left sm:text-right">
            <div class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
              {{ billingStore.formatPrice(billingStore.totalSpend, billingStore.currencyCode) }}
            </div>
            <span class="text-xs text-neutral-400">
              {{ billingStore.fromDate || "Start" }} &rarr; {{ billingStore.toDate || "Today" }}
            </span>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
