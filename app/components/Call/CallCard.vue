<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import { useClipboard } from "@vueuse/core";
import type { AuthCredentials, EnrichedTwilioCall } from "~/types";
import { useCallsStore } from "~/stores/calls";

const props = defineProps<{
  call: EnrichedTwilioCall;
  accountSid: string;
  authCredentials: AuthCredentials;
}>();

const callsStore = useCallsStore();
const { copy } = useClipboard();
const toast = useToast();

const isExpanded = ref(false);
const isJsonModalOpen = ref(false);
const activeTab = ref<"details" | "recordings">("details");

function handleCopy(text: string, label: string): void {
  copy(text);
  toast.add({
    title: "Copied",
    description: `Copied ${label} to clipboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

const formattedStartTime = computed(() => {
  const d = props.call.start_time || props.call.date_created;
  if (!d) {
    return "";
  }
  try {
    return format(new Date(d), "PPp");
  } catch {
    return d;
  }
});

const formattedEndTime = computed(() => {
  if (!props.call.end_time) {
    return null;
  }
  try {
    return format(new Date(props.call.end_time), "PPp");
  } catch {
    return props.call.end_time;
  }
});

const relativeStartTime = computed(() => {
  const d = props.call.start_time || props.call.date_created;
  if (!d) {
    return "";
  }
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "";
  }
});

const isInbound = computed(() => {
  return props.call.direction.toLowerCase().includes("inbound");
});

const directionLabel = computed(() => {
  if (isInbound.value) {
    return "Inbound";
  }
  if (props.call.direction.toLowerCase().includes("dial")) {
    return "Outbound Dial";
  }
  return "Outbound";
});

const statusBadgeColor = computed(() => {
  const st = props.call.status.toLowerCase();
  if (st === "completed") {
    return "success" as const;
  }
  if (st === "in-progress" || st === "ringing" || st === "queued") {
    return "info" as const;
  }
  if (st === "no-answer" || st === "busy") {
    return "warning" as const;
  }
  if (st === "failed") {
    return "error" as const;
  }
  return "neutral" as const;
});

const statusIcon = computed(() => {
  const st = props.call.status.toLowerCase();
  if (st === "completed") {
    return "i-lucide-check-check";
  }
  if (st === "in-progress" || st === "ringing") {
    return "i-lucide-phone-forwarded";
  }
  if (st === "no-answer" || st === "busy") {
    return "i-lucide-phone-missed";
  }
  if (st === "failed") {
    return "i-lucide-alert-circle";
  }
  return "i-lucide-phone-off";
});

const formattedDuration = computed(() => {
  return callsStore.formatCallDuration(props.call.duration);
});

const formattedPrice = computed(() => {
  if (!props.call.price) {
    return null;
  }
  const unit = props.call.price_unit?.toUpperCase() || "USD";
  const absPrice = Math.abs(parseFloat(props.call.price)).toFixed(4);
  return `${unit} $${absPrice}`;
});

async function handleLoadRecordings(): Promise<void> {
  if (isExpanded.value && activeTab.value === "recordings") {
    isExpanded.value = false;
    return;
  }
  activeTab.value = "recordings";
  isExpanded.value = true;
  if (!props.call.recordings) {
    await callsStore.fetchRecordingsForCall(props.call.sid, props.authCredentials);
  }
}
</script>

<template>
  <div
    class="rounded-2xl border transition-all duration-200 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs">
    <!-- Top Summary Card Row -->
    <div class="p-5 space-y-4">
      <!-- Header Bar: Direction, Status, Timestamps, and Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Left: Direction Pill, Status, Caller Name -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Direction Badge -->
          <UBadge
            :color="isInbound ? 'success' : 'primary'"
            variant="subtle"
            size="sm"
            class="font-medium gap-1.5">
            <UIcon
              :name="isInbound ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'"
              class="size-3.5" />
            {{ directionLabel }}
          </UBadge>

          <!-- Call Status Badge -->
          <UBadge
            :color="statusBadgeColor"
            variant="subtle"
            size="sm"
            class="capitalize font-medium gap-1.5">
            <UIcon :name="statusIcon" class="size-3.5" />
            {{ call.status }}
          </UBadge>

          <!-- Caller Name if available -->
          <span
            v-if="call.caller_name"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            <UIcon name="i-lucide-user" class="size-3 text-neutral-400" />
            {{ call.caller_name }}
          </span>

          <!-- Answered By (e.g. human / machine) -->
          <span
            v-if="call.answered_by"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 capitalize">
            <UIcon name="i-lucide-bot" class="size-3 text-neutral-400" />
            {{ call.answered_by }}
          </span>
        </div>

        <!-- Right: Timestamp & Action Buttons -->
        <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span :title="formattedStartTime" class="hidden sm:inline">
            {{ relativeStartTime }}
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

      <!-- Phone Numbers: From ➔ To Routing -->
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <!-- From Number -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">From:</span>
          <span class="font-mono font-semibold text-neutral-900 dark:text-white">
            {{ call.from_formatted || call.from || 'Unknown' }}
          </span>
          <button
            v-if="call.from"
            type="button"
            class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            title="Copy From number"
            @click="handleCopy(call.from, 'From number')">
            <UIcon name="i-lucide-copy" class="size-3.5" />
          </button>
          <NuxtLink
            v-if="call.isFromOurNumber"
            :to="`/accounts/${accountSid}/phone-numbers?search=${encodeURIComponent(call.from)}`"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:underline">
            Our Number
          </NuxtLink>
        </div>

        <UIcon name="i-lucide-arrow-right" class="size-3.5 text-neutral-400 shrink-0" />

        <!-- To Number -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">To:</span>
          <span class="font-mono font-semibold text-neutral-900 dark:text-white">
            {{ call.to_formatted || call.to || 'Unknown' }}
          </span>
          <button
            v-if="call.to"
            type="button"
            class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            title="Copy To number"
            @click="handleCopy(call.to, 'To number')">
            <UIcon name="i-lucide-copy" class="size-3.5" />
          </button>
          <NuxtLink
            v-if="call.isToOurNumber"
            :to="`/accounts/${accountSid}/phone-numbers?search=${encodeURIComponent(call.to)}`"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:underline">
            Our Number
          </NuxtLink>
        </div>
      </div>

      <!-- Quick Metrics Strip: Duration, Price, and Recordings Link -->
      <div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-4">
          <!-- Duration -->
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-timer" class="size-4 text-blue-500" />
            <span class="text-neutral-500 dark:text-neutral-400">Duration:</span>
            <span class="font-semibold text-neutral-900 dark:text-white">{{ formattedDuration }}</span>
          </div>

          <!-- Price -->
          <div v-if="formattedPrice" class="flex items-center gap-1.5 font-mono">
            <UIcon name="i-lucide-coins" class="size-4 text-amber-500" />
            <span class="text-neutral-500 dark:text-neutral-400">Cost:</span>
            <span class="font-semibold text-neutral-900 dark:text-white">{{ formattedPrice }}</span>
          </div>

          <!-- Start time on mobile -->
          <div class="sm:hidden text-neutral-400 font-mono text-[11px]">
            {{ formattedStartTime }}
          </div>
        </div>

        <!-- Check / View Recordings Button -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/60 transition-colors border border-violet-200/60 dark:border-violet-800/60 cursor-pointer"
          title="Inspect Call Recordings"
          @click="handleLoadRecordings">
          <UIcon name="i-lucide-disc" class="size-3.5 text-violet-500" />
          <span>Recordings</span>
          <UIcon
            :name="isExpanded && activeTab === 'recordings' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="size-3 opacity-70 ml-0.5" />
        </button>
      </div>
    </div>

    <!-- Expanded Section (Details, Recordings) -->
    <div
      v-if="isExpanded"
      class="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-5 space-y-4">
      <!-- Tabs Switcher -->
      <div class="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          :class="activeTab === 'details'
            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'"
          @click="activeTab = 'details'">
          Call Details
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'recordings'
            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'"
          @click="handleLoadRecordings">
          <UIcon name="i-lucide-disc" class="size-3.5" />
          Recordings {{ call.recordings?.length ? `(${call.recordings.length})` : '' }}
        </button>
      </div>

      <!-- Tab: Technical Call Details -->
      <div v-if="activeTab === 'details'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Call SID</span>
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-neutral-900 dark:text-white truncate">{{ call.sid }}</span>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              @click="handleCopy(call.sid, 'Call SID')">
              <UIcon name="i-lucide-copy" class="size-3" />
            </button>
          </div>
        </div>

        <div v-if="call.parent_call_sid" class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Parent Call SID</span>
          <div class="flex items-center gap-1.5 font-mono text-neutral-900 dark:text-white">
            <span class="truncate">{{ call.parent_call_sid }}</span>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              @click="handleCopy(call.parent_call_sid!, 'Parent Call SID')">
              <UIcon name="i-lucide-copy" class="size-3" />
            </button>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Start Time</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ formattedStartTime || call.start_time }}</div>
        </div>

        <div v-if="formattedEndTime" class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">End Time</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ formattedEndTime }}</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Exact Duration</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ call.duration || '0' }} seconds</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Price</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ formattedPrice || '0.0000 USD' }}</div>
        </div>

        <div v-if="call.queue_time" class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Queue Time</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ call.queue_time }} ms</div>
        </div>

        <div v-if="call.phone_number_sid" class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Phone Number SID</span>
          <div class="text-neutral-900 dark:text-white font-mono truncate">{{ call.phone_number_sid }}</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">API Version</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ call.api_version || '2010-04-01' }}</div>
        </div>
      </div>

      <!-- Tab: Call Recordings -->
      <div v-else-if="activeTab === 'recordings'" class="space-y-3">
        <div v-if="call.isLoadingRecordings" class="py-8 text-center flex flex-col items-center justify-center gap-2">
          <UIcon name="i-lucide-refresh-cw" class="size-6 text-violet-500 animate-spin" />
          <span class="text-xs text-neutral-500 dark:text-neutral-400">Loading call recordings...</span>
        </div>

        <div v-else-if="call.recordings?.length" class="space-y-3">
          <div
            v-for="rec in call.recordings"
            :key="rec.sid"
            class="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div class="flex items-center gap-2">
                <UBadge color="neutral" variant="subtle" size="xs">
                  Recording {{ rec.sid }}
                </UBadge>
                <span class="text-neutral-500 dark:text-neutral-400 font-medium">
                  {{ callsStore.formatCallDuration(rec.duration) }} • {{ rec.channels === 2 ? 'Dual channel' : 'Mono' }}
                </span>
              </div>

              <!-- Download Button -->
              <a
                v-if="rec.audioBlobUrl"
                :href="rec.audioBlobUrl"
                :download="`${rec.sid}.mp3`"
                class="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                <UIcon name="i-lucide-download" class="size-3.5" />
                Download MP3
              </a>
            </div>

            <!-- Audio Player Element -->
            <div v-if="rec.audioBlobUrl" class="pt-1">
              <audio
                controls
                :src="rec.audioBlobUrl"
                class="w-full h-9 rounded-lg" />
            </div>

            <div v-else class="text-xs text-neutral-400 italic">
              Audio stream could not be loaded directly.
            </div>
          </div>
        </div>

        <div v-else class="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
          No voice recordings found for this call.
        </div>
      </div>
    </div>

    <!-- Raw Call JSON Viewer Modal -->
    <CallJsonViewer
      v-model:open="isJsonModalOpen"
      :call="call" />
  </div>
</template>
