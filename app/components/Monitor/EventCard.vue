<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import { useClipboard } from "@vueuse/core";
import type { TwilioAuditEvent } from "~/types";

const props = defineProps<{
  event: TwilioAuditEvent;
  accountSid: string;
}>();

const { copy } = useClipboard();
const toast = useToast();

const isExpanded = ref(false);
const isJsonModalOpen = ref(false);

function handleCopy(text: string, label: string): void {
  copy(text);
  toast.add({
    title: "Copied",
    description: `Copied ${label} to clipboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

const formattedDate = computed(() => {
  if (!props.event.event_date) return "";
  try {
    return format(new Date(props.event.event_date), "PPp");
  } catch {
    return props.event.event_date;
  }
});

const relativeDate = computed(() => {
  if (!props.event.event_date) return "";
  try {
    return formatDistanceToNow(new Date(props.event.event_date), { addSuffix: true });
  } catch {
    return "";
  }
});
</script>

<template>
  <div
    class="rounded-2xl border transition-all duration-200 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs">
    <div class="p-5 space-y-3">
      <!-- Header Bar: Event Type, Source, Timestamp, and Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Left: Event Type Badge, Source Pill -->
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            color="primary"
            variant="subtle"
            size="sm"
            class="font-mono font-medium gap-1.5">
            <UIcon name="i-lucide-activity" class="size-3.5" />
            {{ event.event_type }}
          </UBadge>

          <span
            v-if="event.source"
            class="px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 capitalize">
            {{ event.source }}
          </span>

          <span
            v-if="event.actor_type"
            class="px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            Actor: {{ event.actor_type }}
          </span>
        </div>

        <!-- Right: Timestamp & Action Buttons -->
        <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span :title="formattedDate" class="hidden sm:inline">
            {{ relativeDate }}
          </span>

          <span class="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>

          <!-- View Raw JSON -->
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            title="Inspect raw Twilio API JSON"
            aria-label="Inspect raw Twilio API JSON"
            @click="isJsonModalOpen = true">
            <template #leading>
              <UIcon name="i-lucide-code" class="size-3.5" />
            </template>
          </UButton>

          <!-- Expand / Collapse Details -->
          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            @click="isExpanded = !isExpanded">
            <template #leading>
              <UIcon
                :name="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-3.5" />
            </template>
            {{ isExpanded ? 'Hide' : 'Details' }}
          </UButton>
        </div>
      </div>

      <!-- Description and Resource Info -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <p class="text-sm font-medium text-neutral-900 dark:text-white">
          {{ event.description || 'System event recorded' }}
        </p>

        <div v-if="event.resource_sid" class="flex items-center gap-1.5 font-mono text-neutral-500 dark:text-neutral-400">
          <span>Resource: {{ event.resource_sid }}</span>
          <button
            type="button"
            class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            title="Copy Resource SID"
            @click="handleCopy(event.resource_sid!, 'Resource SID')">
            <UIcon name="i-lucide-copy" class="size-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Expanded Section (Actor, IP, and Event Data) -->
    <div
      v-if="isExpanded"
      class="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-5 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Event SID</span>
          <div class="font-mono text-neutral-900 dark:text-white truncate">{{ event.sid }}</div>
        </div>

        <div v-if="event.actor_sid" class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Actor SID</span>
          <div class="font-mono text-neutral-900 dark:text-white truncate">{{ event.actor_sid }}</div>
        </div>

        <div v-if="event.source_ip_address" class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Source IP</span>
          <div class="font-mono text-neutral-900 dark:text-white">{{ event.source_ip_address }}</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Date</span>
          <div class="font-mono text-neutral-900 dark:text-white">{{ formattedDate }}</div>
        </div>
      </div>

      <!-- Event Data payload if present -->
      <div v-if="event.event_data" class="space-y-1 text-xs">
        <span class="font-medium text-neutral-700 dark:text-neutral-300">Event Data</span>
        <pre class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-[11px] overflow-auto max-h-48 whitespace-pre-wrap select-text text-neutral-800 dark:text-neutral-200">{{ JSON.stringify(event.event_data, null, 2) }}</pre>
      </div>
    </div>

    <!-- Raw JSON Inspector Modal -->
    <MonitorAlertJsonViewer
      v-model:open="isJsonModalOpen"
      :item="event"
      :title="`Audit Event: ${event.sid}`"
      :subtitle="event.event_type" />
  </div>
</template>
