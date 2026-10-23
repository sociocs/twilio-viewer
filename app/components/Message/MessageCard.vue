<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import { useClipboard } from "@vueuse/core";
import type { AuthCredentials, EnrichedTwilioMessage } from "~/types";
import { useMessagesStore } from "~/stores/messages";

const props = defineProps<{
  message: EnrichedTwilioMessage;
  accountSid: string;
  authCredentials: AuthCredentials;
}>();

const messagesStore = useMessagesStore();
const { copy } = useClipboard();
const toast = useToast();

const isExpanded = ref(false);
const isJsonModalOpen = ref(false);
const activeTab = ref<"details" | "media">("details");

function handleCopy(text: string, label: string): void {
  copy(text);
  toast.add({
    title: "Copied",
    description: `Copied ${label} to clipboard.`,
    color: "success",
    icon: "i-lucide-check",
  });
}

const formattedDateSent = computed(() => {
  const d = props.message.date_sent || props.message.date_created;
  if (!d) {
    return "";
  }
  try {
    return format(new Date(d), "PPp");
  } catch {
    return d;
  }
});

const relativeDateSent = computed(() => {
  const d = props.message.date_sent || props.message.date_created;
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
  return props.message.direction.toLowerCase().includes("inbound");
});

const directionLabel = computed(() => {
  if (isInbound.value) {
    return "Inbound";
  }
  if (props.message.direction.toLowerCase().includes("reply")) {
    return "Outbound Reply";
  }
  return "Outbound";
});

const statusBadgeColor = computed(() => {
  const st = props.message.status.toLowerCase();
  if (st === "delivered" || st === "received") {
    return "success" as const;
  }
  if (st === "sent" || st === "sending") {
    return "info" as const;
  }
  if (st === "failed" || st === "undelivered" || Boolean(props.message.error_code)) {
    return "error" as const;
  }
  return "neutral" as const;
});

const statusIcon = computed(() => {
  const st = props.message.status.toLowerCase();
  if (st === "delivered") {
    return "i-lucide-check-check";
  }
  if (st === "received") {
    return "i-lucide-check";
  }
  if (st === "sent") {
    return "i-lucide-send";
  }
  if (st === "failed" || st === "undelivered") {
    return "i-lucide-alert-circle";
  }
  return "i-lucide-clock";
});

const numMedia = computed(() => {
  const n = parseInt(String(props.message.num_media || "0"), 10);
  return isNaN(n) ? 0 : n;
});

const formattedPrice = computed(() => {
  if (!props.message.price) {
    return null;
  }
  const unit = props.message.price_unit?.toUpperCase() || "USD";
  const absPrice = Math.abs(parseFloat(props.message.price)).toFixed(4);
  return `${unit} $${absPrice}`;
});

async function handleLoadMedia(): Promise<void> {
  if (isExpanded.value && activeTab.value === "media") {
    isExpanded.value = false;
    return;
  }
  activeTab.value = "media";
  isExpanded.value = true;
  if (!props.message.mediaList) {
    await messagesStore.fetchMediaForMessage(props.message.sid, props.authCredentials);
  }
}
</script>

<template>
  <div
    class="rounded-2xl border transition-all duration-200 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs">
    <!-- Top Summary Card Row -->
    <div class="p-5 space-y-4">
      <!-- Header Bar: Direction, Status, Timestamp, and Quick Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Left: Direction Pill, Status, and Error Code -->
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

          <!-- Delivery Status Badge -->
          <UBadge
            :color="statusBadgeColor"
            variant="subtle"
            size="sm"
            class="capitalize font-medium gap-1.5">
            <UIcon :name="statusIcon" class="size-3.5" />
            {{ message.status }}
          </UBadge>

          <!-- Twilio Error Code Badge (if present) -->
          <a
            v-if="message.error_code"
            :href="`https://www.twilio.com/docs/errors/${message.error_code}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-400 dark:hover:bg-red-900/60 transition-colors">
            <UIcon name="i-lucide-alert-triangle" class="size-3" />
            Error {{ message.error_code }}
            <UIcon name="i-lucide-external-link" class="size-2.5 opacity-70" />
          </a>
        </div>

        <!-- Right: Timestamp & Action Buttons -->
        <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span :title="formattedDateSent" class="hidden sm:inline">
            {{ relativeDateSent }}
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

      <!-- Phone Numbers: From ➔ To Flow -->
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <!-- From Number -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">From:</span>
          <span class="font-mono font-semibold text-neutral-900 dark:text-white">
            {{ message.from || 'Unknown' }}
          </span>
          <button
            v-if="message.from"
            type="button"
            class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            title="Copy From number"
            @click="handleCopy(message.from, 'From number')">
            <UIcon name="i-lucide-copy" class="size-3.5" />
          </button>
          <NuxtLink
            v-if="message.isFromOurNumber"
            :to="`/accounts/${accountSid}/phone-numbers?search=${encodeURIComponent(message.from)}`"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:underline">
            Our Number
          </NuxtLink>
        </div>

        <UIcon name="i-lucide-arrow-right" class="size-3.5 text-neutral-400 shrink-0" />

        <!-- To Number -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">To:</span>
          <span class="font-mono font-semibold text-neutral-900 dark:text-white">
            {{ message.to || 'Unknown' }}
          </span>
          <button
            v-if="message.to"
            type="button"
            class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            title="Copy To number"
            @click="handleCopy(message.to, 'To number')">
            <UIcon name="i-lucide-copy" class="size-3.5" />
          </button>
          <NuxtLink
            v-if="message.isToOurNumber"
            :to="`/accounts/${accountSid}/phone-numbers?search=${encodeURIComponent(message.to)}`"
            class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:underline">
            Our Number
          </NuxtLink>
        </div>

        <!-- Linked Messaging Service Interlink Badge -->
        <NuxtLink
          v-if="message.messaging_service_sid"
          :to="`/accounts/${accountSid}/messaging-services?service=${message.messaging_service_sid}`"
          class="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors">
          <UIcon name="i-lucide-message-square-code" class="size-3.5 text-blue-500" />
          <span>Service: <strong>{{ message.friendlyServiceName || message.messaging_service_sid }}</strong></span>
          <UIcon name="i-lucide-arrow-right" class="size-3 text-blue-400" />
        </NuxtLink>
      </div>

      <!-- Message Body Box -->
      <div class="relative group/body p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800/80">
        <!-- When Message Body is Available -->
        <template v-if="message.body">
          <div class="flex items-start justify-between gap-4">
            <p class="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words leading-relaxed select-text flex-1">
              {{ message.body }}
            </p>

            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 opacity-60 group-hover/body:opacity-100 transition-opacity p-1 cursor-pointer shrink-0"
              title="Copy message body"
              @click="handleCopy(message.body, 'message text')">
              <UIcon name="i-lucide-copy" class="size-4" />
            </button>
          </div>

          <!-- Below text: Show MMS Attachment button if media is present -->
          <div v-if="numMedia > 0" class="mt-3">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 transition-colors border border-purple-200/60 dark:border-purple-800/60 cursor-pointer"
              title="View MMS attachments"
              @click="handleLoadMedia">
              <UIcon name="i-lucide-paperclip" class="size-3.5 text-purple-500" />
              <span>{{ numMedia }} MMS Attachment{{ numMedia === 1 ? '' : 's' }}</span>
              <UIcon
                :name="isExpanded && activeTab === 'media' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-3 opacity-70 ml-0.5" />
            </button>
          </div>
        </template>

        <!-- When Message Body is NOT Available -->
        <template v-else>
          <!-- In place of text: Show MMS Attachment button if media is present -->
          <div v-if="numMedia > 0" class="py-0.5">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 transition-colors border border-purple-200/60 dark:border-purple-800/60 cursor-pointer shadow-2xs"
              title="View MMS attachments"
              @click="handleLoadMedia">
              <UIcon name="i-lucide-paperclip" class="size-3.5 text-purple-500" />
              <span>{{ numMedia }} MMS Attachment{{ numMedia === 1 ? '' : 's' }}</span>
              <UIcon
                :name="isExpanded && activeTab === 'media' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-3 opacity-70 ml-0.5" />
            </button>
          </div>

          <!-- Fallback if neither text nor media -->
          <p v-else class="text-xs italic text-neutral-400 dark:text-neutral-500">
            (Empty message body)
          </p>
        </template>

        <!-- Meta pills below body: Segments & Price -->
        <div class="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 text-xs text-neutral-500 dark:text-neutral-400">
          <span class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-layers" class="size-3.5 text-neutral-400" />
            {{ message.num_segments }} segment{{ message.num_segments === 1 || message.num_segments === '1' ? '' : 's' }}
          </span>

          <span v-if="formattedPrice" class="inline-flex items-center gap-1 font-mono">
            <UIcon name="i-lucide-coins" class="size-3.5 text-amber-500" />
            {{ formattedPrice }}
          </span>

          <span class="sm:hidden font-mono text-[11px] text-neutral-400">
            {{ formattedDateSent }}
          </span>
        </div>
      </div>

      <!-- Error message banner if delivery failed -->
      <div
        v-if="message.error_message"
        class="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
        <UIcon name="i-lucide-shield-alert" class="size-4 text-red-500 shrink-0 mt-0.5" />
        <div class="space-y-0.5">
          <span class="font-semibold">Twilio Delivery Error:</span>
          <p>{{ message.error_message }}</p>
        </div>
      </div>
    </div>

    <!-- Expanded Section (Details, Media, Raw Info) -->
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
          Message Details
        </button>

        <button
          v-if="numMedia > 0"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'media'
            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'"
          @click="handleLoadMedia">
          <UIcon name="i-lucide-image" class="size-3.5" />
          MMS Attachments ({{ numMedia }})
        </button>
      </div>

      <!-- Tab: Technical Details -->
      <div v-if="activeTab === 'details'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Message SID</span>
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-neutral-900 dark:text-white truncate">{{ message.sid }}</span>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              @click="handleCopy(message.sid, 'Message SID')">
              <UIcon name="i-lucide-copy" class="size-3" />
            </button>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Date Sent</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ message.date_sent || message.date_created }}</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Date Updated</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ message.date_updated }}</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">API Version</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ message.api_version || '2010-04-01' }}</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Price & Unit</span>
          <div class="text-neutral-900 dark:text-white font-mono">{{ formattedPrice || 'None reported' }}</div>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span class="text-neutral-500 dark:text-neutral-400 font-medium">Messaging Service SID</span>
          <div v-if="message.messaging_service_sid" class="flex items-center gap-1.5 font-mono text-neutral-900 dark:text-white">
            <NuxtLink
              :to="`/accounts/${accountSid}/messaging-services?service=${message.messaging_service_sid}`"
              class="text-blue-600 dark:text-blue-400 hover:underline truncate">
              {{ message.messaging_service_sid }}
            </NuxtLink>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              @click="handleCopy(message.messaging_service_sid, 'Service SID')">
              <UIcon name="i-lucide-copy" class="size-3" />
            </button>
          </div>
          <div v-else class="text-neutral-400 italic">None (Sent directly from number)</div>
        </div>
      </div>

      <!-- Tab: MMS Media Attachments -->
      <div v-else-if="activeTab === 'media'" class="space-y-3">
        <div v-if="message.isLoadingMedia" class="py-8 text-center flex flex-col items-center justify-center gap-2">
          <UIcon name="i-lucide-refresh-cw" class="size-6 text-purple-500 animate-spin" />
          <span class="text-xs text-neutral-500 dark:text-neutral-400">Loading MMS media attachments...</span>
        </div>

        <div v-else-if="message.mediaList?.length" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div
            v-for="item in message.mediaList"
            :key="item.sid"
            class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <!-- Media Preview if image -->
            <div
              v-if="item.content_type?.startsWith('image/') && item.blobUrl"
              class="rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 max-h-48 flex items-center justify-center">
              <img
                :src="item.blobUrl"
                :alt="item.sid"
                class="w-full h-full object-contain max-h-48">
            </div>

            <!-- Media Info -->
            <div class="space-y-1 text-xs">
              <div class="flex items-center justify-between">
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ item.content_type }}
                </UBadge>
                <span class="font-mono text-[10px] text-neutral-400 truncate max-w-[120px]">{{ item.sid }}</span>
              </div>

              <!-- Download / Open Button -->
              <div class="pt-1">
                <a
                  v-if="item.blobUrl"
                  :href="item.blobUrl"
                  :download="`${item.sid}`"
                  class="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  <UIcon name="i-lucide-download" class="size-3.5" />
                  Download File
                </a>
                <a
                  v-else-if="item.link"
                  :href="item.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  <UIcon name="i-lucide-external-link" class="size-3.5" />
                  Open Twilio Link
                </a>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
          No media attachments could be retrieved for this message.
        </div>
      </div>
    </div>

    <!-- Raw Message JSON Viewer Modal -->
    <MessageJsonViewer
      v-model:open="isJsonModalOpen"
      :message="message" />
  </div>
</template>
