<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import { useClipboard } from "@vueuse/core";
import type { EnrichedIncomingPhoneNumber } from "~/types";

const props = defineProps<{
  phoneNumber: EnrichedIncomingPhoneNumber;
  accountSid: string;
}>();

const emit = defineEmits<{
  (e: "refresh", sid: string): void;
}>();

const { copy } = useClipboard();
const toast = useToast();

const isExpanded = ref(false);
const activeTab = ref<"webhooks" | "messaging_services" | "regulatory" | "json">("webhooks");
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

const formattedCreatedDate = computed(() => {
  if (!props.phoneNumber.date_created) {
    return "";
  }
  try {
    return format(new Date(props.phoneNumber.date_created), "PPp");
  } catch {
    return props.phoneNumber.date_created;
  }
});

const relativeCreatedDate = computed(() => {
  if (!props.phoneNumber.date_created) {
    return "";
  }
  try {
    return formatDistanceToNow(new Date(props.phoneNumber.date_created), { addSuffix: true });
  } catch {
    return "";
  }
});

// Helper for toll-free number check
const isTollfree = computed(() => {
  const cleaned = props.phoneNumber.phone_number.replace(/\D/g, "");
  return (
    cleaned.startsWith("1800")
    || cleaned.startsWith("1888")
    || cleaned.startsWith("1877")
    || cleaned.startsWith("1866")
    || cleaned.startsWith("1855")
    || cleaned.startsWith("1844")
    || cleaned.startsWith("1833")
  );
});

// Toll-free verification badge status
const tollfreeVerificationInfo = computed(() => {
  const v = props.phoneNumber.tollfreeVerification;
  if (!isTollfree.value) {
    return null;
  }
  if (!v) {
    return {
      label: "Toll-Free: Unverified",
      color: "warning" as const,
      icon: "i-lucide-alert-triangle",
      description: "No approved toll-free verification found for this number.",
    };
  }

  const st = v.status?.toUpperCase() || "";
  if (st === "APPROVED" || st === "TWILIO_APPROVED" || st === "VERIFIED") {
    return {
      label: "Toll-Free: Verified",
      color: "success" as const,
      icon: "i-lucide-check-circle-2",
      description: "Toll-free verification is approved.",
    };
  }
  if (st === "REJECTED" || st === "TWILIO_REJECTED") {
    return {
      label: "Toll-Free: Rejected",
      color: "error" as const,
      icon: "i-lucide-shield-alert",
      description: v.rejection_reason || "Toll-free verification was rejected.",
    };
  }
  if (st === "IN_REVIEW" || st === "PENDING_REVIEW" || st === "PENDING") {
    return {
      label: "Toll-Free: In Review",
      color: "warning" as const,
      icon: "i-lucide-timer",
      description: "Toll-free verification is pending review.",
    };
  }

  return {
    label: `Toll-Free: ${v.status}`,
    color: "neutral" as const,
    icon: "i-lucide-phone",
    description: `Status: ${v.status}`,
  };
});
</script>

<template>
  <UCard class="shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 transition-all hover:shadow-md">
    <!-- Header Block -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <!-- Number, Friendly Name, SID -->
        <div class="space-y-1.5 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-bold font-mono text-neutral-900 dark:text-white truncate">
              {{ props.phoneNumber.phone_number }}
            </h3>
            <span
              v-if="props.phoneNumber.friendly_name && props.phoneNumber.friendly_name !== props.phoneNumber.phone_number"
              class="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
              ({{ props.phoneNumber.friendly_name }})
            </span>
            <UBadge
              :color="isTollfree ? 'warning' : 'neutral'"
              variant="subtle"
              size="xs">
              {{ isTollfree ? "Toll-Free" : "Local" }}
            </UBadge>
            <UBadge
              v-if="props.phoneNumber.status"
              color="success"
              variant="subtle"
              size="xs"
              class="capitalize">
              {{ props.phoneNumber.status }}
            </UBadge>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span class="font-mono">{{ props.phoneNumber.sid }}</span>
            <button
              type="button"
              class="hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              title="Copy Phone Number SID"
              @click="handleCopy(props.phoneNumber.sid, 'Phone Number SID')">
              <UIcon name="i-lucide-copy" class="size-3.5" />
            </button>
            <span>&bull;</span>
            <span :title="formattedCreatedDate">Created {{ relativeCreatedDate }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 shrink-0">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-code-2"
            title="View Raw JSON"
            aria-label="View Raw JSON"
            @click="isJsonModalOpen = true" />

          <!-- View Messages for this number -->
          <UButton
            v-if="props.phoneNumber.capabilities?.sms || props.phoneNumber.capabilities?.mms"
            color="neutral"
            variant="ghost"
            size="xs"
            :to="`/accounts/${props.accountSid}/message-history?number=${encodeURIComponent(props.phoneNumber.phone_number)}`"
            title="View message history for this number"
            aria-label="View message history for this number">
            <template #leading>
              <UIcon name="i-lucide-message-square" class="size-3.5 text-indigo-500" />
            </template>
            <span class="hidden sm:inline">Messages</span>
          </UButton>

          <!-- View Voice Calls for this number -->
          <UButton
            v-if="props.phoneNumber.capabilities?.voice"
            color="neutral"
            variant="ghost"
            size="xs"
            :to="`/accounts/${props.accountSid}/voice-call-history?number=${encodeURIComponent(props.phoneNumber.phone_number)}`"
            title="View voice call history for this number"
            aria-label="View voice call history for this number">
            <template #leading>
              <UIcon name="i-lucide-phone-call" class="size-3.5 text-emerald-500" />
            </template>
            <span class="hidden sm:inline">Calls</span>
          </UButton>

          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="props.phoneNumber.isLoadingDetails"
            icon="i-lucide-refresh-cw"
            title="Refresh Number Details"
            aria-label="Refresh Number Details"
            @click="emit('refresh', props.phoneNumber.sid)" />

          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            @click="isExpanded = !isExpanded">
            <template #leading>
              <UIcon :name="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5" />
            </template>
            {{ isExpanded ? "Hide Details" : "View Details" }}
          </UButton>
        </div>
      </div>

      <!-- Capabilities & Interlinked Messaging Service Badges -->
      <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
        <!-- Capabilities -->
        <div class="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md">
          <span class="text-neutral-400 text-[11px] font-medium mr-0.5">Caps:</span>
          <span class="flex items-center gap-0.5 font-medium" :class="props.phoneNumber.capabilities?.sms ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 line-through'">
            SMS
          </span>
          <span>&bull;</span>
          <span class="flex items-center gap-0.5 font-medium" :class="props.phoneNumber.capabilities?.mms ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 line-through'">
            MMS
          </span>
          <span>&bull;</span>
          <span class="flex items-center gap-0.5 font-medium" :class="props.phoneNumber.capabilities?.voice ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 line-through'">
            Voice
          </span>
          <template v-if="props.phoneNumber.capabilities?.fax">
            <span>&bull;</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-medium">Fax</span>
          </template>
        </div>

        <!-- Toll-Free Verification Status Badge if applicable -->
        <div
          v-if="tollfreeVerificationInfo"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          :class="{
            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800': tollfreeVerificationInfo.color === 'success',
            'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800': tollfreeVerificationInfo.color === 'warning',
            'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800': tollfreeVerificationInfo.color === 'error',
            'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700': tollfreeVerificationInfo.color === 'neutral',
          }"
          :title="tollfreeVerificationInfo.description">
          <UIcon :name="tollfreeVerificationInfo.icon" class="size-3.5" />
          <span>{{ tollfreeVerificationInfo.label }}</span>
        </div>

        <!-- Interlinked Messaging Services Pill Links -->
        <template v-if="props.phoneNumber.linkedMessagingServices?.length">
          <NuxtLink
            v-for="service in props.phoneNumber.linkedMessagingServices"
            :key="service.sid"
            :to="`/accounts/${props.accountSid}/messaging-services?service=${service.sid}`"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
            title="Click to view this Messaging Service in Messaging Services tab">
            <UIcon name="i-lucide-message-square-code" class="size-3.5" />
            <span>Service: <strong>{{ service.friendly_name }}</strong></span>
            <UIcon name="i-lucide-arrow-right" class="size-3 ml-0.5 text-blue-400" />
          </NuxtLink>
        </template>
        <span
          v-else
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
          <UIcon name="i-lucide-circle-slash" class="size-3 text-neutral-400" />
          Standalone (No Messaging Service)
        </span>
      </div>
    </div>

    <!-- Expandable Detailed View -->
    <div v-if="isExpanded" class="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
      <!-- Tabs Selector -->
      <div class="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="activeTab === 'webhooks'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="activeTab = 'webhooks'">
          <UIcon name="i-lucide-webhook" class="size-3.5" />
          Webhooks & Routing
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="activeTab === 'messaging_services'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="activeTab = 'messaging_services'">
          <UIcon name="i-lucide-message-square-code" class="size-3.5" />
          Linked Messaging Services ({{ props.phoneNumber.linkedMessagingServices?.length ?? 0 }})
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="activeTab === 'regulatory'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="activeTab = 'regulatory'">
          <UIcon name="i-lucide-file-text" class="size-3.5" />
          Regulatory & Emergency
        </button>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          :class="activeTab === 'json'
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
          @click="activeTab = 'json'">
          <UIcon name="i-lucide-code-2" class="size-3.5" />
          Raw JSON
        </button>
      </div>

      <!-- Tab 1: Webhooks & Routing -->
      <div v-if="activeTab === 'webhooks'" class="space-y-4 pt-2 text-xs">
        <!-- Messaging Service Note if linked -->
        <div
          v-if="props.phoneNumber.linkedMessagingServices?.length"
          class="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-start gap-2.5">
          <UIcon name="i-lucide-info" class="size-4 text-blue-500 shrink-0 mt-0.5" />
          <div class="space-y-1">
            <span class="font-semibold text-neutral-900 dark:text-white">
              Messaging Service Associated
            </span>
            <p class="text-neutral-600 dark:text-neutral-300">
              This number is in the sender pool for
              <NuxtLink
                v-if="props.phoneNumber.linkedMessagingServices?.[0]"
                :to="`/accounts/${props.accountSid}/messaging-services?service=${props.phoneNumber.linkedMessagingServices[0].sid}`"
                class="font-semibold text-blue-600 dark:text-blue-400 underline hover:no-underline">
                {{ props.phoneNumber.linkedMessagingServices[0].friendly_name }}
              </NuxtLink>.
              Inbound SMS messages will route to the Messaging Service unless the service has <code>use_inbound_webhook_on_number</code> enabled.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- SMS Webhook Configuration -->
          <div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <h4 class="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <UIcon name="i-lucide-message-square" class="size-3.5 text-emerald-500" />
              SMS Configuration
            </h4>

            <div>
              <span class="text-neutral-400 block mb-0.5 font-medium">SMS Request URL:</span>
              <span v-if="props.phoneNumber.sms_url" class="font-mono text-neutral-900 dark:text-white break-all">
                {{ props.phoneNumber.sms_url }} ({{ props.phoneNumber.sms_method || "POST" }})
              </span>
              <span v-else class="text-neutral-400 italic">Not configured</span>
            </div>

            <div>
              <span class="text-neutral-400 block mb-0.5 font-medium">SMS Fallback URL:</span>
              <span v-if="props.phoneNumber.sms_fallback_url" class="font-mono text-neutral-900 dark:text-white break-all">
                {{ props.phoneNumber.sms_fallback_url }} ({{ props.phoneNumber.sms_fallback_method || "POST" }})
              </span>
              <span v-else class="text-neutral-400 italic">Not configured</span>
            </div>

            <div v-if="props.phoneNumber.sms_application_sid">
              <span class="text-neutral-400 block mb-0.5 font-medium">SMS Application SID:</span>
              <span class="font-mono text-neutral-900 dark:text-white">{{ props.phoneNumber.sms_application_sid }}</span>
            </div>
          </div>

          <!-- Voice Webhook Configuration -->
          <div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <h4 class="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <UIcon name="i-lucide-phone-call" class="size-3.5 text-blue-500" />
              Voice Configuration
            </h4>

            <div>
              <span class="text-neutral-400 block mb-0.5 font-medium">Voice Request URL:</span>
              <span v-if="props.phoneNumber.voice_url" class="font-mono text-neutral-900 dark:text-white break-all">
                {{ props.phoneNumber.voice_url }} ({{ props.phoneNumber.voice_method || "POST" }})
              </span>
              <span v-else class="text-neutral-400 italic">Not configured</span>
            </div>

            <div>
              <span class="text-neutral-400 block mb-0.5 font-medium">Voice Fallback URL:</span>
              <span v-if="props.phoneNumber.voice_fallback_url" class="font-mono text-neutral-900 dark:text-white break-all">
                {{ props.phoneNumber.voice_fallback_url }} ({{ props.phoneNumber.voice_fallback_method || "POST" }})
              </span>
              <span v-else class="text-neutral-400 italic">Not configured</span>
            </div>

            <div>
              <span class="text-neutral-400 block mb-0.5 font-medium">Status Callback URL:</span>
              <span v-if="props.phoneNumber.status_callback" class="font-mono text-neutral-900 dark:text-white break-all">
                {{ props.phoneNumber.status_callback }} ({{ props.phoneNumber.status_callback_method || "POST" }})
              </span>
              <span v-else class="text-neutral-400 italic">Not configured</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Linked Messaging Services -->
      <div v-if="activeTab === 'messaging_services'" class="space-y-3 pt-2 text-xs">
        <div v-if="props.phoneNumber.linkedMessagingServices?.length" class="space-y-3">
          <div
            v-for="service in props.phoneNumber.linkedMessagingServices"
            :key="service.sid"
            class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-message-square-code" class="size-4 text-blue-500" />
                <h4 class="font-bold text-neutral-900 dark:text-white text-sm">
                  {{ service.friendly_name }}
                </h4>
                <UBadge
                  v-if="service.usecase"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  class="capitalize">
                  {{ service.usecase }}
                </UBadge>
              </div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                SID: {{ service.sid }}
              </div>
            </div>

            <!-- Interlink to Messaging Services Page -->
            <UButton
              :to="`/accounts/${props.accountSid}/messaging-services?service=${service.sid}`"
              color="primary"
              variant="outline"
              size="xs">
              <template #leading>
                <UIcon name="i-lucide-external-link" class="size-3.5" />
              </template>
              View Service Details
            </UButton>
          </div>
        </div>

        <div v-else class="p-6 text-center rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <UIcon name="i-lucide-message-square-off" class="size-6 text-neutral-400 mx-auto" />
          <h4 class="font-semibold text-neutral-900 dark:text-white">
            Not in any Sender Pool
          </h4>
          <p class="text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto text-xs">
            This phone number is standalone and operates strictly with its individual webhooks. It is not currently linked to any Messaging Service.
          </p>
          <div class="pt-1">
            <UButton
              :to="`/accounts/${props.accountSid}/messaging-services`"
              color="neutral"
              variant="outline"
              size="xs">
              <template #leading>
                <UIcon name="i-lucide-message-square-code" class="size-3.5" />
              </template>
              Browse Messaging Services
            </UButton>
          </div>
        </div>
      </div>

      <!-- Tab 3: Regulatory & Emergency -->
      <div v-if="activeTab === 'regulatory'" class="space-y-3 pt-2 text-xs">
        <div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <span class="text-neutral-400 block mb-0.5">Emergency Status:</span>
            <span class="font-medium text-neutral-900 dark:text-white">{{ props.phoneNumber.emergency_status || "None" }}</span>
          </div>

          <div>
            <span class="text-neutral-400 block mb-0.5">Emergency Address SID:</span>
            <span class="font-mono text-neutral-900 dark:text-white truncate">{{ props.phoneNumber.emergency_address_sid || "None" }}</span>
          </div>

          <div>
            <span class="text-neutral-400 block mb-0.5">Address Requirements:</span>
            <span class="font-medium text-neutral-900 dark:text-white capitalize">{{ props.phoneNumber.address_requirements || "None" }}</span>
          </div>

          <div>
            <span class="text-neutral-400 block mb-0.5">Origin:</span>
            <span class="font-medium text-neutral-900 dark:text-white uppercase">{{ props.phoneNumber.origin || "Twilio" }}</span>
          </div>

          <div>
            <span class="text-neutral-400 block mb-0.5">Trunk SID:</span>
            <span class="font-mono text-neutral-900 dark:text-white">{{ props.phoneNumber.trunk_sid || "None" }}</span>
          </div>

          <div>
            <span class="text-neutral-400 block mb-0.5">Bundle SID:</span>
            <span class="font-mono text-neutral-900 dark:text-white">{{ props.phoneNumber.bundle_sid || "None" }}</span>
          </div>
        </div>
      </div>

      <!-- Tab 4: Raw JSON -->
      <div v-if="activeTab === 'json'" class="pt-2">
        <PhoneNumberJsonViewer :phone-number="props.phoneNumber" />
      </div>
    </div>

    <!-- Raw API JSON Modal -->
    <UModal
      v-model:open="isJsonModalOpen"
      title="Raw Phone Number API JSON"
      :description="`${props.phoneNumber.phone_number} (${props.phoneNumber.sid})`"
      :ui="{ content: 'sm:max-w-4xl' }">
      <template #body>
        <div class="py-1">
          <PhoneNumberJsonViewer :phone-number="props.phoneNumber" />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
